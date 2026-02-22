import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../../auth/types/jwt-payload';

export interface SellerDashboardSummary {
  activeProducts: number;
  lowStockProducts: number;
  ordersTotal: number;
  ordersToday: number;
  revenueTodayCents: number;
}

export interface SellerReportsSummary {
  range: {
    from: string;
    to: string;
    days: number;
  };
  ordersCount: number;
  revenueCents: number;
  averageOrderValueCents: number;
  topProducts: Array<{
    productId: number;
    name: string;
    quantity: number;
    revenueCents: number;
  }>;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSellerSummary(
    currentUser: JwtPayload,
  ): Promise<SellerDashboardSummary> {
    if (
      currentUser.role !== 'ADMIN' &&
      currentUser.role !== 'SELLER' &&
      currentUser.role !== 'STAFF'
    ) {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const orderScopeWhere =
      currentUser.role === 'STAFF'
        ? { businessId, createdByUserId: userId, deletedAt: null as null }
        : { businessId, deletedAt: null as null };

    const [
      activeProducts,
      lowStockProducts,
      ordersTotal,
      ordersToday,
      revenueTodayAgg,
    ] = await Promise.all([
      this.prisma.product.count({
        where: { businessId, isActive: true },
      }),
      this.prisma.product.count({
        where: {
          businessId,
          isActive: true,
          stock: {
            lte: 5,
          },
        },
      }),
      this.prisma.order.count({
        where: orderScopeWhere,
      }),
      this.prisma.order.count({
        where: {
          ...orderScopeWhere,
          createdAt: {
            gte: startOfToday,
          },
        },
      }),
      this.prisma.order.aggregate({
        where: {
          ...orderScopeWhere,
          createdAt: {
            gte: startOfToday,
          },
        },
        _sum: {
          totalAmountCents: true,
        },
      }),
    ]);

    return {
      activeProducts,
      lowStockProducts,
      ordersTotal,
      ordersToday,
      revenueTodayCents: Number(revenueTodayAgg._sum.totalAmountCents ?? 0),
    };
  }

  async getSellerReportsSummary(
    currentUser: JwtPayload,
  ): Promise<SellerReportsSummary> {
    if (
      currentUser.role !== 'ADMIN' &&
      currentUser.role !== 'SELLER' &&
      currentUser.role !== 'STAFF'
    ) {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);

    const now = new Date();
    const days = 30;
    const from = new Date(now);
    from.setDate(from.getDate() - days);

    const orderScopeWhere =
      currentUser.role === 'STAFF'
        ? { businessId, createdByUserId: userId, deletedAt: null as null }
        : { businessId, deletedAt: null as null };

    const ordersWhere = {
      ...orderScopeWhere,
      createdAt: {
        gte: from,
        lte: now,
      },
    };

    const [ordersCount, revenueAgg, topItemGroups] = await Promise.all([
      this.prisma.order.count({ where: ordersWhere }),
      this.prisma.order.aggregate({
        where: ordersWhere,
        _sum: { totalAmountCents: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          businessId,
          order: ordersWhere,
        },
        _sum: {
          quantity: true,
          totalAmountCents: true,
        },
        orderBy: {
          _sum: {
            totalAmountCents: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    const productIds = topItemGroups.map((g) => g.productId);
    const products = productIds.length
      ? await this.prisma.product.findMany({
          where: { businessId, id: { in: productIds } },
          select: { id: true, name: true },
        })
      : [];

    const nameById = new Map(products.map((p) => [p.id, p.name] as const));

    const revenueCents = Number(revenueAgg._sum.totalAmountCents ?? 0);
    const averageOrderValueCents =
      ordersCount > 0 ? Math.round(revenueCents / ordersCount) : 0;

    return {
      range: {
        from: from.toISOString(),
        to: now.toISOString(),
        days,
      },
      ordersCount,
      revenueCents,
      averageOrderValueCents,
      topProducts: topItemGroups.map((g) => ({
        productId: g.productId,
        name: nameById.get(g.productId) ?? `#${g.productId}`,
        quantity: Number(g._sum.quantity ?? 0),
        revenueCents: Number(g._sum.totalAmountCents ?? 0),
      })),
    };
  }
}
