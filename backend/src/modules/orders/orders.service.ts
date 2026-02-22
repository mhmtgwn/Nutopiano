import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { SettingsService } from '../settings/settings.service';
import { FinanceService } from '../finance/finance.service';
import { EmailService } from '../../email/email.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { OrderSource } from '@prisma/client';
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

export interface OrderSummary {
  id: number;
  customerId: number;
  totalAmountCents: number;
  statusKey: string;
  source: OrderSource;
  createdByUserId: number;
  createdAt: Date;
}

export interface OrderDetail extends OrderSummary {
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
const IDEMPOTENCY_KEY_MAX_LENGTH = 128;
const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['IN_PROGRESS', 'PAID', 'COMPLETED', 'CANCELLED'],
  CREATED: ['IN_PROGRESS', 'PAID', 'COMPLETED', 'CANCELLED', 'RETURN_REQUESTED'],
  IN_PROGRESS: ['PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'RETURN_REQUESTED'],
  PAID: ['IN_PROGRESS', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'RETURN_REQUESTED'],
  SHIPPED: ['DELIVERED', 'COMPLETED', 'RETURN_REQUESTED', 'CANCELLED'],
  DELIVERED: ['COMPLETED', 'RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURNED', 'RETURN_REJECTED', 'CANCELLED', 'COMPLETED'],
  RETURN_REJECTED: ['DELIVERED', 'COMPLETED'],
};
type VariantRow = {
  id: number;
  productId: number;
  priceCents: number;
  stock: number | null;
  name: string;
};
type OrderItemStockLine = { productId: number; variantId?: number | null; quantity: number };

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
    private readonly financeService: FinanceService,
    private readonly emailService: EmailService,
  ) {}

  private aggregateStockLines(lines: OrderItemStockLine[]) {
    const byProduct = new Map<number, number>();
    const byVariant = new Map<number, number>();

    for (const line of lines) {
      const qty = Number(line.quantity) || 0;
      if (qty <= 0) continue;

      if (line.variantId) {
        const prev = byVariant.get(line.variantId) ?? 0;
        byVariant.set(line.variantId, prev + qty);
      } else {
        const prev = byProduct.get(line.productId) ?? 0;
        byProduct.set(line.productId, prev + qty);
      }
    }

    return { byProduct, byVariant };
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

  private buildOrderCreateIdempotencyHash(
    currentUser: JwtPayload,
    payload: CreateOrderDto,
  ): string {
    const normalizedPayload = {
      actor: {
        userId: Number(currentUser.userId),
        role: String(currentUser.role),
      },
      customerId: Number(payload.customerId),
      source: payload.source ?? null,
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
      const recipient = await this.resolveOrderEmailRecipient(businessId, orderId);
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
      const recipient = await this.resolveOrderEmailRecipient(businessId, orderId);
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
      const recipient = await this.resolveOrderEmailRecipient(businessId, orderId);
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

  async findAllPaginated(
    currentUser: JwtPayload,
    params?: { page?: number; pageSize?: number },
  ): Promise<{ data: OrderSummary[]; meta: PaginationMeta }> {
    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);

    const page = clampPage(Number(params?.page ?? 1));
    const pageSize = clampPageSize(Number(params?.pageSize ?? 20));

    if (currentUser.role === 'CUSTOMER') {
      const customerId = await this.resolveCustomerIdForUser(currentUser, businessId);
      if (!customerId) {
        const meta = buildPaginationMeta(0, page, pageSize);
        return { data: [], meta };
      }

      const where = {
        businessId,
        customerId,
        deletedAt: null as null,
      };

      const total = await this.prisma.order.count({ where });
      const meta = buildPaginationMeta(total, page, pageSize);
      const { skip, take } = paginationToSkipTake(meta);

      const orders = await this.prisma.order.findMany({
        where,
        select: {
          id: true,
          customerId: true,
          totalAmountCents: true,
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
        data: orders.map((o) => ({
          id: o.id,
          customerId: o.customerId,
          totalAmountCents: o.totalAmountCents,
          statusKey: o.status.key,
          source: o.source,
          createdByUserId: o.createdByUserId,
          createdAt: o.createdAt,
        })),
        meta,
      };
    }

    const where =
      currentUser.role === 'STAFF'
        ? { businessId, createdByUserId: userId, deletedAt: null as null }
        : { businessId, deletedAt: null as null };

    const total = await this.prisma.order.count({ where });
    const meta = buildPaginationMeta(total, page, pageSize);
    const { skip, take } = paginationToSkipTake(meta);

    const orders = await this.prisma.order.findMany({
      where,
      select: {
        id: true,
        customerId: true,
        totalAmountCents: true,
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
      data: orders.map((o) => ({
        id: o.id,
        customerId: o.customerId,
        totalAmountCents: o.totalAmountCents,
        statusKey: o.status.key,
        source: o.source,
        createdByUserId: o.createdByUserId,
        createdAt: o.createdAt,
      })),
      meta,
    };
  }

  async listPlatformOrders(
    currentUser: JwtPayload,
    params?: { source?: string; page?: number; pageSize?: number },
  ): Promise<{ data: OrderSummary[]; meta: PaginationMeta }> {
    if (currentUser.role !== 'ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);
    const page = clampPage(Number(params?.page ?? 1));
    const pageSize = clampPageSize(Number(params?.pageSize ?? 20));

    const source = (params?.source ?? '').trim();

    const isValidSource =
      source.length > 0 && (Object.values(OrderSource) as string[]).includes(source);

    const where: {
      businessId: number;
      deletedAt: null;
      source?: OrderSource;
    } = { businessId, deletedAt: null };
    if (isValidSource) {
      where.source = source as OrderSource;
    }

    const total = await this.prisma.order.count({ where });
    const meta = buildPaginationMeta(total, page, pageSize);
    const { skip, take } = paginationToSkipTake(meta);

    const orders = await this.prisma.order.findMany({
      where,
      select: {
        id: true,
        customerId: true,
        totalAmountCents: true,
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
      data: orders.map((o) => ({
        id: o.id,
        customerId: o.customerId,
        totalAmountCents: o.totalAmountCents,
        statusKey: o.status.key,
        source: o.source,
        createdByUserId: o.createdByUserId,
        createdAt: o.createdAt,
      })),
      meta,
    };
  }

  async create(
    currentUser: JwtPayload,
    payload: CreateOrderDto,
    idempotencyKeyHeader?: string,
  ): Promise<OrderDetail> {
    const businessId = Number(currentUser.businessId);
    const createdByUserId = Number(currentUser.userId);
    const normalizedIdempotencyKey =
      this.normalizeIdempotencyKey(idempotencyKeyHeader);
    const idempotencyHash = normalizedIdempotencyKey
      ? this.buildOrderCreateIdempotencyHash(currentUser, payload)
      : null;

    if (normalizedIdempotencyKey && idempotencyHash) {
      const existingOrder = await this.prisma.order.findFirst({
        where: {
          businessId,
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

    const customer = await this.prisma.customer.findFirst({
      where: { id: payload.customerId, businessId, deletedAt: null },
      select: { id: true },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
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
      typeof payload.couponCode === 'string' && payload.couponCode.trim().length > 0
        ? payload.couponCode.trim().toUpperCase()
        : null;

    const productIds = payload.items.map((i) => i.productId);
    const variantIds = Array.from(
      new Set(
        payload.items
          .map((i) => i.variantId)
          .filter((id): id is number => Number.isFinite(id) && Number(id) > 0),
      ),
    );

    const products = await this.prisma.product.findMany({
      where: {
        businessId,
        id: { in: productIds },
        isActive: true,
      },
      select: {
        id: true,
        priceCents: true,
        stock: true,
        name: true,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    const variants: VariantRow[] =
      variantIds.length > 0
        ? await (this.prisma as any).productVariant.findMany({
            where: {
              businessId,
              id: { in: variantIds },
              isActive: true,
            },
            select: {
              id: true,
              productId: true,
              priceCents: true,
              stock: true,
              name: true,
            },
          })
        : [];
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    // Check stock availability
    for (const item of payload.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new NotFoundException(`Product not found: ${item.productId}`);
      }

      if (item.variantId) {
        const variant = variantMap.get(item.variantId);
        if (!variant || variant.productId !== item.productId) {
          throw new NotFoundException(`Product variant not found: ${item.variantId}`);
        }
        if (
          variant.stock !== null &&
          variant.stock !== undefined &&
          variant.stock < item.quantity
        ) {
          throw new NotFoundException(
            `Insufficient stock for variant "${variant.name}". Available: ${variant.stock}, Requested: ${item.quantity}`,
          );
        }
      } else if (
        product.stock !== null &&
        product.stock !== undefined &&
        product.stock < item.quantity
      ) {
        throw new NotFoundException(
          `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`,
        );
      }
    }

    const source: OrderSource = payload.source ?? OrderSource.POS;

    let result: {
      order: {
        id: number;
        customerId: number;
        totalAmountCents: number;
        source: OrderSource;
        createdByUserId: number;
        createdAt: Date;
        notes?: string | null;
        shipmentCarrier?: string | null;
        shipmentTrackingNumber?: string | null;
      };
      items: OrderDetail['items'];
    };

    try {
      result = await this.prisma.$transaction(async (tx) => {
      // Fetch products with row-level locking (SELECT ... FOR UPDATE NOWAIT)
      // This prevents concurrent requests from reading stale stock values
      const productsLocked = await tx.$queryRaw<
        Array<{ id: number; priceCents: number; stock: number | null; name: string }>
      >`
        SELECT id, "priceCents", stock, name FROM "Product"
        WHERE "businessId" = ${businessId}
          AND id = ANY(${productIds}::int[])
          AND "isActive" = true
        FOR UPDATE NOWAIT
      `;

      const productMapLocked = new Map(
        productsLocked.map((p) => [p.id, p]),
      );
      const variantsLocked =
        variantIds.length > 0
          ? await tx.$queryRaw<
              Array<{
                id: number;
                productId: number;
                priceCents: number;
                stock: number | null;
                name: string;
              }>
            >`
              SELECT id, "productId", "priceCents", stock, name FROM "ProductVariant"
              WHERE "businessId" = ${businessId}
                AND id = ANY(${variantIds}::int[])
                AND "isActive" = true
              FOR UPDATE NOWAIT
            `
          : [];
      const variantMapLocked = new Map(
        variantsLocked.map((v) => [v.id, v]),
      );

      // Validate stock again inside transaction with locked rows
      for (const item of payload.items) {
        const product = productMapLocked.get(item.productId);
        if (!product) {
          throw new NotFoundException(`Product not found: ${item.productId}`);
        }

        if (item.variantId) {
          const variant = variantMapLocked.get(item.variantId);
          if (!variant || variant.productId !== item.productId) {
            throw new NotFoundException(`Product variant not found: ${item.variantId}`);
          }
          if (
            variant.stock !== null &&
            variant.stock !== undefined &&
            variant.stock < item.quantity
          ) {
            throw new NotFoundException(
              `Insufficient stock for variant "${variant.name}". Available: ${variant.stock}, Requested: ${item.quantity}`,
            );
          }
          if (
            typeof item.expectedUnitPriceCents === 'number' &&
            item.expectedUnitPriceCents !== variant.priceCents
          ) {
            throw new BadRequestException(
              `Sepetteki fiyat güncellendi: "${product.name} / ${variant.name}". Lütfen sepeti yenileyin.`,
            );
          }
        } else {
          if (
            product.stock !== null &&
            product.stock !== undefined &&
            product.stock < item.quantity
          ) {
            throw new NotFoundException(
              `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`,
            );
          }
          if (
            typeof item.expectedUnitPriceCents === 'number' &&
            item.expectedUnitPriceCents !== product.priceCents
          ) {
            throw new BadRequestException(
              `Sepetteki fiyat güncellendi: "${product.name}". Lütfen sepeti yenileyin.`,
            );
          }
        }
      }

      let totalAmountCents = 0;
      let subtotalAmountCents = 0;
      let taxAmountCents = 0;
      let lineDiscountAmountCents = 0;
      const itemData: Array<{
        businessId: number;
        orderId?: number;
        productId: number;
        variantId?: number;
        productName: string;
        quantity: number;
        unitPriceCents: number;
        subtotalAmountCents: number;
        taxAmountCents: number;
        taxRateBps: number;
        totalAmountCents: number;
      }> = [];

      for (const item of payload.items) {
        const product = productMapLocked.get(item.productId);
        if (!product) {
          throw new NotFoundException(`Product not found: ${item.productId}`);
        }
        const variant =
          typeof item.variantId === 'number'
            ? variantMapLocked.get(item.variantId)
            : undefined;
        const unitPriceCents = variant ? variant.priceCents : product.priceCents;
        const lineSubtotalRaw = unitPriceCents * item.quantity;
        const requestedLineDiscount = Number(item.discountAmountCents ?? 0);
        const lineDiscount = Math.min(
          Math.max(requestedLineDiscount, 0),
          lineSubtotalRaw,
        );
        const lineSubtotal = lineSubtotalRaw - lineDiscount;
        const lineTax = Math.round((lineSubtotal * taxRateBps) / 10_000);
        const lineTotal = lineSubtotal + lineTax;
        subtotalAmountCents += lineSubtotal;
        taxAmountCents += lineTax;
        totalAmountCents += lineTotal;
        lineDiscountAmountCents += lineDiscount;
        itemData.push({
          businessId,
          productId: item.productId,
          variantId: variant?.id,
          productName: product.name,
          quantity: item.quantity,
          unitPriceCents,
          subtotalAmountCents: lineSubtotal,
          taxAmountCents: lineTax,
          taxRateBps,
          totalAmountCents: lineTotal,
        });
      }

      // Decrement stock in aggregated form to avoid N+1 update pressure.
      const aggregated = this.aggregateStockLines(
        payload.items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
      );

      for (const [variantId, quantity] of aggregated.byVariant.entries()) {
        const variant = variantMapLocked.get(variantId);
        if (variant && variant.stock !== null && variant.stock !== undefined) {
          await (tx as any).productVariant.update({
            where: { id: variantId },
            data: { stock: { decrement: quantity } },
          });
        }
      }

      for (const [productId, quantity] of aggregated.byProduct.entries()) {
        const product = productMapLocked.get(productId);
        if (product && product.stock !== null && product.stock !== undefined) {
          await tx.product.update({
            where: { id: productId },
            data: { stock: { decrement: quantity } },
          });
        }
      }

      let discountAmountCents = lineDiscountAmountCents;
      const requestedCartDiscountAmount = Number(
        payload.cartDiscountAmountCents ?? 0,
      );
      const cartDiscountAmountCents = Math.min(
        Math.max(requestedCartDiscountAmount, 0),
        totalAmountCents,
      );
      if (cartDiscountAmountCents > 0) {
        discountAmountCents += cartDiscountAmountCents;
        totalAmountCents -= cartDiscountAmountCents;
      }

      let couponToConsume: { id: number; code: string } | null = null;
      if (normalizedCouponCode) {
        let couponDiscountAmountCents = 0;
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
          subtotalAmountCents < coupon.minOrderAmountCents
        ) {
          throw new BadRequestException('Kupon minimum sepet tutarı sağlanmadı.');
        }

        if (String(coupon.type).toUpperCase() === 'PERCENT') {
          couponDiscountAmountCents = Math.round(
            (subtotalAmountCents * Number(coupon.value)) / 10_000,
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

        if (couponDiscountAmountCents > totalAmountCents) {
          couponDiscountAmountCents = totalAmountCents;
        }
        if (couponDiscountAmountCents < 0) {
          couponDiscountAmountCents = 0;
        }

        discountAmountCents += couponDiscountAmountCents;
        totalAmountCents -= couponDiscountAmountCents;
        couponToConsume = { id: coupon.id, code: coupon.code };
      }

      const order = await (tx as any).order.create({
        data: {
          businessId,
          customerId: payload.customerId,
          createdByUserId,
          statusId: status.id,
          subtotalAmountCents,
          taxAmountCents,
          taxRateBps,
          discountAmountCents,
          couponCode: couponToConsume?.code ?? null,
          totalAmountCents,
          source,
          notes: payload.notes ?? null,
          idempotencyKey: normalizedIdempotencyKey,
          idempotencyHash,
        },
        select: {
          id: true,
          customerId: true,
          totalAmountCents: true,
          source: true,
          createdByUserId: true,
          createdAt: true,
          notes: true,
          shipmentCarrier: true,
          shipmentTrackingNumber: true,
        },
      });

      await (tx as any).orderItem.createMany({
        data: itemData.map((i) => ({
          businessId: i.businessId,
          orderId: order.id,
          productId: i.productId,
          variantId: i.variantId,
          productName: i.productName,
          quantity: i.quantity,
          unitPriceCents: i.unitPriceCents,
          subtotalAmountCents: i.subtotalAmountCents,
          taxAmountCents: i.taxAmountCents,
          taxRateBps: i.taxRateBps,
          totalAmountCents: i.totalAmountCents,
        })),
      });

      if (couponToConsume) {
        await (tx as any).coupon.update({
          where: { id: couponToConsume.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      const items = await (tx as any).orderItem.findMany({
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

        return { order, items };
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
      totalAmountCents: result.order.totalAmountCents,
      statusKey: status.key,
      source,
      createdByUserId: result.order.createdByUserId,
      createdAt: result.order.createdAt,
      notes: result.order.notes ?? undefined,
      shipmentCarrier: result.order.shipmentCarrier ?? undefined,
      shipmentTrackingNumber: result.order.shipmentTrackingNumber ?? undefined,
      items: result.items,
    };

    void this.sendOrderCreatedNotification(
      businessId,
      createdOrderDetail.id,
      createdOrderDetail.totalAmountCents,
    );

    return createdOrderDetail;
  }

  async findAll(currentUser: JwtPayload): Promise<OrderSummary[]> {
    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);

    if (currentUser.role === 'CUSTOMER') {
      const customerId = await this.resolveCustomerIdForUser(currentUser, businessId);
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
          totalAmountCents: true,
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

      return orders.map((o) => ({
        id: o.id,
        customerId: o.customerId,
        totalAmountCents: o.totalAmountCents,
        statusKey: o.status.key,
        source: o.source,
        createdByUserId: o.createdByUserId,
        createdAt: o.createdAt,
      }));
    }

    const where =
      currentUser.role === 'STAFF'
        ? { businessId, createdByUserId: userId, deletedAt: null as null }
        : { businessId, deletedAt: null as null };

    const orders = await this.prisma.order.findMany({
      where,
      select: {
        id: true,
        customerId: true,
        totalAmountCents: true,
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

    return orders.map((o) => ({
      id: o.id,
      customerId: o.customerId,
      totalAmountCents: o.totalAmountCents,
      statusKey: o.status.key,
      source: o.source,
      createdByUserId: o.createdByUserId,
      createdAt: o.createdAt,
    }));
  }

  private async findAccessibleOrder(currentUser: JwtPayload, id: number) {
    const businessId = Number(currentUser.businessId);
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

    if (currentUser.role === 'STAFF' && order.createdByUserId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (currentUser.role === 'CUSTOMER') {
      const customerId = await this.resolveCustomerIdForUser(currentUser, businessId);
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

    this.assertOrderStatusTransitionAllowed({
      fromStatusKey: order.status?.key,
      fromIsFinal: order.status?.isFinal,
      toStatusKey: nextStatusKey,
    });

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: { statusId: status.id },
      include: { status: true },
    });

    const items = await (this.prisma as any).orderItem.findMany({
      where: {
        businessId: updated.businessId,
        orderId: updated.id,
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
    });

    const orderDetail: OrderDetail = {
      id: updated.id,
      customerId: updated.customerId,
      totalAmountCents: updated.totalAmountCents,
      statusKey: updated.status.key,
      source: updated.source,
      createdByUserId: updated.createdByUserId,
      createdAt: updated.createdAt,
      notes: updated.notes ?? undefined,
      shipmentCarrier: (updated as any).shipmentCarrier ?? undefined,
      shipmentTrackingNumber: (updated as any).shipmentTrackingNumber ?? undefined,
      items,
    };

    void this.sendOrderStatusChangedNotification(
      updated.businessId,
      updated.id,
      order.status.key,
      updated.status.key,
    );

    return orderDetail;
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

    this.assertOrderStatusTransitionAllowed({
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
      throw new BadRequestException('Bu sipariş için aktif iade talebi zaten var.');
    }

    await this.prisma.$transaction(async (tx) => {
      await (tx as any).order.update({
        where: { id: order.id },
        data: { statusId: returnRequestedStatus.id },
      });

      if (existing) {
        await (tx as any).returnRequest.update({
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
        await (tx as any).returnRequest.create({
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

    return this.findOne(currentUser, id);
  }

  async listReturnRequests(
    currentUser: JwtPayload,
    params?: { status?: string },
  ): Promise<ReturnRequestSummary[]> {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'STAFF') {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);
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
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'STAFF') {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);
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
      this.assertOrderStatusTransitionAllowed({
        fromStatusKey: request.order?.status?.key,
        fromIsFinal: request.order?.status?.isFinal,
        toStatusKey: nextOrderStatusKey,
      });
    }

    const resolved = await this.prisma.$transaction(async (tx) => {
      if (isApprove) {
        const items: Array<{ productId: number; variantId?: number | null; quantity: number }> =
          await (tx as any).orderItem.findMany({
            where: { orderId: request.orderId },
            select: { productId: true, variantId: true, quantity: true },
          });

        const aggregated = this.aggregateStockLines(items);
        for (const [variantId, quantity] of aggregated.byVariant.entries()) {
          await (tx as any).productVariant.updateMany({
            where: { id: variantId, stock: { not: null } },
            data: { stock: { increment: quantity } },
          });
        }
        for (const [productId, quantity] of aggregated.byProduct.entries()) {
          await tx.product.updateMany({
            where: { id: productId, stock: { not: null } },
            data: { stock: { increment: quantity } },
          });
        }
      }

      const orderStatusId =
        statusMap.get(targetOrderStatusKeys[0]) ??
        statusMap.get(targetOrderStatusKeys[1]) ??
        statusMap.get(targetOrderStatusKeys[2]);

      if (orderStatusId) {
        await (tx as any).order.update({
          where: { id: request.orderId },
          data: { statusId: orderStatusId },
        });
      }

      await (tx as any).returnRequest.update({
        where: { id: request.id },
        data: {
          status: nextReturnStatus,
          responseNote: note,
          decidedAt: new Date(),
          decidedByUserId,
        },
      });

      return (tx as any).returnRequest.findFirst({
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
    }

    return resolved as ReturnRequestSummary;
  }

  async findOne(currentUser: JwtPayload, id: number): Promise<OrderDetail> {
    const order = await this.findAccessibleOrder(currentUser, id);
    const items = await (this.prisma as any).orderItem.findMany({
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
    });

    return {
      id: order.id,
      customerId: order.customerId,
      totalAmountCents: order.totalAmountCents,
      statusKey: order.status.key,
      source: order.source,
      createdByUserId: order.createdByUserId,
      createdAt: order.createdAt,
      notes: order.notes ?? undefined,
      shipmentCarrier: (order as any).shipmentCarrier ?? undefined,
      shipmentTrackingNumber: (order as any).shipmentTrackingNumber ?? undefined,
      items,
    };
  }

  /**
   * Detect if a status key indicates a cancelled order
   * Based on convention: status keys containing "CANCEL" (case-insensitive)
   */
  private assertOrderStatusTransitionAllowed(params: {
    fromStatusKey?: string | null;
    fromIsFinal?: boolean | null;
    toStatusKey?: string | null;
  }) {
    const from = String(params.fromStatusKey ?? '')
      .trim()
      .toUpperCase();
    const to = String(params.toStatusKey ?? '')
      .trim()
      .toUpperCase();

    if (!from || !to || from === to) {
      return;
    }

    if (params.fromIsFinal) {
      throw new BadRequestException(
        `Final durumdan gecis yapilamaz: ${from} -> ${to}`,
      );
    }

    const allowedNext = ORDER_STATUS_TRANSITIONS[from];
    if (!allowedNext) {
      // Unknown/custom status keys stay permissive to avoid blocking tenant-specific flows.
      return;
    }

    if (!allowedNext.includes(to)) {
      throw new BadRequestException(`Gecersiz durum gecisi: ${from} -> ${to}`);
    }
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
      this.assertOrderStatusTransitionAllowed({
        fromStatusKey: order.status?.key,
        fromIsFinal: order.status?.isFinal,
        toStatusKey: newStatusKey,
      });
    }

    const isCancellingNow = newStatusKey && this.isCancelledStatus(newStatusKey);

    // Use transaction to ensure stock restoration is atomic with status update
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: order.id },
        data,
        include: {
          status: true,
        },
      });

      // Restore stock if transitioning to cancelled status (and wasn't already cancelled)
      if (isCancellingNow && !wasCancelled) {
        const items: Array<{ productId: number; variantId?: number | null; quantity: number }> =
          await (tx as any).orderItem.findMany({
          where: { orderId: updated.id },
          select: { productId: true, variantId: true, quantity: true },
        });

        const aggregated = this.aggregateStockLines(items);
        for (const [variantId, quantity] of aggregated.byVariant.entries()) {
          await (tx as any).productVariant.updateMany({
            where: { id: variantId, stock: { not: null } },
            data: { stock: { increment: quantity } },
          });
        }
        for (const [productId, quantity] of aggregated.byProduct.entries()) {
          await tx.product.updateMany({
            where: { id: productId, stock: { not: null } },
            data: { stock: { increment: quantity } },
          });
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

    const items = await (this.prisma as any).orderItem.findMany({
      where: {
        businessId: result.businessId,
        orderId: result.id,
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
    });

    const orderDetail: OrderDetail = {
      id: result.id,
      customerId: result.customerId,
      totalAmountCents: result.totalAmountCents,
      statusKey: result.status.key,
      source: result.source,
      createdByUserId: result.createdByUserId,
      createdAt: result.createdAt,
      notes: result.notes ?? undefined,
      shipmentCarrier: (result as any).shipmentCarrier ?? undefined,
      shipmentTrackingNumber: (result as any).shipmentTrackingNumber ?? undefined,
      items,
    };

    void this.sendOrderStatusChangedNotification(
      result.businessId,
      result.id,
      order.status.key,
      result.status.key,
    );

    return orderDetail;
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

    const amountCents = Number(payload.amount);

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      throw new BadRequestException('Tutar pozitif olmalı');
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM "Order" WHERE "id" = ${order.id} FOR UPDATE`;

      const paymentAggregate = await tx.payment.aggregate({
        where: {
          businessId: order.businessId,
          orderId: order.id,
        },
        _sum: { amountCents: true },
      });

      const paidNet = Number(paymentAggregate._sum.amountCents ?? 0);
      const remainingDue = Math.max(order.totalAmountCents - paidNet, 0);

      if (remainingDue <= 0) {
        throw new BadRequestException('Siparisin kalan borcu yok');
      }
      if (amountCents > remainingDue) {
        throw new BadRequestException(
          `Odeme tutari kalan borcu asamaz. Kalan: ${remainingDue}`,
        );
      }

      return tx.payment.create({
        data: {
          businessId: order.businessId,
          orderId: order.id,
          amountCents,
          method: payload.method,
          reference: payload.reference ?? null,
        },
        select: {
          id: true,
          amountCents: true,
          method: true,
          reference: true,
          createdAt: true,
        },
      });
    });

    const paymentSummary: PaymentSummary = {
      id: payment.id,
      amountCents: payment.amountCents,
      method: payment.method,
      reference: payment.reference ?? undefined,
      createdAt: payment.createdAt,
    };

    void this.sendOrderPaymentNotification(
      order.businessId,
      order.id,
      paymentSummary.amountCents,
      paymentSummary.method,
    );

    return paymentSummary;
  }
}
