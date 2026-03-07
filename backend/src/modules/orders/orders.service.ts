import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { SettingsService } from '../settings/settings.service';
import { FinanceService } from '../finance/finance.service';
import { EmailService } from '../../email/email.service';
import { OUTBOX_EVENT_TYPES } from '../outbox/outbox.constants';
import { OutboxService } from '../outbox/outbox.service';
import {
  CatalogReadPort,
  CheckoutLineInput,
  InventoryPort,
  LedgerPostingService,
  OrderLifecyclePolicy,
  PaymentsPort,
  PricingPort,
  StoreContextPort,
} from '../../core/commerce';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderPaymentMode } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import {
  CommerceChannel,
  OrderLifecycleState,
  OrderSource,
  Prisma,
} from '@prisma/client';
import {
  ResolveReturnRequestAction,
  ResolveReturnRequestDto,
} from './dto/resolve-return-request.dto';
import {
  buildPaginationMeta,
  clampPage,
  clampPageSize,
  paginationToSkipTake,
  type PaginationMeta,
} from '../../common/utils/pagination';
import { parseBusinessId } from '../../common/utils';
import {
  hasPosPermission,
  normalizePosPermissionsJson,
} from '@common/authz';

export interface OrderSummary {
  id: number;
  customerId: number;
  sellerId?: number | null;
  storeId?: number | null;
  totalAmountCents: number;
  currency?: string;
  commissionAmountCents?: number;
  sellerNetAmountCents?: number;
  priceMismatch?: boolean;
  lifecycleState?: OrderLifecycleState;
  statusKey: string;
  source: OrderSource;
  createdByUserId: number;
  createdAt: Date;
}

export interface OrderLedgerEntrySummary {
  id: number;
  eventId: string;
  eventType: string;
  accountType: string;
  direction: string;
  amountCents: number;
  currency: string;
  orderId?: number | null;
  sellerId?: number | null;
  payoutRequestId?: number | null;
  metadata?: unknown;
  createdAt: Date;
}

export interface OrderAuditLogSummary {
  id: number;
  actorRole: string;
  actorUserId: number;
  actionType: string;
  targetType: string;
  targetId: string;
  payloadJson?: unknown;
  createdAt: Date;
}

export interface OrderDetail extends OrderSummary {
  subtotalAmountCents?: number;
  discountAmountCents?: number;
  taxAmountCents?: number;
  platformRevenueCents?: number;
  calculationProfileId?: string | null;
  calculationVersion?: string | null;
  breakdownJson?: unknown;
  priceMismatchMetaJson?: unknown;
  notes?: string | null;
  shipmentCarrier?: string | null;
  shipmentTrackingNumber?: string | null;
  items: Array<{
    id: number;
    productId: number;
    variantId?: number | null;
    productName: string;
    quantity: number;
    unitPriceCents: number;
    totalAmountCents: number;
  }>;
  ledgerEntries?: OrderLedgerEntrySummary[];
  auditLogs?: OrderAuditLogSummary[];
  creditLimitWarned?: boolean;
  priceMismatch?: boolean;
}

export interface PaymentSummary {
  id: number;
  amountCents: number;
  method: string;
  reference?: string | null;
  createdAt: Date;
}

export interface ReturnRequestSummary {
  id: number;
  orderId: number;
  customerId: number;
  status: string;
  reason?: string | null;
  responseNote?: string | null;
  requestedAt: Date;
  decidedAt?: Date | null;
  decidedByUserId?: number | null;
}

