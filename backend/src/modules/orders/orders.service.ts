import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { SettingsService } from '../settings/settings.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { OrderSource } from '@prisma/client';

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
  items: Array<{
    id: number;
    productId: number;
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

const ORDER_DEFAULT_STATUS_KEY = 'order.defaultStatusKey';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  async create(currentUser: JwtPayload, payload: CreateOrderDto): Promise<OrderDetail> {
    const businessId = Number(currentUser.businessId);
    const createdByUserId = Number(currentUser.userId);

    const customer = await this.prisma.customer.findFirst({
      where: { id: payload.customerId, businessId },
      select: { id: true },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const defaultStatusKey =
      (await this.settingsService.getJson<string>(businessId, ORDER_DEFAULT_STATUS_KEY)) ?? 'CREATED';

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

    const productIds = payload.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: {
        businessId,
        id: { in: productIds },
        isActive: true,
      },
      select: {
        id: true,
        priceCents: true,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    let totalAmountCents = 0;
    const itemData: Array<{
      businessId: number;
      orderId?: number;
      productId: number;
      quantity: number;
      unitPriceCents: number;
      totalAmountCents: number;
    }> = [];

    for (const item of payload.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new NotFoundException(`Product not found: ${item.productId}`);
      }
      const unitPriceCents = product.priceCents;
      const lineTotal = unitPriceCents * item.quantity;
      totalAmountCents += lineTotal;
      itemData.push({
        businessId,
        productId: item.productId,
        quantity: item.quantity,
        unitPriceCents,
        totalAmountCents: lineTotal,
      });
    }

    const source: OrderSource = payload.source ?? OrderSource.POS;

    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          businessId,
          customerId: payload.customerId,
          createdByUserId,
          statusId: status.id,
          totalAmountCents,
          source,
          notes: payload.notes ?? null,
        },
        select: {
          id: true,
          customerId: true,
          totalAmountCents: true,
          source: true,
          createdByUserId: true,
          createdAt: true,
          notes: true,
        },
      });

      await tx.orderItem.createMany({
        data: itemData.map((i) => ({
          businessId: i.businessId,
          orderId: order.id,
          productId: i.productId,
          quantity: i.quantity,
          unitPriceCents: i.unitPriceCents,
          totalAmountCents: i.totalAmountCents,
        })),
      });

      const items = await tx.orderItem.findMany({
        where: { businessId, orderId: order.id },
        select: {
          id: true,
          productId: true,
          quantity: true,
          unitPriceCents: true,
          totalAmountCents: true,
        },
      });

      return { order, items };
    });

    return {
      id: result.order.id,
      customerId: result.order.customerId,
      totalAmountCents: result.order.totalAmountCents,
      statusKey: status.key,
      source,
      createdByUserId: result.order.createdByUserId,
      createdAt: result.order.createdAt,
      notes: result.order.notes ?? undefined,
      items: result.items,
    };
  }

  async findAll(currentUser: JwtPayload): Promise<OrderSummary[]> {
    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);

    const where =
      currentUser.role === 'ADMIN'
        ? { businessId }
        : { businessId, createdByUserId: userId };

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

    return order;
  }

  async findOne(currentUser: JwtPayload, id: number): Promise<OrderDetail> {
    const order = await this.findAccessibleOrder(currentUser, id);
    const items = await this.prisma.orderItem.findMany({
      where: {
        businessId: order.businessId,
        orderId: order.id,
      },
      select: {
        id: true,
        productId: true,
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
      items,
    };
  }

  async update(
    currentUser: JwtPayload,
    id: number,
    payload: UpdateOrderDto,
  ): Promise<OrderDetail> {
    const order = await this.findAccessibleOrder(currentUser, id);

    const data: Partial<{ notes: string | null; statusId: number }> = {};

    if (payload.notes !== undefined) {
      data.notes = payload.notes;
    }

    if (payload.statusKey) {
      const status = await this.prisma.orderStatus.findFirst({
        where: {
          businessId: order.businessId,
          key: payload.statusKey,
        },
        select: { id: true },
      });
      if (!status) {
        throw new NotFoundException('Order status not found');
      }
      data.statusId = status.id;
    }

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data,
      include: {
        status: true,
      },
    });

    const items = await this.prisma.orderItem.findMany({
      where: {
        businessId: updated.businessId,
        orderId: updated.id,
      },
      select: {
        id: true,
        productId: true,
        quantity: true,
        unitPriceCents: true,
        totalAmountCents: true,
      },
    });

    return {
      id: updated.id,
      customerId: updated.customerId,
      totalAmountCents: updated.totalAmountCents,
      statusKey: updated.status.key,
      source: updated.source,
      createdByUserId: updated.createdByUserId,
      createdAt: updated.createdAt,
      notes: updated.notes ?? undefined,
      items,
    };
  }

  async listPayments(currentUser: JwtPayload, id: number): Promise<PaymentSummary[]> {
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

    const payment = await this.prisma.payment.create({
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

    return {
      id: payment.id,
      amountCents: payment.amountCents,
      method: payment.method,
      reference: payment.reference ?? undefined,
      createdAt: payment.createdAt,
    };
  }
}
