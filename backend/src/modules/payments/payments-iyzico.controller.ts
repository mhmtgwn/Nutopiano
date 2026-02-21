import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@common/decorators';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import type { JwtPayload } from '../../auth/types/jwt-payload';
import { IyzicoProvider } from './providers/iyzico.provider';
import { IyzicoInitializeDto } from './dto/iyzico-initialize.dto';
import { IyzicoRetrieveDto } from './dto/iyzico-retrieve.dto';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments/iyzico')
export class PaymentsIyzicoController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly iyzico: IyzicoProvider,
  ) {}

  @Post('initialize')
  @Roles('CUSTOMER', 'ADMIN', 'STAFF')
  @ApiOperation({
    summary: 'Initialize Iyzico CheckoutForm session for an order',
    description:
      'Creates an iyzico CheckoutForm session and returns token + checkoutFormContent/paymentPageUrl. Amount is always taken from server-side order total.',
  })
  @ApiOkResponse({ description: 'OK' })
  async initialize(@Req() req: { user: JwtPayload }, @Body() body: IyzicoInitializeDto) {
    const businessId = Number(req.user.businessId);
    const orderId = Number(body.orderId);
    if (!Number.isFinite(businessId) || !Number.isFinite(orderId)) {
      throw new BadRequestException('Invalid parameters');
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, businessId, deletedAt: null },
      select: {
        id: true,
        customerId: true,
        totalAmountCents: true,
      },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    const userId = Number(req.user.userId);
    const user = Number.isFinite(userId)
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

    if (!orderItems || orderItems.length === 0) {
      throw new BadRequestException('Order has no items');
    }

    const apiBaseUrl = (process.env.IYZICO_BASE_URL ?? 'https://sandbox-api.iyzipay.com').trim();
    const callbackUrl =
      body.callbackUrl?.trim() ||
      (process.env.IYZICO_CALLBACK_URL ?? '').trim() ||
      `${(process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? 'http://localhost:3002').replace(/\/$/, '')}/checkout/iyzico-callback`;

    const price = Number((order.totalAmountCents / 100).toFixed(2));

    const conversationId = crypto.randomUUID();

    const requestBody = {
      locale: (process.env.IYZICO_LOCALE ?? 'tr').trim(),
      conversationId,
      price,
      paidPrice: price,
      currency: (process.env.IYZICO_CURRENCY ?? 'TRY').trim(),
      basketId: `order-${order.id}`,
      paymentGroup: 'PRODUCT',
      callbackUrl,
      enabledInstallments: [1],
      buyer: {
        id: String(user?.id ?? req.user.userId ?? order.customerId),
        name: (user?.name ?? 'Customer').split(' ')[0] || 'Customer',
        surname: (user?.name ?? 'Customer').split(' ').slice(1).join(' ') || '.',
        identityNumber: (process.env.IYZICO_DEFAULT_IDENTITY_NUMBER ?? '11111111111').trim(),
        email: (user?.email ?? process.env.IYZICO_DEFAULT_EMAIL ?? 'customer@example.com').trim(),
        gsmNumber: (user?.phone ?? req.user.phone ?? process.env.IYZICO_DEFAULT_GSM ?? '+905350000000').trim(),
        registrationAddress: (process.env.IYZICO_DEFAULT_ADDRESS ?? 'N/A').trim(),
        city: (process.env.IYZICO_DEFAULT_CITY ?? 'Istanbul').trim(),
        country: (process.env.IYZICO_DEFAULT_COUNTRY ?? 'Turkey').trim(),
        zipCode: (process.env.IYZICO_DEFAULT_ZIP ?? '00000').trim(),
        ip: (process.env.IYZICO_DEFAULT_IP ?? '127.0.0.1').trim(),
      },
      shippingAddress: {
        contactName: (user?.name ?? 'Customer').trim(),
        address: (process.env.IYZICO_DEFAULT_ADDRESS ?? 'N/A').trim(),
        city: (process.env.IYZICO_DEFAULT_CITY ?? 'Istanbul').trim(),
        country: (process.env.IYZICO_DEFAULT_COUNTRY ?? 'Turkey').trim(),
        zipCode: (process.env.IYZICO_DEFAULT_ZIP ?? '00000').trim(),
      },
      billingAddress: {
        contactName: (user?.name ?? 'Customer').trim(),
        address: (process.env.IYZICO_DEFAULT_ADDRESS ?? 'N/A').trim(),
        city: (process.env.IYZICO_DEFAULT_CITY ?? 'Istanbul').trim(),
        country: (process.env.IYZICO_DEFAULT_COUNTRY ?? 'Turkey').trim(),
        zipCode: (process.env.IYZICO_DEFAULT_ZIP ?? '00000').trim(),
      },
      basketItems: orderItems.map((it) => ({
        id: String(it.productId),
        price: Number((it.totalAmountCents / 100).toFixed(2)),
        name: it.product?.name ?? `Product ${it.productId}`,
        category1: 'General',
        category2: 'General',
        itemType: 'PHYSICAL',
      })),
    };

    const uriPath = '/payment/iyzipos/checkoutform/initialize/auth/ecom';
    const { authorization, randomKey } = this.iyzico.buildIyzicoAuthHeader({
      uriPath,
      body: requestBody,
    });

    const resp = await fetch(`${apiBaseUrl}${uriPath}`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
        'x-iyzi-rnd': randomKey,
      },
      body: JSON.stringify(requestBody),
    });

    const text = await resp.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    if (!resp.ok || json?.status === 'failure') {
      throw new BadRequestException(json?.errorMessage ?? 'Iyzico initialize failed');
    }

    const token = typeof json?.token === 'string' ? json.token.trim() : '';
    if (token) {
      try {
        await (this.prisma as any).paymentSession.create({
          data: {
            businessId,
            provider: 'IYZICO',
            token,
            orderId: order.id,
            amountCents: order.totalAmountCents,
            status: 'INITIATED',
            conversationId,
          },
          select: { id: true },
        });
      } catch {
        await (this.prisma as any).paymentSession.updateMany({
          where: {
            businessId,
            provider: 'IYZICO',
            token,
          },
          data: {
            orderId: order.id,
            amountCents: order.totalAmountCents,
            status: 'INITIATED',
            conversationId,
          },
        });
      }
    }

    return json;
  }

  @Post('retrieve')
  @Roles('CUSTOMER', 'ADMIN', 'STAFF')
  @ApiOperation({
    summary: 'Retrieve Iyzico CheckoutForm result',
    description:
      'Retrieves checkout form payment result using token. If payment result is SUCCESS, records a Payment row in our DB (idempotent by reference).',
  })
  @ApiOkResponse({ description: 'OK' })
  async retrieve(@Req() req: { user: JwtPayload }, @Body() body: IyzicoRetrieveDto) {
    const businessId = Number(req.user.businessId);
    if (!Number.isFinite(businessId)) {
      throw new BadRequestException('Invalid business');
    }

    const token = body.token.trim();
    if (!token) {
      throw new BadRequestException('token is required');
    }

    const apiBaseUrl = (process.env.IYZICO_BASE_URL ?? 'https://sandbox-api.iyzipay.com').trim();
    const uriPath = '/payment/iyzipos/checkoutform/auth/ecom/detail';
    const conversationId = body.conversationId?.trim() || crypto.randomUUID();

    const requestBody = {
      locale: (process.env.IYZICO_LOCALE ?? 'tr').trim(),
      conversationId,
      token,
    };

    const { authorization, randomKey } = this.iyzico.buildIyzicoAuthHeader({
      uriPath,
      body: requestBody,
    });

    const resp = await fetch(`${apiBaseUrl}${uriPath}`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
        'x-iyzi-rnd': randomKey,
      },
      body: JSON.stringify(requestBody),
    });

    const text = await resp.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    if (!resp.ok || json?.status === 'failure') {
      throw new BadRequestException(json?.errorMessage ?? 'Iyzico retrieve failed');
    }

    const paymentResult = String(json?.paymentStatus ?? json?.paymentStatus ?? '').toUpperCase();
    const paymentId = json?.paymentId ? String(json.paymentId) : undefined;
    const paidPrice = typeof json?.paidPrice === 'number' ? json.paidPrice : Number(json?.paidPrice);

    const session = await (this.prisma as any).paymentSession.findFirst({
      where: {
        businessId,
        provider: 'IYZICO',
        token,
      },
      select: {
        id: true,
        orderId: true,
        amountCents: true,
        status: true,
      },
    });

    if (!session) {
      throw new BadRequestException('Payment session not found for token');
    }

    if (paymentResult === 'SUCCESS' && paymentId) {
      const amountCents = Number.isFinite(paidPrice)
        ? Math.round(Number(paidPrice) * 100)
        : NaN;

      if (!Number.isFinite(amountCents) || amountCents <= 0) {
        throw new BadRequestException('Invalid paidPrice');
      }

      // We do not yet have a dedicated PaymentIntent table.
      // As a pragmatic start, record Payment with reference=iyzico paymentId.
      // If already recorded, skip (idempotent).

      const existing = await this.prisma.payment.findFirst({
        where: {
          businessId,
          reference: paymentId,
        },
        select: { id: true },
      });

      if (!existing) {
        const orderId = Number(session.orderId);
        await this.prisma.payment.create({
          data: {
            businessId,
            orderId,
            amountCents,
            method: 'CARD',
            reference: paymentId,
          } as any,
          select: { id: true },
        });
      }

      await (this.prisma as any).paymentSession.updateMany({
        where: {
          id: session.id,
        },
        data: {
          status: 'COMPLETED',
          paymentId,
        },
      });
    } else if (paymentResult && paymentResult !== 'SUCCESS') {
      await (this.prisma as any).paymentSession.updateMany({
        where: {
          id: session.id,
        },
        data: {
          status: 'FAILED',
        },
      });
    }

    return json;
  }
}