const ORDER_DEFAULT_STATUS_KEY = 'order.defaultStatusKey';
const COMMISSION_RATE_KEY = 'global_commission_rate';
const ORDER_CREATE_OPERATION = 'ORDER_CREATE';
const IDEMPOTENCY_KEY_MAX_LENGTH = 128;
type VariantRow = {
  id: number;
  productId: number;
  priceCents: number;
  stock: number | null;
  name: string;
};
type OrderItemStockLine = {
  productId: number;
  variantId?: number | null;
  quantity: number;
};
type ResolvedOrderRuleConfig = {
  calculationProfileId: string;
  taxProfileCode: string;
  commissionProfileCode: string;
  commissionPolicy: {
    type: 'PERCENT' | 'FIXED';
    value: number;
  };
  source: 'CHANNEL_BINDING' | 'FALLBACK_GLOBAL_RATE';
};
const POS_GUEST_CUSTOMER_PHONE = '9999999999';
const POS_GUEST_CUSTOMER_NAME = 'POS Misafir';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
    private readonly financeService: FinanceService,
    private readonly emailService: EmailService,
    private readonly outboxService: OutboxService,
    private readonly ledgerPostingService: LedgerPostingService,
    private readonly catalogReadPort: CatalogReadPort,
    private readonly inventoryPort: InventoryPort,
    private readonly pricingPort: PricingPort,
    private readonly paymentsPort: PaymentsPort,
    private readonly storeContextPort: StoreContextPort,
    private readonly orderLifecyclePolicy: OrderLifecyclePolicy,
  ) {}

  private requireBusinessId(currentUser: JwtPayload): number {
    const businessId = parseBusinessId(currentUser.businessId);
    if (!businessId) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return businessId;
  }

  private mapOrderSummaryRow(row: {
    id: number;
    customerId: number;
    sellerId: number | null;
    storeId: number | null;
    totalAmountCents: number;
    currency: string;
    commissionSnapshotCents: number;
    sellerPayoutCents: number;
    priceMismatch: boolean;
    lifecycleState: OrderLifecycleState;
    source: OrderSource;
    createdByUserId: number;
    createdAt: Date;
    status: {
      key: string;
    };
  }): OrderSummary {
    return {
      id: row.id,
      customerId: row.customerId,
      sellerId: row.sellerId,
      storeId: row.storeId,
      totalAmountCents: row.totalAmountCents,
      currency: row.currency,
      commissionAmountCents: row.commissionSnapshotCents,
      sellerNetAmountCents: row.sellerPayoutCents,
      priceMismatch: Boolean(row.priceMismatch),
      lifecycleState: row.lifecycleState,
      statusKey: row.status.key,
      source: row.source,
      createdByUserId: row.createdByUserId,
      createdAt: row.createdAt,
    };
  }

  private async getNetPaidAmountCents(
    client: Prisma.TransactionClient | PrismaService,
    businessId: number,
    orderId: number,
  ) {
    const aggregate = await client.payment.aggregate({
      where: {
        businessId,
        orderId,
      },
      _sum: { amountCents: true },
    });
    return Number(aggregate._sum.amountCents ?? 0);
  }

  private async emitOrderStatusEvent(params: {
    businessId: number;
    orderId: number;
    storeId?: number | null;
    fromStatusKey?: string | null;
    toStatusKey: string;
    lifecycleState: OrderLifecycleState;
    isCancelled?: boolean;
  }) {
    await this.outboxService.enqueueEvent({
      businessId: params.businessId,
      aggregateType: 'ORDER',
      aggregateId: params.orderId,
      eventType: OUTBOX_EVENT_TYPES.ORDER_STATUS_CHANGED,
      idempotencyKey: `order-status:${params.orderId}:${params.toStatusKey}`,
      payloadJson: {
        orderId: params.orderId,
        storeId: params.storeId ?? null,
        fromStatusKey: params.fromStatusKey ?? null,
        toStatusKey: params.toStatusKey,
        lifecycleState: params.lifecycleState,
      },
    });

    if (params.isCancelled) {
      await this.outboxService.enqueueEvent({
        businessId: params.businessId,
        aggregateType: 'ORDER',
        aggregateId: params.orderId,
        eventType: OUTBOX_EVENT_TYPES.ORDER_CANCELLED,
        idempotencyKey: `order-cancelled:${params.orderId}`,
        payloadJson: {
          orderId: params.orderId,
          storeId: params.storeId ?? null,
          lifecycleState: params.lifecycleState,
        },
      });
    }
  }

  private async listOrderLedgerEntries(params: {
    businessId: number;
    orderId: number;
  }): Promise<OrderLedgerEntrySummary[]> {
    const rows = await this.prisma.financeLedgerEntry.findMany({
      where: {
        businessId: params.businessId,
        orderId: params.orderId,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        eventId: true,
        eventType: true,
        accountType: true,
        direction: true,
        amountCents: true,
        currency: true,
        orderId: true,
        sellerId: true,
        payoutRequestId: true,
        metadata: true,
        createdAt: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      eventId: row.eventId,
      eventType: row.eventType,
      accountType: row.accountType,
      direction: row.direction,
      amountCents: row.amountCents,
      currency: row.currency,
      orderId: row.orderId,
      sellerId: row.sellerId,
      payoutRequestId: row.payoutRequestId,
      metadata: row.metadata ?? undefined,
      createdAt: row.createdAt,
    }));
  }

  private async listOrderAuditLogs(params: {
    businessId: number;
    orderId: number;
  }): Promise<OrderAuditLogSummary[]> {
    const rows = await this.prisma.auditLog.findMany({
      where: {
        businessId: params.businessId,
        targetId: String(params.orderId),
        targetType: {
          in: ['ORDER', 'ORDER_STATUS', 'ORDER_PAYMENT', 'RETURN_REQUEST'],
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        actorRole: true,
        actorUserId: true,
        actionType: true,
        targetType: true,
        targetId: true,
        payloadJson: true,
        createdAt: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      actorRole: row.actorRole,
      actorUserId: row.actorUserId,
      actionType: row.actionType,
      targetType: row.targetType,
      targetId: row.targetId,
      payloadJson: row.payloadJson ?? undefined,
      createdAt: row.createdAt,
    }));
  }

  private normalizeIdempotencyKey(rawKey?: string): string | null {
    if (!rawKey || typeof rawKey !== 'string') {
      return null;
    }

    const normalized = rawKey.trim();
    if (!normalized) {
      return null;
    }

    if (normalized.length > IDEMPOTENCY_KEY_MAX_LENGTH) {
      throw new BadRequestException(
        `Idempotency-Key en fazla ${IDEMPOTENCY_KEY_MAX_LENGTH} karakter olabilir.`,
      );
    }

    return normalized;
  }

  private mapOrderSourceToCommerceChannel(
    source: OrderSource,
  ): CommerceChannel {
    if (source === OrderSource.POS) {
      return CommerceChannel.POS;
    }

    if (source === OrderSource.WEB || source === OrderSource.MOBILE) {
      return CommerceChannel.MARKETPLACE;
    }

    return CommerceChannel.MANUAL;
  }

  private isOrderSource(value: string): value is OrderSource {
    return Object.values(OrderSource).includes(value as OrderSource);
  }

  private buildOrderCreateIdempotencyHash(
    currentUser: JwtPayload,
    payload: CreateOrderDto,
  ): string {
    const normalizedPayload = {
      actor: {
        userId: Number(currentUser.userId),
        role: String(currentUser.role),
      },
      customerId:
        typeof payload.customerId === 'number' &&
        Number.isFinite(payload.customerId)
          ? Number(payload.customerId)
          : null,
      sellerId:
        typeof payload.sellerId === 'number' &&
        Number.isFinite(payload.sellerId)
          ? Number(payload.sellerId)
          : null,
      source: payload.source ?? null,
      paymentMode: payload.paymentMode ?? null,
      notes: payload.notes?.trim() ?? null,
      couponCode: payload.couponCode?.trim().toUpperCase() ?? null,
      cartDiscountAmountCents: Number(payload.cartDiscountAmountCents ?? 0),
      items: (payload.items ?? []).map((item) => ({
        productId: Number(item.productId),
        variantId:
          typeof item.variantId === 'number' ? Number(item.variantId) : null,
        quantity: Number(item.quantity),
        expectedUnitPriceCents:
          typeof item.expectedUnitPriceCents === 'number'
            ? Number(item.expectedUnitPriceCents)
            : null,
        discountAmountCents: Number(item.discountAmountCents ?? 0),
      })),
    };

    return createHash('sha256')
      .update(JSON.stringify(normalizedPayload))
      .digest('hex');
  }

  private isPrismaUniqueConstraintError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const maybeCode = (error as { code?: unknown }).code;
    return typeof maybeCode === 'string' && maybeCode === 'P2002';
  }

  private async getCommissionRateForOrderCreate(
    businessId: number,
  ): Promise<number> {
    const rate = await this.settingsService.getJson<number>(
      businessId,
      COMMISSION_RATE_KEY,
    );

    if (typeof rate !== 'number' || Number.isNaN(rate) || rate < 0) {
      return 0.05;
    }

    return rate;
  }

  private async resolveOrderRuleConfig(params: {
    businessId: number;
    sellerId?: number | null;
    source: OrderSource;
    fallbackCommissionRateBps: number;
  }): Promise<ResolvedOrderRuleConfig> {
    const fallback: ResolvedOrderRuleConfig = {
      calculationProfileId: 'legacy-default',
      taxProfileCode: 'TR_DEFAULT',
      commissionProfileCode: 'LEGACY_GLOBAL_RATE',
      commissionPolicy: {
        type: 'PERCENT',
        value: Math.max(Math.trunc(params.fallbackCommissionRateBps), 0),
      },
      source: 'FALLBACK_GLOBAL_RATE',
    };

    const sellerId =
      typeof params.sellerId === 'number' && Number.isFinite(params.sellerId)
        ? Math.trunc(params.sellerId)
        : null;
    if (!sellerId) {
      return fallback;
    }

    const binding = await this.prisma.sellerChannelRuleBinding.findFirst({
      where: {
        businessId: params.businessId,
        sellerId,
        channel: this.mapOrderSourceToCommerceChannel(params.source),
        isActive: true,
        calculationProfile: {
          isActive: true,
        },
      },
      include: {
        calculationProfile: {
          include: {
            commissionRule: true,
          },
        },
      },
    });

    if (!binding) {
      return fallback;
    }

    const profile = binding.calculationProfile;
    const rule = profile.commissionRule;
    const commissionPolicy =
      rule?.type === 'FIXED'
        ? {
            type: 'FIXED' as const,
            value: Math.max(Math.trunc(Number(rule.fixedAmountCents ?? 0)), 0),
          }
        : {
            type: 'PERCENT' as const,
            value: Math.max(
              Math.trunc(
                Number(rule?.rateBps ?? params.fallbackCommissionRateBps ?? 0),
              ),
              0,
            ),
          };

    return {
      calculationProfileId: profile.code,
      taxProfileCode: profile.taxProfileCode || 'TR_DEFAULT',
      commissionProfileCode: profile.code,
      commissionPolicy,
      source: 'CHANNEL_BINDING',
    };
  }

  private async resolveOrderEmailRecipient(
    businessId: number,
    orderId: number,
  ): Promise<{ email: string; customerName: string } | null> {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        businessId,
      },
      select: {
        customer: {
          select: {
            name: true,
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return null;
    }

    const email = order.customer.user?.email?.trim();
    if (!email) {
      return null;
    }

    return {
      email,
      customerName: order.customer.name,
    };
  }

  private async sendOrderCreatedNotification(
    businessId: number,
    orderId: number,
    totalAmountCents: number,
  ): Promise<void> {
    try {
      const recipient = await this.resolveOrderEmailRecipient(
        businessId,
        orderId,
      );
      if (!recipient) return;

      await this.emailService.sendOrderCreatedEmail({
        to: recipient.email,
        customerName: recipient.customerName,
        orderId,
        totalAmountCents,
        siteName: 'Nutopiano',
      });
    } catch (error) {
      console.warn('Order created email failed:', {
        businessId,
        orderId,
        error: (error as { message?: string })?.message ?? String(error),
      });
    }
  }

  private async sendOrderStatusChangedNotification(
    businessId: number,
    orderId: number,
    previousStatusKey: string,
    nextStatusKey: string,
  ): Promise<void> {
    if (previousStatusKey === nextStatusKey) {
      return;
    }

    try {
      const recipient = await this.resolveOrderEmailRecipient(
        businessId,
        orderId,
      );
      if (!recipient) return;

      await this.emailService.sendOrderStatusChangedEmail({
        to: recipient.email,
        customerName: recipient.customerName,
        orderId,
        previousStatusKey,
        nextStatusKey,
        siteName: 'Nutopiano',
      });
    } catch (error) {
      console.warn('Order status email failed:', {
        businessId,
        orderId,
        previousStatusKey,
        nextStatusKey,
        error: (error as { message?: string })?.message ?? String(error),
      });
    }
  }

  private async sendOrderPaymentNotification(
    businessId: number,
    orderId: number,
    amountCents: number,
    method: string,
  ): Promise<void> {
    try {
      const recipient = await this.resolveOrderEmailRecipient(
        businessId,
        orderId,
      );
      if (!recipient) return;

      await this.emailService.sendOrderPaymentReceivedEmail({
        to: recipient.email,
        customerName: recipient.customerName,
        orderId,
        amountCents,
        method,
        siteName: 'Nutopiano',
      });
    } catch (error) {
      console.warn('Order payment email failed:', {
        businessId,
        orderId,
        amountCents,
        method,
        error: (error as { message?: string })?.message ?? String(error),
      });
    }
  }

  private async resolveCustomerIdForUser(
    currentUser: JwtPayload,
    businessId: number,
  ): Promise<number | null> {
    const userId = Number(currentUser.userId);

    if (Number.isFinite(userId)) {
      const linkedCustomer = await this.prisma.customer.findFirst({
        where: {
          businessId,
          userId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (linkedCustomer) {
        return linkedCustomer.id;
      }
    }

    const phone = currentUser.phone?.trim();
    if (!phone) {
      return null;
    }

    const fallbackCustomer = await this.prisma.customer.findFirst({
      where: {
        businessId,
        phone,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    return fallbackCustomer?.id ?? null;
  }

  private async resolveOrCreatePosGuestCustomer(
    businessId: number,
    createdByUserId: number,
  ): Promise<number> {
    const existing = await this.prisma.customer.findFirst({
      where: {
        businessId,
        phone: POS_GUEST_CUSTOMER_PHONE,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

    if (existing) {
      if (existing.deletedAt) {
        const restored = await this.prisma.customer.update({
          where: { id: existing.id },
          data: {
            name: POS_GUEST_CUSTOMER_NAME,
            deletedAt: null,
          },
          select: { id: true },
        });
        return restored.id;
      }
      return existing.id;
    }

    try {
      const created = await this.prisma.customer.create({
        data: {
          businessId,
          createdByUserId,
          name: POS_GUEST_CUSTOMER_NAME,
          phone: POS_GUEST_CUSTOMER_PHONE,
          balance: 0,
        },
        select: { id: true },
      });
      return created.id;
    } catch {
      const conflictRow = await this.prisma.customer.findFirst({
        where: {
          businessId,
          phone: POS_GUEST_CUSTOMER_PHONE,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (conflictRow) {
        return conflictRow.id;
      }
      throw new BadRequestException('POS misafir musterisi olusturulamadi');
    }
  }

  private async resolveCustomerIdForCreate(
    currentUser: JwtPayload,
    businessId: number,
    createdByUserId: number,
    payload: CreateOrderDto,
  ): Promise<number> {
    if (
      typeof payload.customerId === 'number' &&
      Number.isFinite(payload.customerId)
    ) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: payload.customerId, businessId, deletedAt: null },
        select: { id: true },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
      return customer.id;
    }

    if (currentUser.role === 'CUSTOMER') {
      const linkedCustomerId = await this.resolveCustomerIdForUser(
        currentUser,
        businessId,
      );
      if (!linkedCustomerId) {
        throw new NotFoundException('Customer not found');
      }
      return linkedCustomerId;
    }

    if (payload.source === OrderSource.POS) {
      return this.resolveOrCreatePosGuestCustomer(businessId, createdByUserId);
    }

    throw new NotFoundException('Customer is required');
  }

  private async resolveSellerProfileId(
    businessId: number,
    userId: number,
  ): Promise<number | null> {
    const seller = await this.prisma.seller.findFirst({
      where: {
        businessId,
        userId,
        isActive: true,
      },
      select: { id: true },
    });
    return seller?.id ?? null;
  }

  private async resolveUserTeamSellerIds(
    businessId: number,
    userId: number,
  ): Promise<number[]> {
    const rows = await this.prisma.sellerTeamMember.findMany({
      where: {
        businessId,
        userId,
        isActive: true,
      },
      select: { sellerId: true },
    });
    return Array.from(new Set(rows.map((row) => row.sellerId)));
  }

  private async resolveUserTeamPermissionRows(
    businessId: number,
    userId: number,
  ) {
    const rows = await this.prisma.sellerTeamMember.findMany({
      where: {
        businessId,
        userId,
        isActive: true,
        seller: {
          isActive: true,
        },
      },
      select: {
        sellerId: true,
        permissionsJson: true,
      },
    });

    return rows
      .map((row) => ({
        sellerId: Number(row.sellerId),
        permissions: normalizePosPermissionsJson(row.permissionsJson),
      }))
      .filter((row) => Number.isFinite(row.sellerId) && row.sellerId > 0);
  }

  private async assertUserPermission(
    currentUser: JwtPayload,
    permissionKey: string,
    sellerId?: number | null,
  ) {
    if (currentUser.role !== 'USER') {
      return;
    }

    const businessId = this.requireBusinessId(currentUser);
    const userId = Number(currentUser.userId);

    const rows = await this.resolveUserTeamPermissionRows(businessId, userId);
    if (!rows.length) {
      throw new ForbiddenException('Aktif seller team uyeligi bulunamadi');
    }

    const normalizedSellerId =
      typeof sellerId === 'number' && Number.isFinite(sellerId) && sellerId > 0
        ? Math.trunc(sellerId)
        : null;

    const scopedRows =
      normalizedSellerId !== null
        ? rows.filter((row) => row.sellerId === normalizedSellerId)
        : rows;

    if (!scopedRows.length) {
      throw new ForbiddenException('Access denied');
    }

    const hasPermission = scopedRows.some((row) =>
      hasPosPermission(row.permissions, permissionKey),
    );
    if (!hasPermission) {
      throw new ForbiddenException('Bu islem icin yetkiniz yok');
    }
  }

  private async resolveSellerIdForCreate(
    currentUser: JwtPayload,
    payload: CreateOrderDto,
  ): Promise<number | null> {
    const businessId = this.requireBusinessId(currentUser);
    const userId = Number(currentUser.userId);
    const requestedSellerId =
      typeof payload.sellerId === 'number' && payload.sellerId > 0
        ? Math.trunc(payload.sellerId)
        : null;

    if (currentUser.role === 'SELLER') {
      const sellerId = await this.resolveSellerProfileId(businessId, userId);
      if (!sellerId) {
        throw new ForbiddenException('Seller profili bulunamadi');
      }
      if (requestedSellerId && requestedSellerId !== sellerId) {
        throw new ForbiddenException(
          'Sadece kendi seller kapsaminda siparis acabilirsiniz',
        );
      }
      return sellerId;
    }

    if (currentUser.role === 'USER') {
      const sellerIds = await this.resolveUserTeamSellerIds(businessId, userId);
      if (!sellerIds.length) {
        throw new ForbiddenException('Aktif seller team uyeligi bulunamadi');
      }
      if (requestedSellerId) {
        if (!sellerIds.includes(requestedSellerId)) {
          throw new ForbiddenException(
            'Bu seller kapsaminda siparis acamazsiniz',
          );
        }
        return requestedSellerId;
      }
      if (sellerIds.length === 1) {
        return sellerIds[0];
      }
      throw new BadRequestException(
        'Birden fazla seller uyeligi var. sellerId belirtin',
      );
    }

    return requestedSellerId;
  }

  private async buildOrderReadScopeWhere(currentUser: JwtPayload) {
    const businessId = this.requireBusinessId(currentUser);
    const userId = Number(currentUser.userId);

    if (currentUser.role === 'USER') {
      const sellerIds = await this.resolveUserTeamSellerIds(businessId, userId);
      if (!sellerIds.length) {
        throw new ForbiddenException('Aktif seller team uyeligi bulunamadi');
      }
      await this.assertUserPermission(currentUser, 'pos.orders');
      return {
        businessId,
        sellerId: { in: sellerIds },
        deletedAt: null,
      };
    }

    if (currentUser.role === 'SELLER') {
      const sellerId = await this.resolveSellerProfileId(businessId, userId);
      if (!sellerId) {
        return {
          businessId,
          id: { in: [-1] },
          deletedAt: null,
        };
      }
      return {
        businessId,
        sellerId,
        deletedAt: null,
      };
    }

    return { businessId, deletedAt: null };
  }

  private async isGuestCustomer(businessId: number, customerId: number) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        businessId,
      },
      select: { phone: true },
    });
    return customer?.phone === POS_GUEST_CUSTOMER_PHONE;
  }

  private async getCustomerDebtCents(params: {
    tx: any;
    businessId: number;
    sellerId: number;
    customerId: number;
  }) {
    const [debitAggregate, creditAggregate] = await Promise.all([
      params.tx.customerLedgerEntry.aggregate({
        where: {
          businessId: params.businessId,
          sellerId: params.sellerId,
          customerId: params.customerId,
          type: 'DEBIT',
        },
        _sum: { amountCents: true },
      }),
      params.tx.customerLedgerEntry.aggregate({
        where: {
          businessId: params.businessId,
          sellerId: params.sellerId,
          customerId: params.customerId,
          type: 'CREDIT',
        },
        _sum: { amountCents: true },
      }),
    ]);

    const totalDebit = Number(debitAggregate?._sum?.amountCents ?? 0);
    const totalCredit = Number(creditAggregate?._sum?.amountCents ?? 0);
    return Math.max(totalDebit - totalCredit, 0);
  }

  private async createCustomerLedgerEntry(params: {
    tx: any;
    businessId: number;
    sellerId: number;
    customerId: number;
    orderId: number;
    type: 'DEBIT' | 'CREDIT';
    sourceType:
      | 'SALE_DEBIT'
      | 'PAYMENT_CREDIT'
      | 'RETURN_REVERSAL'
      | 'CANCEL_REVERSAL'
      | 'MANUAL_ADJUSTMENT';
    amountCents: number;
    createdByUserId?: number;
  }) {
    const normalizedAmount = Math.max(
      Math.trunc(Math.abs(params.amountCents)),
      0,
    );
    if (normalizedAmount <= 0) {
      return null;
    }

    const currentBalance = await this.getCustomerDebtCents({
      tx: params.tx,
      businessId: params.businessId,
      sellerId: params.sellerId,
      customerId: params.customerId,
    });
    const nextBalance =
      params.type === 'DEBIT'
        ? currentBalance + normalizedAmount
        : Math.max(currentBalance - normalizedAmount, 0);

    return params.tx.customerLedgerEntry.create({
      data: {
        businessId: params.businessId,
        sellerId: params.sellerId,
        customerId: params.customerId,
        orderId: params.orderId,
        type: params.type,
        sourceType: params.sourceType,
        amountCents: normalizedAmount,
        balanceAfterCents: nextBalance,
        createdByUserId: params.createdByUserId ?? null,
      },
      select: {
        id: true,
      },
    });
  }

  async findAllPaginated(
    currentUser: JwtPayload,
    params?: {
      page?: number;
      pageSize?: number;
      source?: string;
      statusKey?: string;
      customerId?: number;
      createdByUserId?: number;
      dateFrom?: string;
      dateTo?: string;
    },
  ): Promise<{ data: OrderSummary[]; meta: PaginationMeta }> {
    const businessId = this.requireBusinessId(currentUser);

    const page = clampPage(Number(params?.page ?? 1));
    const pageSize = clampPageSize(Number(params?.pageSize ?? 20));
    const sourceRaw = (params?.source ?? '').trim().toUpperCase();
    const statusKeyRaw = (params?.statusKey ?? '').trim().toUpperCase();

    const sourceFilter =
      sourceRaw.length > 0 && this.isOrderSource(sourceRaw)
        ? sourceRaw
        : undefined;

    const requestedCustomerId =
      typeof params?.customerId === 'number' &&
      Number.isFinite(params.customerId)
        ? Math.trunc(params.customerId)
        : null;
    const requestedCreatedByUserId =
      typeof params?.createdByUserId === 'number' &&
      Number.isFinite(params.createdByUserId)
        ? Math.trunc(params.createdByUserId)
        : null;

    const fromRaw = (params?.dateFrom ?? '').trim();
    const toRaw = (params?.dateTo ?? '').trim();
    let dateFrom: Date | undefined;
    let dateToExclusive: Date | undefined;

    if (fromRaw) {
      dateFrom = new Date(`${fromRaw}T00:00:00.000Z`);
      if (Number.isNaN(dateFrom.getTime())) {
        throw new BadRequestException('dateFrom gecersiz');
      }
    }
    if (toRaw) {
      dateToExclusive = new Date(`${toRaw}T00:00:00.000Z`);
      if (Number.isNaN(dateToExclusive.getTime())) {
        throw new BadRequestException('dateTo gecersiz');
      }
      dateToExclusive.setUTCDate(dateToExclusive.getUTCDate() + 1);
    }
    if (dateFrom && dateToExclusive && dateToExclusive <= dateFrom) {
      throw new BadRequestException('dateTo, dateFrom tarihinden once olamaz');
    }

    const createdAtFilter =
      dateFrom || dateToExclusive
        ? {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateToExclusive ? { lt: dateToExclusive } : {}),
          }
        : undefined;

    if (currentUser.role === 'CUSTOMER') {
      const customerId = await this.resolveCustomerIdForUser(
        currentUser,
        businessId,
      );
      if (!customerId) {
        const meta = buildPaginationMeta(0, page, pageSize);
        return { data: [], meta };
      }

      const where: Prisma.OrderWhereInput = {
        businessId,
        customerId,
        deletedAt: null,
        ...(sourceFilter ? { source: sourceFilter } : {}),
        ...(statusKeyRaw ? { status: { key: statusKeyRaw } } : {}),
        ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
      };

      const total = await this.prisma.order.count({ where });
      const meta = buildPaginationMeta(total, page, pageSize);
      const { skip, take } = paginationToSkipTake(meta);

      const orders = await this.prisma.order.findMany({
        where,
        select: {
          id: true,
          customerId: true,
          sellerId: true,
          storeId: true,
          totalAmountCents: true,
          currency: true,
          commissionSnapshotCents: true,
          sellerPayoutCents: true,
          priceMismatch: true,
          lifecycleState: true,
          source: true,
          createdByUserId: true,
          createdAt: true,
          status: {
            select: {
              key: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take,
      });

      return {
        data: orders.map((o) => this.mapOrderSummaryRow(o)),
        meta,
      };
    }

    const baseWhere = await this.buildOrderReadScopeWhere(currentUser);
    const where: Prisma.OrderWhereInput = {
      ...baseWhere,
      ...(sourceFilter ? { source: sourceFilter } : {}),
      ...(statusKeyRaw ? { status: { key: statusKeyRaw } } : {}),
      ...(requestedCustomerId && requestedCustomerId > 0
        ? { customerId: requestedCustomerId }
        : {}),
      ...(requestedCreatedByUserId && requestedCreatedByUserId > 0
        ? { createdByUserId: requestedCreatedByUserId }
        : {}),
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
    };

    const total = await this.prisma.order.count({ where });
    const meta = buildPaginationMeta(total, page, pageSize);
    const { skip, take } = paginationToSkipTake(meta);

    const orders = await this.prisma.order.findMany({
      where,
      select: {
        id: true,
        customerId: true,
        sellerId: true,
        storeId: true,
        totalAmountCents: true,
        currency: true,
        commissionSnapshotCents: true,
        sellerPayoutCents: true,
        priceMismatch: true,
        lifecycleState: true,
        source: true,
        createdByUserId: true,
        createdAt: true,
        status: {
          select: {
            key: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take,
    });

    return {
      data: orders.map((o) => this.mapOrderSummaryRow(o)),
      meta,
    };
  }

  async listPlatformOrders(
    currentUser: JwtPayload,
    params?: { source?: string; page?: number; pageSize?: number },
  ): Promise<{ data: OrderSummary[]; meta: PaginationMeta }> {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const businessId = this.requireBusinessId(currentUser);
    const page = clampPage(Number(params?.page ?? 1));
    const pageSize = clampPageSize(Number(params?.pageSize ?? 20));

    const sourceRaw = (params?.source ?? '').trim();
    const sourceFilter =
      sourceRaw.length > 0 && this.isOrderSource(sourceRaw)
        ? sourceRaw
        : undefined;

    const where: {
      businessId: number;
      deletedAt: null;
      source?: OrderSource;
    } = { businessId, deletedAt: null };
    if (sourceFilter) {
      where.source = sourceFilter;
    }

    const total = await this.prisma.order.count({ where });
    const meta = buildPaginationMeta(total, page, pageSize);
    const { skip, take } = paginationToSkipTake(meta);

    const orders = await this.prisma.order.findMany({
      where,
      select: {
        id: true,
        customerId: true,
        sellerId: true,
        storeId: true,
        totalAmountCents: true,
        currency: true,
        commissionSnapshotCents: true,
        sellerPayoutCents: true,
        priceMismatch: true,
        lifecycleState: true,
        source: true,
        createdByUserId: true,
        createdAt: true,
        status: {
          select: {
            key: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take,
    });

    return {
      data: orders.map((o) => this.mapOrderSummaryRow(o)),
      meta,
    };
  }

  async create(
    currentUser: JwtPayload,
    payload: CreateOrderDto,
    idempotencyKeyHeader?: string,
  ): Promise<OrderDetail> {
    const businessId = this.requireBusinessId(currentUser);
    const createdByUserId = Number(currentUser.userId);
    const source: OrderSource = payload.source ?? OrderSource.POS;
    const idempotencyOperation = ORDER_CREATE_OPERATION;
    const idempotencyChannel = this.mapOrderSourceToCommerceChannel(source);
    const normalizedIdempotencyKey =
      this.normalizeIdempotencyKey(idempotencyKeyHeader);
    const idempotencyHash = normalizedIdempotencyKey
      ? this.buildOrderCreateIdempotencyHash(currentUser, payload)
      : null;

    if (normalizedIdempotencyKey && idempotencyHash) {
      const existingOrder = await this.prisma.order.findFirst({
        where: {
          businessId,
          idempotencyOperation,
          idempotencyChannel,
          idempotencyKey: normalizedIdempotencyKey,
        },
        select: {
          id: true,
          idempotencyHash: true,
        },
      });

      if (existingOrder) {
        if (
          existingOrder.idempotencyHash &&
          existingOrder.idempotencyHash !== idempotencyHash
        ) {
          throw new BadRequestException(
            'Bu Idempotency-Key farkli bir siparis istegiyle kullanildi.',
          );
        }

        return this.findOne(currentUser, existingOrder.id);
      }
    }

    const resolvedCustomerId = await this.resolveCustomerIdForCreate(
      currentUser,
      businessId,
      createdByUserId,
      payload,
    );
    const sellerId = await this.resolveSellerIdForCreate(currentUser, payload);

    if (currentUser.role === 'USER') {
      if (source !== OrderSource.POS) {
        throw new ForbiddenException('USER sadece POS siparisi olusturabilir');
      }
      await this.assertUserPermission(currentUser, 'pos.sales', sellerId);
    }

    const defaultStatusKey =
      (await this.settingsService.getJson<string>(
        businessId,
        ORDER_DEFAULT_STATUS_KEY,
      )) ?? 'CREATED';

    const status = await this.prisma.orderStatus.findFirst({
      where: {
        businessId,
        key: defaultStatusKey,
      },
      select: { id: true, key: true },
    });

    if (!status) {
      throw new NotFoundException('Default order status not configured');
    }

    const commissionRate =
      await this.getCommissionRateForOrderCreate(businessId);
    const commissionRateBps = Math.max(0, Math.round(commissionRate * 10_000));
    const resolvedRuleConfig = await this.resolveOrderRuleConfig({
      businessId,
      sellerId,
      source,
      fallbackCommissionRateBps: commissionRateBps,
    });

    if (!payload.items || payload.items.length === 0) {
      throw new NotFoundException('Order items are required');
    }

    const configuredTaxRateBps = await this.settingsService.getJson<number>(
      businessId,
      'order.defaultTaxRateBps',
    );
    const taxRateBpsRaw = Number(configuredTaxRateBps ?? 0);
    const taxRateBps =
      Number.isFinite(taxRateBpsRaw) && taxRateBpsRaw > 0
        ? Math.floor(taxRateBpsRaw)
        : 0;
    const normalizedCouponCode =
      typeof payload.couponCode === 'string' &&
      payload.couponCode.trim().length > 0
        ? payload.couponCode.trim().toUpperCase()
        : null;
    const storeContext = await this.storeContextPort.resolveStoreContext({
      businessId,
    });
    const checkoutLines: CheckoutLineInput[] = payload.items.map((item) => ({
      productId: item.productId,
      variantId:
        typeof item.variantId === 'number' ? Number(item.variantId) : null,
      quantity: item.quantity,
    }));
    const initialSnapshot = await this.catalogReadPort.getCheckoutSnapshot({
      businessId,
      lines: checkoutLines,
      sellerId,
    });
    this.inventoryPort.assertAvailability(initialSnapshot, checkoutLines);

    const isCreditPosSale =
      source === OrderSource.POS &&
      payload.paymentMode === OrderPaymentMode.CREDIT;

    if (isCreditPosSale) {
      const creditCustomer = await this.prisma.customer.findFirst({
        where: {
          id: resolvedCustomerId,
          businessId,
          deletedAt: null,
        },
        select: {
          id: true,
          phone: true,
        },
      });
      if (
        !creditCustomer ||
        creditCustomer.phone === POS_GUEST_CUSTOMER_PHONE
      ) {
        throw new BadRequestException(
          'Veresiye satis icin musteri secimi zorunlu',
        );
      }
      if (typeof sellerId !== 'number') {
        throw new BadRequestException(
          'Veresiye satis icin seller kapsami zorunlu',
        );
      }
    }

    let result: {
      order: {
        id: number;
        customerId: number;
        storeId: number | null;
        totalAmountCents: number;
        lifecycleState: OrderLifecycleState;
        source: OrderSource;
        createdByUserId: number;
        createdAt: Date;
        notes?: string | null;
        shipmentCarrier?: string | null;
        shipmentTrackingNumber?: string | null;
        priceMismatch?: boolean;
      };
      items: OrderDetail['items'];
      creditLimitWarned?: boolean;
    };

    try {
      result = await this.prisma.$transaction(async (tx) => {
        const lockedSnapshot = await this.catalogReadPort.lockCheckoutSnapshot(
          tx,
          {
            businessId,
            lines: checkoutLines,
            sellerId,
          },
        );
        this.inventoryPort.assertAvailability(lockedSnapshot, checkoutLines);

        const priceMismatches: Array<{
          productId: number;
          variantId: number | null;
          expectedUnitPriceCents: number;
          actualUnitPriceCents: number;
          deltaCents: number;
        }> = [];
        const pricingLines = payload.items.map((item) => {
          const product = lockedSnapshot.products.get(item.productId);
          if (!product) {
            throw new NotFoundException(`Product not found: ${item.productId}`);
          }
          if (
            typeof sellerId === 'number' &&
            Number(product.ownerSellerId ?? 0) !== sellerId
          ) {
            throw new NotFoundException(`Product not found: ${item.productId}`);
          }

          const variant =
            typeof item.variantId === 'number'
              ? lockedSnapshot.variants.get(item.variantId)
              : undefined;
          if (item.variantId && (!variant || variant.productId !== item.productId)) {
            throw new NotFoundException(
              `Product variant not found: ${item.variantId}`,
            );
          }

          const actualUnitPriceCents = variant
            ? variant.priceCents
            : product.priceCents;

          if (
            typeof item.expectedUnitPriceCents === 'number' &&
            item.expectedUnitPriceCents !== actualUnitPriceCents
          ) {
            if (source === OrderSource.POS) {
              priceMismatches.push({
                productId: item.productId,
                variantId: variant?.id ?? null,
                expectedUnitPriceCents: item.expectedUnitPriceCents,
                actualUnitPriceCents,
                deltaCents: actualUnitPriceCents - item.expectedUnitPriceCents,
              });
            } else {
              throw new BadRequestException(
                variant
                  ? `Sepetteki fiyat güncellendi: "${product.name} / ${variant.name}". Lütfen sepeti yenileyin.`
                  : `Sepetteki fiyat güncellendi: "${product.name}". Lütfen sepeti yenileyin.`,
              );
            }
          }

          return {
            productId: item.productId,
            variantId: variant?.id ?? null,
            categoryId: product.categoryId,
            productName: product.name,
            quantity: item.quantity,
            unitPriceCents: actualUnitPriceCents,
            costSnapshotCents: Math.max(
              Math.trunc(Number(product.costPriceCents ?? 0)),
              0,
            ),
            discountAmountCents: Number(item.discountAmountCents ?? 0),
            taxRateBps,
          };
        });

        const hasPriceMismatch = priceMismatches.length > 0;
        const priceMismatchMetaJson: Prisma.InputJsonValue | undefined =
          hasPriceMismatch
            ? ({
                policy: 'ACCEPT_AND_FLAG',
                channel: source,
                items: priceMismatches,
              } as Prisma.InputJsonValue)
            : undefined;
        const baseSubtotalAmountCents = pricingLines.reduce((acc, line) => {
          const lineGross = line.unitPriceCents * line.quantity;
          const requestedLineDiscount = Number(line.discountAmountCents ?? 0);
          const lineDiscount = Math.min(Math.max(requestedLineDiscount, 0), lineGross);
          return acc + (lineGross - lineDiscount);
        }, 0);
        const requestedCartDiscountAmount = Number(
          payload.cartDiscountAmountCents ?? 0,
        );
        const cartDiscountAmountCents = Math.min(
          Math.max(requestedCartDiscountAmount, 0),
          baseSubtotalAmountCents,
        );

        let couponToConsume: { id: number; code: string } | null = null;
        let couponDiscountAmountCents = 0;
        if (normalizedCouponCode) {
          const rows = await tx.$queryRaw<
            Array<{
              id: number;
              code: string;
              type: string;
              value: number;
              usageLimit: number | null;
              usedCount: number;
              minOrderAmountCents: number | null;
              maxDiscountCents: number | null;
              startsAt: Date | null;
              endsAt: Date | null;
              isActive: boolean;
            }>
          >`
          SELECT id, code, type, value, "usageLimit", "usedCount", "minOrderAmountCents", "maxDiscountCents", "startsAt", "endsAt", "isActive"
          FROM "Coupon"
          WHERE "businessId" = ${businessId}
            AND code = ${normalizedCouponCode}
          FOR UPDATE NOWAIT
        `;

          const coupon = rows[0];
          if (!coupon || !coupon.isActive) {
            throw new BadRequestException('Kupon geçersiz veya pasif.');
          }

          const now = new Date();
          if (coupon.startsAt && now < new Date(coupon.startsAt)) {
            throw new BadRequestException('Kupon henüz aktif değil.');
          }
          if (coupon.endsAt && now > new Date(coupon.endsAt)) {
            throw new BadRequestException('Kupon süresi dolmuş.');
          }
          if (
            coupon.usageLimit !== null &&
            coupon.usageLimit !== undefined &&
            coupon.usedCount >= coupon.usageLimit
          ) {
            throw new BadRequestException('Kupon kullanım limiti dolmuş.');
          }
          if (
            coupon.minOrderAmountCents !== null &&
            coupon.minOrderAmountCents !== undefined &&
            baseSubtotalAmountCents < coupon.minOrderAmountCents
          ) {
            throw new BadRequestException(
              'Kupon minimum sepet tutarı sağlanmadı.',
            );
          }

          if (String(coupon.type).toUpperCase() === 'PERCENT') {
            couponDiscountAmountCents = Math.round(
              (baseSubtotalAmountCents * Number(coupon.value)) / 10_000,
            );
          } else {
            couponDiscountAmountCents = Number(coupon.value);
          }

          if (
            coupon.maxDiscountCents !== null &&
            coupon.maxDiscountCents !== undefined &&
            couponDiscountAmountCents > coupon.maxDiscountCents
          ) {
            couponDiscountAmountCents = coupon.maxDiscountCents;
          }

          if (couponDiscountAmountCents < 0) {
            couponDiscountAmountCents = 0;
          }
          couponToConsume = { id: coupon.id, code: coupon.code };
        }
        const pricing = this.pricingPort.calculateOrderPricing({
          channel:
            source === OrderSource.POS
              ? 'POS'
              : source === OrderSource.API
                ? 'MANUAL'
                : 'MARKETPLACE',
          businessId,
          sellerId,
          currency: 'TRY',
          lines: pricingLines,
          cartDiscountAmountCents,
          couponDiscountAmountCents,
          couponCode: couponToConsume?.code ?? null,
          shippingCostCents: Number(payload.shippingCostCents ?? 0),
          commissionPolicy: resolvedRuleConfig.commissionPolicy,
          calculationProfileId: resolvedRuleConfig.calculationProfileId,
          taxInclusive: false,
          breakdownContext: {
            source: 'phase1-order-create',
            commissionProfileCode: resolvedRuleConfig.commissionProfileCode,
            taxProfileCode: resolvedRuleConfig.taxProfileCode,
            couponCode: couponToConsume?.code ?? null,
            couponDiscountAmountCents,
            ruleResolutionSource: resolvedRuleConfig.source,
          },
        });
        await this.inventoryPort.decrementStock(
          tx,
          lockedSnapshot,
          checkoutLines,
          'sale',
        );
        const lifecycleState =
          this.orderLifecyclePolicy.resolveFromStatusKey(status.key);

        const order = await tx.order.create({
          data: {
            businessId,
            customerId: resolvedCustomerId,
            createdByUserId,
            storeId: storeContext.storeId,
            sellerId: sellerId ?? null,
            statusId: status.id,
            lifecycleState,
            subtotalAmountCents: pricing.subtotalAmountCents,
            taxAmountCents: pricing.taxAmountCents,
            taxRateBps,
            discountAmountCents: pricing.discountAmountCents,
            couponCode: couponToConsume?.code ?? null,
            totalAmountCents: pricing.totalAmountCents,
            shippingCostCents: pricing.shippingCostCents,
            commissionSnapshotCents: pricing.commissionSnapshotCents,
            platformRevenueCents: pricing.platformRevenueCents,
            sellerPayoutCents: pricing.sellerPayoutCents,
            currency: 'TRY',
            calculationProfileId: resolvedRuleConfig.calculationProfileId,
            calculationVersion: pricing.calculationVersion,
            breakdownJson: pricing.breakdownJson as Prisma.InputJsonValue,
            priceMismatch: hasPriceMismatch,
            priceMismatchMetaJson,
            countryCode: 'TR',
            taxProfileCode: resolvedRuleConfig.taxProfileCode,
            commissionProfileCode: resolvedRuleConfig.commissionProfileCode,
            source,
            notes: payload.notes ?? null,
            idempotencyKey: normalizedIdempotencyKey,
            idempotencyOperation: normalizedIdempotencyKey
              ? idempotencyOperation
              : null,
            idempotencyChannel: normalizedIdempotencyKey
              ? idempotencyChannel
              : null,
            idempotencyHash,
          },
          select: {
            id: true,
            customerId: true,
            storeId: true,
            totalAmountCents: true,
            lifecycleState: true,
            source: true,
            createdByUserId: true,
            createdAt: true,
            notes: true,
            shipmentCarrier: true,
            shipmentTrackingNumber: true,
            priceMismatch: true,
          },
        });

        await tx.orderItem.createMany({
          data: pricing.lines.map((line) => ({
            businessId,
            orderId: order.id,
            productId: line.productId,
            variantId: line.variantId,
            productName: line.productName,
            quantity: line.quantity,
            unitPriceCents: line.unitPriceCents,
            subtotalAmountCents: line.subtotalAmountCents,
            taxAmountCents: line.taxAmountCents,
            taxRateBps: line.taxRateBps,
            totalAmountCents: line.totalAmountCents,
            costSnapshotCents: line.costSnapshotCents,
          })),
        });

        if (couponToConsume) {
          await tx.coupon.update({
            where: { id: couponToConsume.id },
            data: { usedCount: { increment: 1 } },
          });
        }

        await this.ledgerPostingService.postOrderSaleSnapshot(
          {
            businessId,
            orderId: order.id,
            sellerId: sellerId ?? null,
            currency: 'TRY',
            totalAmountCents: order.totalAmountCents,
            sellerPayoutCents: pricing.sellerPayoutCents,
            platformRevenueCents: pricing.platformRevenueCents,
            metadata: {
              source,
              calculationVersion: pricing.calculationVersion,
              calculationProfileId: resolvedRuleConfig.calculationProfileId,
            },
          },
          tx,
        );

        let creditLimitWarned = false;
        if (isCreditPosSale && typeof sellerId === 'number') {
          const creditCustomer = await tx.customer.findFirst({
            where: {
              id: resolvedCustomerId,
              businessId,
              deletedAt: null,
            },
            select: {
              id: true,
              phone: true,
              creditLimitCents: true,
              creditBlockPolicy: true,
            },
          });
          if (
            !creditCustomer ||
            creditCustomer.phone === POS_GUEST_CUSTOMER_PHONE
          ) {
            throw new BadRequestException(
              'Veresiye satis icin musteri secimi zorunlu',
            );
          }

          const currentDebt = await this.getCustomerDebtCents({
            tx,
            businessId,
            sellerId,
            customerId: resolvedCustomerId,
          });
          const projectedDebt = currentDebt + pricing.totalAmountCents;
          if (
            typeof creditCustomer.creditLimitCents === 'number' &&
            creditCustomer.creditLimitCents >= 0 &&
            projectedDebt > creditCustomer.creditLimitCents
          ) {
            if (
              creditCustomer.creditBlockPolicy === 'WARN' ||
              creditCustomer.creditBlockPolicy === 'BLOCK'
            ) {
              creditLimitWarned = true;
            }
          }
        }

        const items = await tx.orderItem.findMany({
          where: { businessId, orderId: order.id },
          select: {
            id: true,
            productId: true,
            variantId: true,
            productName: true,
            quantity: true,
            unitPriceCents: true,
            totalAmountCents: true,
          },
        });

        if (isCreditPosSale && typeof sellerId === 'number') {
          await this.createCustomerLedgerEntry({
            tx,
            businessId,
            sellerId,
            customerId: resolvedCustomerId,
            orderId: order.id,
            type: 'DEBIT',
            sourceType: 'SALE_DEBIT',
            amountCents: order.totalAmountCents,
            createdByUserId,
          });
        }

        return { order, items, creditLimitWarned };
      });
    } catch (error) {
      if (
        normalizedIdempotencyKey &&
        idempotencyHash &&
        this.isPrismaUniqueConstraintError(error)
      ) {
        const existingOrder = await this.prisma.order.findFirst({
          where: {
            businessId,
            idempotencyOperation,
            idempotencyChannel,
            idempotencyKey: normalizedIdempotencyKey,
          },
          select: {
            id: true,
            idempotencyHash: true,
          },
        });

        if (existingOrder) {
          if (
            existingOrder.idempotencyHash &&
            existingOrder.idempotencyHash !== idempotencyHash
          ) {
            throw new BadRequestException(
              'Bu Idempotency-Key farkli bir siparis istegiyle kullanildi.',
            );
          }

          return this.findOne(currentUser, existingOrder.id);
        }
      }

      throw error;
    }

    const createdOrderDetail: OrderDetail = {
      id: result.order.id,
      customerId: result.order.customerId,
      storeId: result.order.storeId,
      totalAmountCents: result.order.totalAmountCents,
      lifecycleState: result.order.lifecycleState,
      statusKey: status.key,
      source,
      createdByUserId: result.order.createdByUserId,
      createdAt: result.order.createdAt,
      sellerId: sellerId ?? null,
      currency: 'TRY',
      notes: result.order.notes ?? undefined,
      shipmentCarrier: result.order.shipmentCarrier ?? undefined,
      shipmentTrackingNumber: result.order.shipmentTrackingNumber ?? undefined,
      items: result.items,
      creditLimitWarned: Boolean(result.creditLimitWarned),
      priceMismatch: Boolean(result.order.priceMismatch),
    };

    void this.sendOrderCreatedNotification(
      businessId,
      createdOrderDetail.id,
      createdOrderDetail.totalAmountCents,
    );

    await this.outboxService.enqueueEvent({
      businessId,
      aggregateType: 'ORDER',
      aggregateId: createdOrderDetail.id,
      eventType: OUTBOX_EVENT_TYPES.ORDER_CREATED,
      idempotencyKey: `order:${createdOrderDetail.id}`,
      payloadJson: {
        orderId: createdOrderDetail.id,
        customerId: createdOrderDetail.customerId,
        sellerId: sellerId ?? null,
        storeId: createdOrderDetail.storeId ?? null,
        totalAmountCents: createdOrderDetail.totalAmountCents,
        lifecycleState: createdOrderDetail.lifecycleState ?? null,
        priceMismatch: Boolean(createdOrderDetail.priceMismatch),
        source: createdOrderDetail.source,
        createdByUserId: createdOrderDetail.createdByUserId,
      },
    });

    const hydratedOrder = await this.findOne(
      currentUser,
      createdOrderDetail.id,
    );
    hydratedOrder.creditLimitWarned = Boolean(result.creditLimitWarned);
    return hydratedOrder;
  }

  async findAll(currentUser: JwtPayload): Promise<OrderSummary[]> {
    const businessId = this.requireBusinessId(currentUser);

    if (currentUser.role === 'CUSTOMER') {
      const customerId = await this.resolveCustomerIdForUser(
        currentUser,
        businessId,
      );
      if (!customerId) {
        return [];
      }

      const orders = await this.prisma.order.findMany({
        where: {
          businessId,
          customerId,
          deletedAt: null,
        },
        select: {
          id: true,
          customerId: true,
          sellerId: true,
          storeId: true,
          totalAmountCents: true,
          currency: true,
          commissionSnapshotCents: true,
          sellerPayoutCents: true,
          priceMismatch: true,
          lifecycleState: true,
          source: true,
          createdByUserId: true,
          createdAt: true,
          status: {
            select: {
              key: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return orders.map((o) => this.mapOrderSummaryRow(o));
    }

    const where = await this.buildOrderReadScopeWhere(currentUser);

    const orders = await this.prisma.order.findMany({
      where,
      select: {
        id: true,
        customerId: true,
        sellerId: true,
        storeId: true,
        totalAmountCents: true,
        currency: true,
        commissionSnapshotCents: true,
        sellerPayoutCents: true,
        priceMismatch: true,
        lifecycleState: true,
        source: true,
        createdByUserId: true,
        createdAt: true,
        status: {
          select: {
            key: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return orders.map((o) => this.mapOrderSummaryRow(o));
  }

  private async findAccessibleOrder(currentUser: JwtPayload, id: number) {
    const businessId = this.requireBusinessId(currentUser);
    const userId = Number(currentUser.userId);

    const order = await this.prisma.order.findFirst({
      where: {
        id,
        businessId,
        deletedAt: null,
      },
      include: {
        status: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (currentUser.role === 'USER') {
      const sellerIds = await this.resolveUserTeamSellerIds(businessId, userId);
      if (
        !sellerIds.length ||
        !sellerIds.includes(Number(order.sellerId ?? 0))
      ) {
        throw new ForbiddenException('Access denied');
      }
      await this.assertUserPermission(
        currentUser,
        'pos.orders',
        Number(order.sellerId ?? 0),
      );
    }

    if (currentUser.role === 'SELLER') {
      const sellerId = await this.resolveSellerProfileId(businessId, userId);
      if (!sellerId || Number(order.sellerId ?? 0) !== sellerId) {
        throw new ForbiddenException('Access denied');
      }
    }

    if (currentUser.role === 'CUSTOMER') {
      const customerId = await this.resolveCustomerIdForUser(
        currentUser,
        businessId,
      );
      if (!customerId || order.customerId !== customerId) {
        throw new ForbiddenException('Access denied');
      }
    }

    return order;
  }

  async findOneCustomer(
    currentUser: JwtPayload,
    id: number,
  ): Promise<OrderDetail> {
    if (currentUser.role !== 'CUSTOMER') {
      throw new ForbiddenException('Access denied');
    }
    return this.findOne(currentUser, id);
  }

  private async setCustomerOrderStatus(
    currentUser: JwtPayload,
    id: number,
    nextStatusKey: string,
  ) {
    if (currentUser.role !== 'CUSTOMER') {
      throw new ForbiddenException('Access denied');
    }

    const order = await this.findAccessibleOrder(currentUser, id);

    if (order.status?.isFinal) {
      throw new ForbiddenException('Order can not be updated');
    }

    const status = await this.prisma.orderStatus.findFirst({
      where: {
        businessId: order.businessId,
        key: nextStatusKey,
      },
      select: { id: true },
    });

    if (!status) {
      throw new NotFoundException('Order status not found');
    }

    this.orderLifecyclePolicy.assertStatusTransitionAllowed({
      fromStatusKey: order.status?.key,
      fromIsFinal: order.status?.isFinal,
      toStatusKey: nextStatusKey,
    });

    const nextLifecycleState =
      this.orderLifecyclePolicy.resolveFromStatusKey(nextStatusKey);
    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        statusId: status.id,
        lifecycleState: nextLifecycleState,
      },
      include: { status: true },
    });

    void this.sendOrderStatusChangedNotification(
      updated.businessId,
      updated.id,
      order.status.key,
      updated.status.key,
    );
    await this.emitOrderStatusEvent({
      businessId: updated.businessId,
      orderId: updated.id,
      storeId: updated.storeId ?? null,
      fromStatusKey: order.status.key,
      toStatusKey: updated.status.key,
      lifecycleState: updated.lifecycleState,
      isCancelled: updated.lifecycleState === OrderLifecycleState.CANCELLED,
    });

    return this.findOne(currentUser, updated.id);
  }

  async requestCancelCustomerOrder(currentUser: JwtPayload, id: number) {
    return this.setCustomerOrderStatus(currentUser, id, 'CANCELLED');
  }

  async requestReturnCustomerOrder(
    currentUser: JwtPayload,
    id: number,
    reason?: string,
  ) {
    if (currentUser.role !== 'CUSTOMER') {
      throw new ForbiddenException('Access denied');
    }

    const order = await this.findAccessibleOrder(currentUser, id);

    const returnRequestedStatus = await this.prisma.orderStatus.findFirst({
      where: {
        businessId: order.businessId,
        key: 'RETURN_REQUESTED',
      },
      select: { id: true },
    });

    if (!returnRequestedStatus) {
      throw new NotFoundException('Order status not found: RETURN_REQUESTED');
    }

    this.orderLifecyclePolicy.assertStatusTransitionAllowed({
      fromStatusKey: order.status?.key,
      fromIsFinal: order.status?.isFinal,
      toStatusKey: 'RETURN_REQUESTED',
    });

    const existing = await (this.prisma as any).returnRequest.findFirst({
      where: {
        businessId: order.businessId,
        orderId: order.id,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (existing && String(existing.status).toUpperCase() === 'PENDING') {
      throw new BadRequestException(
        'Bu sipariş için aktif iade talebi zaten var.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          statusId: returnRequestedStatus.id,
          lifecycleState: OrderLifecycleState.REFUND_PENDING,
        },
      });

      if (existing) {
        await tx.returnRequest.update({
          where: { id: existing.id },
          data: {
            status: 'PENDING',
            reason: reason ?? null,
            responseNote: null,
            requestedAt: new Date(),
            decidedAt: null,
            decidedByUserId: null,
          },
        });
      } else {
        await tx.returnRequest.create({
          data: {
            businessId: order.businessId,
            orderId: order.id,
            customerId: order.customerId,
            status: 'PENDING',
            reason: reason ?? null,
          },
        });
      }
    });

    void this.sendOrderStatusChangedNotification(
      order.businessId,
      order.id,
      order.status.key,
      'RETURN_REQUESTED',
    );
    await this.emitOrderStatusEvent({
      businessId: order.businessId,
      orderId: order.id,
      storeId: order.storeId ?? null,
      fromStatusKey: order.status.key,
      toStatusKey: 'RETURN_REQUESTED',
      lifecycleState: OrderLifecycleState.REFUND_PENDING,
    });

    return this.findOne(currentUser, id);
  }

  async listReturnRequests(
    currentUser: JwtPayload,
    params?: { status?: string },
  ): Promise<ReturnRequestSummary[]> {
    if (
      currentUser.role !== 'ADMIN' &&
      currentUser.role !== 'SUPER_ADMIN' &&
      currentUser.role !== 'USER'
    ) {
      throw new ForbiddenException('Access denied');
    }

    const businessId = this.requireBusinessId(currentUser);
    if (currentUser.role === 'USER') {
      await this.assertUserPermission(currentUser, 'pos.orders');
    }
    const status = (params?.status ?? '').trim().toUpperCase();

    const rows = await (this.prisma as any).returnRequest.findMany({
      where: {
        businessId,
        ...(status.length > 0 ? { status } : {}),
      },
      orderBy: { requestedAt: 'desc' },
      select: {
        id: true,
        orderId: true,
        customerId: true,
        status: true,
        reason: true,
        responseNote: true,
        requestedAt: true,
        decidedAt: true,
        decidedByUserId: true,
      },
    });

    return rows as ReturnRequestSummary[];
  }

  async resolveReturnRequest(
    currentUser: JwtPayload,
    requestId: number,
    payload: ResolveReturnRequestDto,
  ): Promise<ReturnRequestSummary> {
    if (
      currentUser.role !== 'ADMIN' &&
      currentUser.role !== 'SUPER_ADMIN' &&
      currentUser.role !== 'USER'
    ) {
      throw new ForbiddenException('Access denied');
    }

    const businessId = this.requireBusinessId(currentUser);
    const decidedByUserId = Number(currentUser.userId);

    const request = await (this.prisma as any).returnRequest.findFirst({
      where: {
        id: requestId,
        businessId,
      },
      select: {
        id: true,
        businessId: true,
        orderId: true,
        status: true,
        order: {
          select: {
            id: true,
            sellerId: true,
            customerId: true,
            storeId: true,
            lifecycleState: true,
            totalAmountCents: true,
            sellerPayoutCents: true,
            platformRevenueCents: true,
            currency: true,
            payoutReleasedAt: true,
            status: {
              select: {
                key: true,
                isFinal: true,
              },
            },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Return request not found');
    }

    if (currentUser.role === 'USER') {
      await this.assertUserPermission(
        currentUser,
        'pos.orders',
        Number(request.order?.sellerId ?? 0),
      );
    }

    if (String(request.status).toUpperCase() !== 'PENDING') {
      throw new BadRequestException('Return request already resolved');
    }

    const isApprove = payload.action === ResolveReturnRequestAction.APPROVE;
    const nextReturnStatus = isApprove ? 'APPROVED' : 'REJECTED';
    const note = payload.note ?? null;

    const targetOrderStatusKeys = isApprove
      ? ['RETURNED', 'CANCELLED']
      : ['RETURN_REJECTED', 'DELIVERED', 'COMPLETED'];

    const statusRows = await this.prisma.orderStatus.findMany({
      where: {
        businessId,
        key: { in: targetOrderStatusKeys },
      },
      select: { id: true, key: true },
    });
    const statusMap = new Map(statusRows.map((s) => [s.key, s.id]));
    const nextOrderStatusKey =
      targetOrderStatusKeys.find((key) => statusMap.has(key)) ?? null;

    if (nextOrderStatusKey) {
      this.orderLifecyclePolicy.assertStatusTransitionAllowed({
        fromStatusKey: request.order?.status?.key,
        fromIsFinal: request.order?.status?.isFinal,
        toStatusKey: nextOrderStatusKey,
      });
    }

    let resolvedLifecycleState =
      request.order?.lifecycleState ?? OrderLifecycleState.PENDING;

    const resolved = await this.prisma.$transaction(async (tx) => {
      if (isApprove) {
        const items: Array<{
          productId: number;
          variantId?: number | null;
          quantity: number;
        }> = await tx.orderItem.findMany({
          where: { orderId: request.orderId },
          select: { productId: true, variantId: true, quantity: true },
        });
        await this.inventoryPort.incrementStock(tx, items, 'refund');

        if (typeof request.order?.sellerId === 'number') {
          const debitAggregate = await tx.customerLedgerEntry.aggregate({
            where: {
              businessId,
              sellerId: request.order.sellerId,
              orderId: request.orderId,
              type: 'DEBIT',
            },
            _sum: { amountCents: true },
          });
          const creditAggregate = await tx.customerLedgerEntry.aggregate({
            where: {
              businessId,
              sellerId: request.order.sellerId,
              orderId: request.orderId,
              type: 'CREDIT',
            },
            _sum: { amountCents: true },
          });
          const totalDebit = Number(debitAggregate?._sum?.amountCents ?? 0);
          const totalCredit = Number(creditAggregate?._sum?.amountCents ?? 0);
          const outstanding = Math.max(totalDebit - totalCredit, 0);
          if (outstanding > 0) {
            await this.createCustomerLedgerEntry({
              tx,
              businessId,
              sellerId: request.order.sellerId,
              customerId: request.order.customerId,
              orderId: request.orderId,
              type: 'CREDIT',
              sourceType: 'RETURN_REVERSAL',
              amountCents: outstanding,
              createdByUserId: decidedByUserId,
            });
          }
        }

        if (request.order) {
          await this.ledgerPostingService.postOrderRefund(
            {
              businessId,
              orderId: request.order.id,
              sellerId: request.order.sellerId ?? null,
              currency: request.order.currency || 'TRY',
              totalAmountCents: request.order.totalAmountCents,
              sellerPayoutCents: request.order.sellerPayoutCents,
              platformRevenueCents: request.order.platformRevenueCents,
              metadata: {
                refundPolicy: 'MODEL_A_COMMISSION_REVERSED',
                payoutReleasedAt:
                  request.order.payoutReleasedAt?.toISOString() ?? null,
                resolvedByUserId: decidedByUserId,
              },
            },
            tx,
          );
        }
      }

      const orderStatusId =
        statusMap.get(targetOrderStatusKeys[0]) ??
        statusMap.get(targetOrderStatusKeys[1]) ??
        statusMap.get(targetOrderStatusKeys[2]);

      const nextLifecycleState = isApprove
        ? this.orderLifecyclePolicy.resolveAfterRefund({
            currentState:
              request.order?.lifecycleState ?? OrderLifecycleState.PAID,
            totalAmountCents: Number(request.order?.totalAmountCents ?? 0),
            refundedAmountCents: Number(request.order?.totalAmountCents ?? 0),
            approved: true,
          })
        : this.orderLifecyclePolicy.resolveFromStatusKey(
            nextOrderStatusKey ?? request.order?.status?.key,
          );
      resolvedLifecycleState = nextLifecycleState;

      if (orderStatusId) {
        await tx.order.update({
          where: { id: request.orderId },
          data: {
            statusId: orderStatusId,
            lifecycleState: nextLifecycleState,
          },
        });
      }

      await tx.returnRequest.update({
        where: { id: request.id },
        data: {
          status: nextReturnStatus,
          responseNote: note,
          decidedAt: new Date(),
          decidedByUserId,
        },
      });

      return tx.returnRequest.findFirst({
        where: { id: request.id },
        select: {
          id: true,
          orderId: true,
          customerId: true,
          status: true,
          reason: true,
          responseNote: true,
          requestedAt: true,
          decidedAt: true,
          decidedByUserId: true,
        },
      });
    });

    if (nextOrderStatusKey) {
      void this.sendOrderStatusChangedNotification(
        businessId,
        request.orderId,
        request.order?.status?.key ?? '',
        nextOrderStatusKey,
      );
      await this.emitOrderStatusEvent({
        businessId,
        orderId: request.orderId,
        storeId: request.order?.storeId ?? null,
        fromStatusKey: request.order?.status?.key ?? null,
        toStatusKey: nextOrderStatusKey,
        lifecycleState: resolvedLifecycleState,
      });
    }

    return resolved as ReturnRequestSummary;
  }

  async findOne(currentUser: JwtPayload, id: number): Promise<OrderDetail> {
    const order = await this.findAccessibleOrder(currentUser, id);
    const [items, ledgerEntries, auditLogs] = await Promise.all([
      (this.prisma as any).orderItem.findMany({
        where: {
          businessId: order.businessId,
          orderId: order.id,
        },
        select: {
          id: true,
          productId: true,
          variantId: true,
          productName: true,
          quantity: true,
          unitPriceCents: true,
          totalAmountCents: true,
        },
      }),
      this.listOrderLedgerEntries({
        businessId: order.businessId,
        orderId: order.id,
      }),
      this.listOrderAuditLogs({
        businessId: order.businessId,
        orderId: order.id,
      }),
    ]);

    return {
      id: order.id,
      customerId: order.customerId,
      sellerId: order.sellerId ?? null,
      storeId: order.storeId ?? null,
      totalAmountCents: order.totalAmountCents,
      currency: order.currency,
      commissionAmountCents: order.commissionSnapshotCents,
      sellerNetAmountCents: order.sellerPayoutCents,
      priceMismatch: Boolean(order.priceMismatch),
      lifecycleState: order.lifecycleState,
      statusKey: order.status.key,
      source: order.source,
      createdByUserId: order.createdByUserId,
      createdAt: order.createdAt,
      subtotalAmountCents: order.subtotalAmountCents,
      discountAmountCents: order.discountAmountCents,
      taxAmountCents: order.taxAmountCents,
      platformRevenueCents: order.platformRevenueCents,
      calculationProfileId: order.calculationProfileId,
      calculationVersion: order.calculationVersion,
      breakdownJson: order.breakdownJson ?? undefined,
      priceMismatchMetaJson: order.priceMismatchMetaJson ?? undefined,
      notes: order.notes ?? undefined,
      shipmentCarrier: (order as any).shipmentCarrier ?? undefined,
      shipmentTrackingNumber:
        (order as any).shipmentTrackingNumber ?? undefined,
      items,
      ledgerEntries,
      auditLogs,
    };
  }

  private isCancelledStatus(statusKey?: string): boolean {
    return statusKey?.toUpperCase().includes('CANCEL') ?? false;
  }

  async update(
    currentUser: JwtPayload,
    id: number,
    payload: UpdateOrderDto,
  ): Promise<OrderDetail> {
    const order = await this.findAccessibleOrder(currentUser, id);
    if (currentUser.role === 'USER') {
      await this.assertUserPermission(
        currentUser,
        'pos.orders',
        Number(order.sellerId ?? 0),
      );
    }
    const wasCancelled = this.isCancelledStatus(order.status?.key);
    const wasFinal = Boolean(order.status?.isFinal);

    const data: Partial<{
      notes: string | null;
      statusId: number;
      shipmentCarrier: string | null;
      shipmentTrackingNumber: string | null;
    }> = {};

    if (payload.notes !== undefined) {
      data.notes = payload.notes;
    }
    if (payload.shipmentCarrier !== undefined) {
      data.shipmentCarrier = payload.shipmentCarrier?.trim() || null;
    }
    if (payload.shipmentTrackingNumber !== undefined) {
      data.shipmentTrackingNumber =
        payload.shipmentTrackingNumber?.trim() || null;
    }

    let newStatusKey: string | undefined;

    if (payload.statusKey) {
      const status = await this.prisma.orderStatus.findFirst({
        where: {
          businessId: order.businessId,
          key: payload.statusKey,
        },
        select: { id: true, key: true },
      });
      if (!status) {
        throw new NotFoundException('Order status not found');
      }
      data.statusId = status.id;
      newStatusKey = status.key;
    }

    if (newStatusKey) {
      this.orderLifecyclePolicy.assertStatusTransitionAllowed({
        fromStatusKey: order.status?.key,
        fromIsFinal: order.status?.isFinal,
        toStatusKey: newStatusKey,
      });
    }

    const isCancellingNow =
      newStatusKey && this.isCancelledStatus(newStatusKey);

    // Use transaction to ensure stock restoration is atomic with status update
    const result = await this.prisma.$transaction(async (tx) => {
      const nextLifecycleState = newStatusKey
        ? this.orderLifecyclePolicy.resolveFromStatusKey(newStatusKey)
        : order.lifecycleState;
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          ...data,
          lifecycleState: nextLifecycleState,
        },
        include: {
          status: true,
        },
      });

      // Restore stock if transitioning to cancelled status (and wasn't already cancelled)
      if (isCancellingNow && !wasCancelled) {
        const items: Array<{
          productId: number;
          variantId?: number | null;
          quantity: number;
        }> = await tx.orderItem.findMany({
          where: { orderId: updated.id },
          select: { productId: true, variantId: true, quantity: true },
        });
        await this.inventoryPort.incrementStock(tx, items, 'cancel');

        if (typeof updated.sellerId === 'number') {
          const debitAggregate = await tx.customerLedgerEntry.aggregate({
            where: {
              businessId: updated.businessId,
              sellerId: updated.sellerId,
              orderId: updated.id,
              type: 'DEBIT',
            },
            _sum: { amountCents: true },
          });
          const creditAggregate = await tx.customerLedgerEntry.aggregate({
            where: {
              businessId: updated.businessId,
              sellerId: updated.sellerId,
              orderId: updated.id,
              type: 'CREDIT',
            },
            _sum: { amountCents: true },
          });
          const totalDebit = Number(debitAggregate?._sum?.amountCents ?? 0);
          const totalCredit = Number(creditAggregate?._sum?.amountCents ?? 0);
          const outstanding = Math.max(totalDebit - totalCredit, 0);
          if (outstanding > 0) {
            await this.createCustomerLedgerEntry({
              tx,
              businessId: updated.businessId,
              sellerId: updated.sellerId,
              customerId: updated.customerId,
              orderId: updated.id,
              type: 'CREDIT',
              sourceType: 'CANCEL_REVERSAL',
              amountCents: outstanding,
              createdByUserId: Number(currentUser.userId),
            });
          }
        }
      }

      return updated;
    });

    const isFinalNow = Boolean(result.status?.isFinal);
    if (!wasFinal && isFinalNow) {
      await this.financeService.ensureCommissionForFinalOrder({
        businessId: result.businessId,
        orderId: result.id,
        beneficiaryUserId: result.createdByUserId,
        grossAmountCents: result.totalAmountCents,
      });
    }

    void this.sendOrderStatusChangedNotification(
      result.businessId,
      result.id,
      order.status.key,
      result.status.key,
    );
    await this.emitOrderStatusEvent({
      businessId: result.businessId,
      orderId: result.id,
      storeId: result.storeId ?? null,
      fromStatusKey: order.status.key,
      toStatusKey: result.status.key,
      lifecycleState: result.lifecycleState,
      isCancelled: result.lifecycleState === OrderLifecycleState.CANCELLED,
    });

    return this.findOne(currentUser, result.id);
  }

  async listPayments(
    currentUser: JwtPayload,
    id: number,
  ): Promise<PaymentSummary[]> {
    const order = await this.findAccessibleOrder(currentUser, id);

    const payments = await this.prisma.payment.findMany({
      where: {
        businessId: order.businessId,
        orderId: order.id,
      },
      select: {
        id: true,
        amountCents: true,
        method: true,
        reference: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return payments.map((p) => ({
      id: p.id,
      amountCents: p.amountCents,
      method: p.method,
      reference: p.reference ?? undefined,
      createdAt: p.createdAt,
    }));
  }

  async addPayment(
    currentUser: JwtPayload,
    id: number,
    payload: CreatePaymentDto,
  ): Promise<PaymentSummary> {
    const order = await this.findAccessibleOrder(currentUser, id);
    if (currentUser.role === 'USER') {
      await this.assertUserPermission(
        currentUser,
        'pos.sales',
        Number(order.sellerId ?? 0),
      );
    }
    const actorUserId = Number(currentUser.userId);

    const amountCents = Number(payload.amount);

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      throw new BadRequestException('Tutar pozitif olmalı');
    }

    const paymentResult = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM "Order" WHERE "id" = ${order.id} FOR UPDATE`;

      const paidNet = await this.getNetPaidAmountCents(
        tx,
        order.businessId,
        order.id,
      );
      const remainingDue = Math.max(order.totalAmountCents - paidNet, 0);

      if (remainingDue <= 0) {
        throw new BadRequestException('Siparisin kalan borcu yok');
      }
      if (amountCents > remainingDue) {
        throw new BadRequestException(
          `Odeme tutari kalan borcu asamaz. Kalan: ${remainingDue}`,
        );
      }

      const recorded = await this.paymentsPort.recordPayment({
        businessId: order.businessId,
        orderId: order.id,
        storeId: order.storeId ?? null,
        sellerId: order.sellerId ?? null,
        createdByUserId: Number.isFinite(actorUserId) ? actorUserId : null,
        amountCents,
        method: payload.method,
        reference: payload.reference ?? null,
        provider: null,
        idempotencyKey: `manual-payment:${order.id}:${payload.method}:${amountCents}`,
        tx,
      });

      const nextLifecycleState = this.orderLifecyclePolicy.resolveAfterPayment({
        currentState: order.lifecycleState,
        totalAmountCents: order.totalAmountCents,
        paidAmountCents: paidNet + amountCents,
      });
      if (nextLifecycleState !== order.lifecycleState) {
        await tx.order.update({
          where: { id: order.id },
          data: { lifecycleState: nextLifecycleState },
        });
      }

      return {
        payment: recorded.payment,
        transactionId: recorded.transactionId,
        lifecycleState: nextLifecycleState,
      };
    });

    if (typeof order.sellerId === 'number') {
      const debitAggregate = await this.prisma.customerLedgerEntry.aggregate({
        where: {
          businessId: order.businessId,
          orderId: order.id,
          sellerId: order.sellerId,
          type: 'DEBIT',
        },
        _sum: { amountCents: true },
      });
      const totalDebit = Number(debitAggregate._sum.amountCents ?? 0);
      if (totalDebit > 0) {
        const creditAggregate = await this.prisma.customerLedgerEntry.aggregate(
          {
            where: {
              businessId: order.businessId,
              orderId: order.id,
              sellerId: order.sellerId,
              type: 'CREDIT',
            },
            _sum: { amountCents: true },
          },
        );
        const totalCredit = Number(creditAggregate._sum.amountCents ?? 0);
        const remainingDebt = Math.max(totalDebit - totalCredit, 0);
        const creditAmount = Math.min(
          remainingDebt,
          paymentResult.payment.amountCents,
        );
        if (creditAmount > 0) {
          await this.createCustomerLedgerEntry({
            tx: this.prisma,
            businessId: order.businessId,
            sellerId: order.sellerId,
            customerId: order.customerId,
            orderId: order.id,
            type: 'CREDIT',
            sourceType: 'PAYMENT_CREDIT',
            amountCents: creditAmount,
            createdByUserId: Number.isFinite(actorUserId)
              ? actorUserId
              : undefined,
          });
        }
      }
    }

    const paymentSummary: PaymentSummary = {
      id: paymentResult.payment.id,
      amountCents: paymentResult.payment.amountCents,
      method: paymentResult.payment.method,
      reference: paymentResult.payment.reference ?? undefined,
      createdAt: paymentResult.payment.createdAt,
    };

    void this.sendOrderPaymentNotification(
      order.businessId,
      order.id,
      paymentSummary.amountCents,
      paymentSummary.method,
    );

    await this.outboxService.enqueueEvent({
      businessId: order.businessId,
      aggregateType: 'PAYMENT',
      aggregateId: paymentSummary.id,
      eventType: OUTBOX_EVENT_TYPES.PAYMENT_CAPTURED,
      idempotencyKey: `payment:${paymentSummary.id}`,
      payloadJson: {
        paymentId: paymentSummary.id,
        paymentTransactionId: paymentResult.transactionId,
        orderId: order.id,
        storeId: order.storeId ?? null,
        amountCents: paymentSummary.amountCents,
        method: paymentSummary.method,
        sellerId: order.sellerId ?? null,
        createdByUserId: Number(currentUser.userId),
      },
    });
    await this.outboxService.enqueueEvent({
      businessId: order.businessId,
      aggregateType: 'PAYMENT',
      aggregateId: paymentSummary.id,
      eventType: OUTBOX_EVENT_TYPES.PAYMENT_CREATED,
      idempotencyKey: `payment-created:${paymentSummary.id}`,
      payloadJson: {
        paymentId: paymentSummary.id,
        paymentTransactionId: paymentResult.transactionId,
        orderId: order.id,
        storeId: order.storeId ?? null,
        amountCents: paymentSummary.amountCents,
        method: paymentSummary.method,
        sellerId: order.sellerId ?? null,
        createdByUserId: Number(currentUser.userId),
      },
    });

    return paymentSummary;
  }
}

