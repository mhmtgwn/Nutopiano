import { Injectable } from '@nestjs/common';
import { PaymentMethod, PaymentProvider, Prisma } from '@prisma/client';
import crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { OutboxService } from '../outbox/outbox.service';
import { OUTBOX_EVENT_TYPES } from '../outbox/outbox.constants';
import { IyzicoProvider } from './providers/iyzico.provider';
import { PaymentsPort, RecordPaymentInput, RecordRefundInput } from '../../core/commerce';

@Injectable()
export class PaymentsService extends PaymentsPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly iyzico: IyzicoProvider,
    private readonly outboxService: OutboxService,
  ) {
    super();
  }

  private normalizeProvider(provider?: string | null): PaymentProvider | null {
    const normalized = String(provider ?? '')
      .trim()
      .toUpperCase();
    return normalized === 'IYZICO' ? PaymentProvider.IYZICO : null;
  }

  private buildBuyerPayload(params: {
    user: {
      id: number | null;
      name?: string | null;
      phone?: string | null;
      email?: string | null;
    } | null;
    fallbackBuyerId: string;
  }) {
    const fullName = (params.user?.name ?? 'Customer').trim() || 'Customer';
    const [firstName, ...rest] = fullName.split(/\s+/);
    return {
      id: params.user?.id ? String(params.user.id) : params.fallbackBuyerId,
      name: firstName || 'Customer',
      surname: rest.join(' ') || '.',
      identityNumber: (
        process.env.IYZICO_DEFAULT_IDENTITY_NUMBER ?? '11111111111'
      ).trim(),
      email: (
        params.user?.email ??
        process.env.IYZICO_DEFAULT_EMAIL ??
        'customer@example.com'
      ).trim(),
      gsmNumber: (
        params.user?.phone ??
        process.env.IYZICO_DEFAULT_GSM ??
        '+905350000000'
      ).trim(),
      registrationAddress: (
        process.env.IYZICO_DEFAULT_ADDRESS ?? 'N/A'
      ).trim(),
      city: (process.env.IYZICO_DEFAULT_CITY ?? 'Istanbul').trim(),
      country: (process.env.IYZICO_DEFAULT_COUNTRY ?? 'Turkey').trim(),
      zipCode: (process.env.IYZICO_DEFAULT_ZIP ?? '00000').trim(),
      ip: (process.env.IYZICO_DEFAULT_IP ?? '127.0.0.1').trim(),
    };
  }

  private buildAddressPayload(name?: string | null) {
    return {
      contactName: (name ?? 'Customer').trim() || 'Customer',
      address: (process.env.IYZICO_DEFAULT_ADDRESS ?? 'N/A').trim(),
      city: (process.env.IYZICO_DEFAULT_CITY ?? 'Istanbul').trim(),
      country: (process.env.IYZICO_DEFAULT_COUNTRY ?? 'Turkey').trim(),
      zipCode: (process.env.IYZICO_DEFAULT_ZIP ?? '00000').trim(),
    };
  }

  private async enqueuePaymentEvent(params: {
    businessId: number;
    aggregateType: string;
    aggregateId: string | number;
    eventType: string;
    idempotencyKey?: string | null;
    payloadJson?: Prisma.InputJsonValue;
  }) {
    await this.outboxService.enqueueEvent({
      businessId: params.businessId,
      aggregateType: params.aggregateType,
      aggregateId: params.aggregateId,
      eventType: params.eventType,
      idempotencyKey: params.idempotencyKey ?? null,
      payloadJson: params.payloadJson ?? {},
    });
  }

  async initializeIyzicoSession(params: {
    businessId: number;
    orderId: number;
    userId?: number | null;
    callbackUrl?: string | null;
    requestedConversationId?: string | null;
  }) {
    const businessId = Number(params.businessId);
    const orderId = Number(params.orderId);

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, businessId, deletedAt: null },
      select: {
        id: true,
        customerId: true,
        totalAmountCents: true,
        storeId: true,
      },
    });
    if (!order) {
      throw new Error('Order not found');
    }

    const userId =
      typeof params.userId === 'number' && params.userId > 0
        ? params.userId
        : null;
    const user = userId
      ? await this.prisma.user.findFirst({
          where: { id: userId, businessId },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        })
      : null;

    const orderItems = await this.prisma.orderItem.findMany({
      where: { businessId, orderId: order.id },
      select: {
        productId: true,
        quantity: true,
        totalAmountCents: true,
        product: { select: { name: true } },
      },
      orderBy: { id: 'asc' },
    });
    if (!orderItems.length) {
      throw new Error('Order has no items');
    }

    const callbackUrl =
      params.callbackUrl?.trim() ||
      (process.env.IYZICO_CALLBACK_URL ?? '').trim() ||
      `${(
        process.env.NEXT_PUBLIC_SITE_URL ??
        process.env.SITE_URL ??
        'http://localhost:3002'
      ).replace(/\/$/, '')}/checkout/iyzico-callback`;
    const conversationId =
      params.requestedConversationId?.trim() || crypto.randomUUID();
    const price = Number((order.totalAmountCents / 100).toFixed(2));

    const init = await this.iyzico.initSession({
      conversationId,
      callbackUrl,
      currency: (process.env.IYZICO_CURRENCY ?? 'TRY').trim(),
      price,
      buyer: this.buildBuyerPayload({
        user,
        fallbackBuyerId: String(userId ?? order.customerId),
      }),
      shippingAddress: this.buildAddressPayload(user?.name),
      billingAddress: this.buildAddressPayload(user?.name),
      basketItems: orderItems.map((item) => ({
        id: String(item.productId),
        price: Number((item.totalAmountCents / 100).toFixed(2)),
        name: item.product?.name ?? `Product ${item.productId}`,
        category1: 'General',
        category2: 'General',
        itemType: 'PHYSICAL',
      })),
    });

    try {
      await (this.prisma as any).paymentSession.create({
        data: {
          businessId,
          provider: PaymentProvider.IYZICO,
          token: init.token,
          orderId: order.id,
          amountCents: order.totalAmountCents,
          status: 'INITIATED',
          conversationId: init.conversationId ?? conversationId,
        },
        select: { id: true },
      });
    } catch {
      await (this.prisma as any).paymentSession.updateMany({
        where: {
          businessId,
          provider: PaymentProvider.IYZICO,
          token: init.token,
        },
        data: {
          orderId: order.id,
          amountCents: order.totalAmountCents,
          status: 'INITIATED',
          conversationId: init.conversationId ?? conversationId,
        },
      });
    }

    await this.enqueuePaymentEvent({
      businessId,
      aggregateType: 'PAYMENT_SESSION',
      aggregateId: init.token,
      eventType: OUTBOX_EVENT_TYPES.PAYMENT_SESSION_CREATED,
      idempotencyKey: `payment-session:${init.token}`,
      payloadJson: {
        provider: PaymentProvider.IYZICO,
        orderId: order.id,
        token: init.token,
        conversationId: init.conversationId ?? conversationId,
        amountCents: order.totalAmountCents,
        storeId: order.storeId ?? null,
      },
    });

    return {
      provider: PaymentProvider.IYZICO,
      token: init.token,
      conversationId: init.conversationId ?? conversationId,
      response: init.raw,
    };
  }

  async retrieveIyzicoSession(params: {
    businessId: number;
    token: string;
    conversationId?: string | null;
  }) {
    const businessId = Number(params.businessId);
    const token = String(params.token ?? '').trim();
    if (!token) {
      throw new Error('token is required');
    }

    const session = await (this.prisma as any).paymentSession.findFirst({
      where: {
        businessId,
        provider: PaymentProvider.IYZICO,
        token,
      },
      select: {
        id: true,
        orderId: true,
        amountCents: true,
        status: true,
        conversationId: true,
      },
    });
    if (!session) {
      throw new Error('Payment session not found for token');
    }

    const retrieval = await this.iyzico.retrieveSession({
      token,
      conversationId:
        params.conversationId?.trim() ||
        session.conversationId ||
        crypto.randomUUID(),
    });

    if (retrieval.status === 'SUCCESS' && retrieval.paymentId) {
      const amountCents =
        typeof retrieval.paidAmount === 'number' &&
        Number.isFinite(retrieval.paidAmount)
          ? Math.round(Number(retrieval.paidAmount) * 100)
          : Number(session.amountCents);

      const existing = await this.prisma.payment.findFirst({
        where: {
          businessId,
          reference: retrieval.paymentId,
        },
        select: { id: true },
      });

      if (!existing) {
        const order = await this.prisma.order.findFirst({
          where: {
            id: Number(session.orderId),
            businessId,
            deletedAt: null,
          },
          select: {
            id: true,
            sellerId: true,
            storeId: true,
          },
        });
        if (!order) {
          throw new Error('Order not found for payment session');
        }

        await this.recordPayment({
          businessId,
          orderId: order.id,
          storeId: order.storeId ?? null,
          sellerId: order.sellerId ?? null,
          createdByUserId: null,
          amountCents,
          method: PaymentMethod.CARD,
          reference: retrieval.paymentId,
          provider: PaymentProvider.IYZICO,
          idempotencyKey: `provider-payment:${retrieval.paymentId}`,
        });
      }

      await (this.prisma as any).paymentSession.updateMany({
        where: { id: session.id },
        data: {
          status: 'COMPLETED',
          paymentId: retrieval.paymentId,
        },
      });
    } else if (retrieval.status === 'FAILURE') {
      await (this.prisma as any).paymentSession.updateMany({
        where: { id: session.id },
        data: { status: 'FAILED' },
      });
      await this.enqueuePaymentEvent({
        businessId,
        aggregateType: 'PAYMENT_SESSION',
        aggregateId: token,
        eventType: OUTBOX_EVENT_TYPES.PAYMENT_FAILED,
        idempotencyKey: `payment-failed:${token}`,
        payloadJson: {
          provider: PaymentProvider.IYZICO,
          orderId: Number(session.orderId),
          token,
        },
      });
    }

    return {
      provider: PaymentProvider.IYZICO,
      status: retrieval.status,
      paymentId: retrieval.paymentId ?? null,
      paidAmountCents:
        typeof retrieval.paidAmount === 'number' &&
        Number.isFinite(retrieval.paidAmount)
          ? Math.round(Number(retrieval.paidAmount) * 100)
          : null,
      response: retrieval.raw,
    };
  }

  async recordPayment(input: RecordPaymentInput) {
    const client = input.tx ?? this.prisma;
    const provider = this.normalizeProvider(input.provider);

    const payment = await client.payment.create({
      data: {
        businessId: input.businessId,
        orderId: input.orderId,
        storeId: input.storeId ?? null,
        sellerId: input.sellerId ?? null,
        createdByUserId: input.createdByUserId ?? null,
        amountCents: input.amountCents,
        method: input.method,
        reference: input.reference ?? null,
      },
      select: {
        id: true,
        amountCents: true,
        method: true,
        reference: true,
        createdAt: true,
      },
    });

    const transaction = await (client as Prisma.TransactionClient).paymentTransaction.create({
      data: {
        businessId: input.businessId,
        orderId: input.orderId,
        paymentId: payment.id,
        storeId: input.storeId ?? null,
        createdByUserId: input.createdByUserId ?? null,
        provider,
        kind:
          provider === PaymentProvider.IYZICO ? 'CAPTURE' : 'SALE',
        status: 'SUCCEEDED',
        amountCents: input.amountCents,
        method: input.method,
        externalReference: input.reference ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        metadataJson: {
          provider: provider ?? 'MANUAL',
        },
      },
      select: { id: true },
    });

    if (!input.tx) {
      await this.enqueuePaymentEvent({
        businessId: input.businessId,
        aggregateType: 'PAYMENT',
        aggregateId: payment.id,
        eventType: OUTBOX_EVENT_TYPES.PAYMENT_CAPTURED,
        idempotencyKey:
          input.idempotencyKey ?? `payment-captured:${payment.id}`,
        payloadJson: {
          paymentId: payment.id,
          paymentTransactionId: transaction.id,
          orderId: input.orderId,
          storeId: input.storeId ?? null,
          amountCents: input.amountCents,
          method: input.method,
          provider: provider ?? null,
          reference: input.reference ?? null,
        },
      });
    }

    return {
      payment,
      transactionId: transaction.id,
    };
  }

  async recordRefund(input: RecordRefundInput) {
    const client = input.tx ?? this.prisma;
    const provider = this.normalizeProvider(input.provider);

    const payment = await client.payment.create({
      data: {
        businessId: input.businessId,
        orderId: input.orderId,
        storeId: input.storeId ?? null,
        sellerId: input.sellerId ?? null,
        createdByUserId: input.createdByUserId ?? null,
        amountCents: -Math.abs(input.amountCents),
        method: input.method ?? PaymentMethod.CASH,
        reference: input.reference ?? null,
      },
      select: {
        id: true,
        amountCents: true,
        method: true,
        reference: true,
        createdAt: true,
      },
    });

    const transaction = await (client as Prisma.TransactionClient).paymentTransaction.create({
      data: {
        businessId: input.businessId,
        orderId: input.orderId,
        paymentId: payment.id,
        storeId: input.storeId ?? null,
        createdByUserId: input.createdByUserId ?? null,
        provider,
        kind: 'REFUND',
        status: 'SUCCEEDED',
        amountCents: Math.abs(input.amountCents),
        method: input.method ?? PaymentMethod.CASH,
        externalReference: input.reference ?? null,
        metadataJson: {
          provider: provider ?? 'MANUAL',
          reason: input.reason ?? null,
        },
      },
      select: { id: true },
    });

    const refund = await (client as Prisma.TransactionClient).refund.create({
      data: {
        businessId: input.businessId,
        orderId: input.orderId,
        paymentId: input.paymentId ?? payment.id,
        paymentTransactionId: transaction.id,
        storeId: input.storeId ?? null,
        createdByUserId: input.createdByUserId ?? null,
        amountCents: Math.abs(input.amountCents),
        method: input.method ?? PaymentMethod.CASH,
        status: 'SUCCEEDED',
        reason: input.reason ?? null,
        externalReference: input.reference ?? null,
        metadataJson: {
          provider: provider ?? 'MANUAL',
        },
      },
      select: { id: true },
    });

    if (!input.tx) {
      await this.enqueuePaymentEvent({
        businessId: input.businessId,
        aggregateType: 'REFUND',
        aggregateId: refund.id,
        eventType: OUTBOX_EVENT_TYPES.REFUND_CREATED,
        idempotencyKey: `refund:${refund.id}`,
        payloadJson: {
          refundId: refund.id,
          paymentId: payment.id,
          paymentTransactionId: transaction.id,
          orderId: input.orderId,
          storeId: input.storeId ?? null,
          amountCents: Math.abs(input.amountCents),
          method: input.method ?? PaymentMethod.CASH,
          provider: provider ?? null,
        },
      });
    }

    return {
      payment,
      refundId: refund.id,
      transactionId: transaction.id,
    };
  }

  async recordWebhookEvent(params: {
    provider: string;
    eventId: string;
    eventType?: string;
    payload: Prisma.InputJsonValue;
    signature?: string;
    businessId?: number;
  }): Promise<{ ok: true; created: boolean; eventDbId?: number }> {
    try {
      const created = await (this.prisma as any).paymentWebhookEvent.create({
        data: {
          businessId: params.businessId,
          provider: params.provider,
          eventId: params.eventId,
          eventType: params.eventType,
          payload: params.payload,
          signature: params.signature,
          status: 'RECEIVED',
        },
        select: { id: true },
      });

      return { ok: true, created: true, eventDbId: Number(created.id) };
    } catch (err: unknown) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return { ok: true, created: false };
      }
      throw err;
    }
  }

  async markWebhookProcessed(params: {
    provider: string;
    eventId: string;
    businessId?: number;
  }): Promise<void> {
    await (this.prisma as any).paymentWebhookEvent.updateMany({
      where: {
        provider: params.provider,
        eventId: params.eventId,
        businessId: params.businessId,
      },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
        error: null,
      },
    });
  }

  async markWebhookFailed(params: {
    provider: string;
    eventId: string;
    businessId?: number;
    error: string;
  }): Promise<void> {
    await (this.prisma as any).paymentWebhookEvent.updateMany({
      where: {
        provider: params.provider,
        eventId: params.eventId,
        businessId: params.businessId,
      },
      data: {
        status: 'FAILED',
        processedAt: new Date(),
        error: params.error,
      },
    });
  }

  listWebhookEvents(params: {
    provider?: string;
    status?: string;
    businessId?: number;
  }) {
    return (this.prisma as any).paymentWebhookEvent.findMany({
      where: {
        businessId: params.businessId,
        provider: params.provider,
        status: params.status,
      },
      orderBy: { receivedAt: 'desc' },
      select: {
        id: true,
        businessId: true,
        provider: true,
        eventId: true,
        eventType: true,
        status: true,
        receivedAt: true,
        processedAt: true,
        error: true,
      },
    });
  }

  listProviders() {
    return [{ provider: 'IYZICO' }];
  }
}
