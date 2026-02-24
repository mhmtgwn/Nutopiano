import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { SettingsService } from '../settings/settings.service';
import {
  buildPaginationMeta,
  clampPage,
  clampPageSize,
  paginationToSkipTake,
  type PaginationMeta,
} from '@common/utils/pagination';

const COMMISSION_RATE_KEY = 'global_commission_rate';
type DateRange = { startAt: Date; endAt: Date };
type SellerScope = {
  businessId: number;
  sellerIds: number[] | null;
  orderWhere: Prisma.OrderWhereInput;
};

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  private async getCommissionRate(businessId: number): Promise<number> {
    const rate = await this.settingsService.getJson<number>(
      businessId,
      COMMISSION_RATE_KEY,
    );
    if (typeof rate !== 'number' || Number.isNaN(rate) || rate < 0) return 0.05;
    return rate;
  }

  private parseDateRange(
    params?: { dateFrom?: string; dateTo?: string },
    defaultDays = 30,
  ): DateRange {
    const now = new Date();
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    const fromRaw = params?.dateFrom?.trim();
    const toRaw = params?.dateTo?.trim();

    let startAt: Date;
    let endAtExclusive: Date;

    if (fromRaw) {
      startAt = new Date(`${fromRaw}T00:00:00.000Z`);
      if (Number.isNaN(startAt.getTime())) {
        throw new BadRequestException('dateFrom gecersiz');
      }
    } else {
      startAt = new Date(todayStart);
      startAt.setUTCDate(startAt.getUTCDate() - Math.max(defaultDays - 1, 0));
    }

    if (toRaw) {
      endAtExclusive = new Date(`${toRaw}T00:00:00.000Z`);
      if (Number.isNaN(endAtExclusive.getTime())) {
        throw new BadRequestException('dateTo gecersiz');
      }
    } else if (fromRaw) {
      endAtExclusive = new Date(startAt);
    } else {
      endAtExclusive = new Date(todayStart);
    }

    endAtExclusive.setUTCDate(endAtExclusive.getUTCDate() + 1);

    if (endAtExclusive <= startAt) {
      throw new BadRequestException('dateTo, dateFrom tarihinden once olamaz');
    }

    return { startAt, endAt: endAtExclusive };
  }

  private async resolveSellerProfileId(businessId: number, userId: number) {
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

  private async resolveUserTeamSellerIds(businessId: number, userId: number) {
    const rows = await this.prisma.sellerTeamMember.findMany({
      where: {
        businessId,
        userId,
        isActive: true,
        seller: {
          isActive: true,
        },
      },
      select: { sellerId: true },
    });

    return Array.from(
      new Set(rows.map((row) => Number(row.sellerId)).filter((id) => id > 0)),
    );
  }

  private async assertSellerInBusiness(
    businessId: number,
    sellerId: number,
  ): Promise<void> {
    const row = await this.prisma.seller.findFirst({
      where: { id: sellerId, businessId },
      select: { id: true },
    });
    if (!row) {
      throw new NotFoundException('Seller bulunamadi');
    }
  }

  private async resolveSellerScope(
    currentUser: JwtPayload,
    requestedSellerId?: number,
  ): Promise<SellerScope> {
    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);

    const normalizedRequestedSellerId =
      typeof requestedSellerId === 'number' && Number.isFinite(requestedSellerId)
        ? Math.trunc(requestedSellerId)
        : undefined;

    if (
      normalizedRequestedSellerId !== undefined &&
      normalizedRequestedSellerId <= 0
    ) {
      throw new BadRequestException('sellerId gecersiz');
    }

    if (
      currentUser.role === 'SUPER_ADMIN' ||
      currentUser.role === 'ADMIN'
    ) {
      if (normalizedRequestedSellerId !== undefined) {
        await this.assertSellerInBusiness(businessId, normalizedRequestedSellerId);
        return {
          businessId,
          sellerIds: [normalizedRequestedSellerId],
          orderWhere: { businessId, sellerId: normalizedRequestedSellerId },
        };
      }
      return {
        businessId,
        sellerIds: null,
        orderWhere: { businessId },
      };
    }

    if (currentUser.role === 'SELLER') {
      const sellerId = await this.resolveSellerProfileId(businessId, userId);
      if (!sellerId) {
        throw new ForbiddenException('Aktif seller profili bulunamadi');
      }

      if (
        normalizedRequestedSellerId !== undefined &&
        normalizedRequestedSellerId !== sellerId
      ) {
        throw new ForbiddenException('Access denied');
      }

      return {
        businessId,
        sellerIds: [sellerId],
        orderWhere: { businessId, sellerId },
      };
    }

    if (currentUser.role === 'USER') {
      const sellerIds = await this.resolveUserTeamSellerIds(businessId, userId);
      if (!sellerIds.length) {
        throw new ForbiddenException('Seller team yetkisi bulunamadi');
      }

      if (normalizedRequestedSellerId !== undefined) {
        if (!sellerIds.includes(normalizedRequestedSellerId)) {
          throw new ForbiddenException('Access denied');
        }
        return {
          businessId,
          sellerIds: [normalizedRequestedSellerId],
          orderWhere: { businessId, sellerId: normalizedRequestedSellerId },
        };
      }

      return {
        businessId,
        sellerIds,
        orderWhere: { businessId, sellerId: { in: sellerIds } },
      };
    }

    throw new ForbiddenException('Access denied');
  }

  private buildSellerSqlFilter(
    columnSql: Prisma.Sql,
    sellerIds: number[] | null,
  ) {
    if (sellerIds === null) {
      return Prisma.empty;
    }
    if (!sellerIds.length) {
      return Prisma.sql`AND 1=0`;
    }
    return Prisma.sql`AND ${columnSql} IN (${Prisma.join(sellerIds)})`;
  }

  async listSellerPayouts(
    currentUser: JwtPayload,
    params?: { page?: number; pageSize?: number },
  ): Promise<{
    data: Array<{
      id: number;
      beneficiaryUserId: number;
      amountCents: number;
      status: string;
      requestedAt: Date;
      approvedAt?: Date | null;
      completedAt?: Date | null;
    }>;
    meta: PaginationMeta;
  }> {
    if (currentUser.role !== 'SELLER') {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);
    const page = clampPage(Number(params?.page ?? 1));
    const pageSize = clampPageSize(Number(params?.pageSize ?? 20));

    const where = { businessId, beneficiaryUserId: userId };
    const total = await this.prisma.payout.count({ where });
    const meta = buildPaginationMeta(total, page, pageSize);
    const { skip, take } = paginationToSkipTake(meta);

    const data = await this.prisma.payout.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        beneficiaryUserId: true,
        amountCents: true,
        status: true,
        requestedAt: true,
        approvedAt: true,
        completedAt: true,
      },
    });

    return { data, meta };
  }

  async listPlatformPayouts(
    currentUser: JwtPayload,
    params?: { status?: string; page?: number; pageSize?: number },
  ): Promise<{
    data: Array<{
      id: number;
      beneficiaryUserId: number;
      amountCents: number;
      status: string;
      requestedAt: Date;
      approvedAt?: Date | null;
      completedAt?: Date | null;
    }>;
    meta: PaginationMeta;
  }> {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);
    const page = clampPage(Number(params?.page ?? 1));
    const pageSize = clampPageSize(Number(params?.pageSize ?? 20));

    const status = (params?.status ?? '').trim();
    const where: { businessId: number; status?: any } = { businessId };
    if (status) {
      where.status = status;
    }

    const total = await this.prisma.payout.count({ where });
    const meta = buildPaginationMeta(total, page, pageSize);
    const { skip, take } = paginationToSkipTake(meta);

    const data = await this.prisma.payout.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        beneficiaryUserId: true,
        amountCents: true,
        status: true,
        requestedAt: true,
        approvedAt: true,
        completedAt: true,
      },
    });

    return { data, meta };
  }

  private async getAvailableBalanceCents(
    businessId: number,
    beneficiaryUserId: number,
  ): Promise<number> {
    const commissionsAgg = await this.prisma.commission.aggregate({
      where: { businessId, beneficiaryUserId },
      _sum: { netAmountCents: true },
    });

    const payoutsAgg = await this.prisma.payout.aggregate({
      where: {
        businessId,
        beneficiaryUserId,
        status: { in: ['approved', 'completed'] },
      },
      _sum: { amountCents: true },
    });

    const earned = commissionsAgg._sum.netAmountCents ?? 0;
    const paidOrReserved = payoutsAgg._sum.amountCents ?? 0;
    return Math.max(0, earned - paidOrReserved);
  }

  async requestPayout(currentUser: JwtPayload, amountCents: number) {
    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);

    if (currentUser.role !== 'SELLER') {
      throw new ForbiddenException('Access denied');
    }

    const requested = Number(amountCents);
    if (!Number.isFinite(requested) || requested <= 0) {
      throw new ForbiddenException('Invalid amount');
    }

    const available = await this.getAvailableBalanceCents(businessId, userId);
    if (requested > available) {
      throw new ForbiddenException('Insufficient available balance');
    }

    return this.prisma.payout.create({
      data: {
        businessId,
        beneficiaryUserId: userId,
        amountCents: Math.floor(requested),
        status: 'pending',
      },
      select: {
        id: true,
        beneficiaryUserId: true,
        amountCents: true,
        status: true,
        requestedAt: true,
        approvedAt: true,
        completedAt: true,
      },
    });
  }

  async approvePayout(currentUser: JwtPayload, payoutId: number) {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);

    const existing = await this.prisma.payout.findFirst({
      where: { id: payoutId, businessId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Payout not found');
    }

    const updated = await this.prisma.payout.updateMany({
      where: {
        id: payoutId,
        businessId,
        status: 'pending',
      },
      data: {
        status: 'approved',
        approvedAt: new Date(),
      },
    });

    if (updated.count === 0) {
      const current = await this.prisma.payout.findFirst({
        where: { id: payoutId, businessId },
        select: { status: true },
      });
      throw new ConflictException(
        `Payout state changed. Current status: ${current?.status ?? 'unknown'}`,
      );
    }

    return this.prisma.payout.findUniqueOrThrow({
      where: { id: payoutId },
      select: {
        id: true,
        beneficiaryUserId: true,
        amountCents: true,
        status: true,
        requestedAt: true,
        approvedAt: true,
        completedAt: true,
      },
    });
  }

  async completePayout(currentUser: JwtPayload, payoutId: number) {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);

    const existing = await this.prisma.payout.findFirst({
      where: { id: payoutId, businessId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Payout not found');
    }

    const updated = await this.prisma.payout.updateMany({
      where: {
        id: payoutId,
        businessId,
        status: 'approved',
      },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    if (updated.count === 0) {
      const current = await this.prisma.payout.findFirst({
        where: { id: payoutId, businessId },
        select: { status: true },
      });
      throw new ConflictException(
        `Payout state changed. Current status: ${current?.status ?? 'unknown'}`,
      );
    }

    return this.prisma.payout.findUniqueOrThrow({
      where: { id: payoutId },
      select: {
        id: true,
        beneficiaryUserId: true,
        amountCents: true,
        status: true,
        requestedAt: true,
        approvedAt: true,
        completedAt: true,
      },
    });
  }

  async getSellerFinanceOverview(
    currentUser: JwtPayload,
    params?: { dateFrom?: string; dateTo?: string; sellerId?: number },
  ) {
    const scope = await this.resolveSellerScope(currentUser, params?.sellerId);
    const { startAt, endAt } = this.parseDateRange(params, 30);

    const orderWhere: Prisma.OrderWhereInput = {
      ...scope.orderWhere,
      deletedAt: null,
      createdAt: { gte: startAt, lt: endAt },
    };

    const sellerOrderSql = this.buildSellerSqlFilter(
      Prisma.sql`o."sellerId"`,
      scope.sellerIds,
    );
    const sellerLedgerSql = this.buildSellerSqlFilter(
      Prisma.sql`l."sellerId"`,
      scope.sellerIds,
    );

    const [orderAggregate, paymentAggregate, debitAggregate, creditAggregate, profitRows, warnRows] =
      await Promise.all([
        this.prisma.order.aggregate({
          where: orderWhere,
          _count: { _all: true },
          _sum: { totalAmountCents: true },
        }),
        this.prisma.payment.aggregate({
          where: {
            businessId: scope.businessId,
            createdAt: { gte: startAt, lt: endAt },
            order: {
              ...scope.orderWhere,
              deletedAt: null,
            },
          },
          _sum: { amountCents: true },
        }),
        this.prisma.customerLedgerEntry.aggregate({
          where: {
            businessId: scope.businessId,
            ...(scope.sellerIds ? { sellerId: { in: scope.sellerIds } } : {}),
            type: 'DEBIT',
          },
          _sum: { amountCents: true },
        }),
        this.prisma.customerLedgerEntry.aggregate({
          where: {
            businessId: scope.businessId,
            ...(scope.sellerIds ? { sellerId: { in: scope.sellerIds } } : {}),
            type: 'CREDIT',
          },
          _sum: { amountCents: true },
        }),
        this.prisma.$queryRaw<
          Array<{
            grossProfitCents: bigint | number;
            shippingCostCents: bigint | number;
            commissionCostCents: bigint | number;
            returnCostCents: bigint | number;
          }>
        >(
          Prisma.sql`
            SELECT
              COALESCE(
                SUM((oi."unitPriceCents" - COALESCE(oi."costSnapshotCents", 0)) * oi."quantity"),
                0
              )::bigint AS "grossProfitCents",
              COALESCE(
                SUM(
                  COALESCE(
                    NULLIF(oi."shippingAllocationCents", 0),
                    CASE
                      WHEN o."totalAmountCents" > 0
                        THEN ROUND(
                          COALESCE(o."shippingCostCents", 0)::numeric
                          * (oi."totalAmountCents"::numeric / o."totalAmountCents"::numeric)
                        )::int
                      ELSE 0
                    END
                  )
                ),
                0
              )::bigint AS "shippingCostCents",
              COALESCE(
                SUM(
                  COALESCE(
                    NULLIF(oi."commissionAllocationCents", 0),
                    CASE
                      WHEN o."totalAmountCents" > 0
                        THEN ROUND(
                          COALESCE(o."commissionSnapshotCents", 0)::numeric
                          * (oi."totalAmountCents"::numeric / o."totalAmountCents"::numeric)
                        )::int
                      ELSE 0
                    END
                  )
                ),
                0
              )::bigint AS "commissionCostCents",
              COALESCE(
                SUM(
                  COALESCE(
                    NULLIF(oi."returnAllocationCents", 0),
                    CASE
                      WHEN o."totalAmountCents" > 0
                        THEN ROUND(
                          COALESCE(o."returnCostCents", 0)::numeric
                          * (oi."totalAmountCents"::numeric / o."totalAmountCents"::numeric)
                        )::int
                      ELSE 0
                    END
                  )
                ),
                0
              )::bigint AS "returnCostCents"
            FROM "OrderItem" oi
            INNER JOIN "Order" o
              ON o."id" = oi."orderId"
             AND o."businessId" = oi."businessId"
            WHERE o."businessId" = ${scope.businessId}
              AND o."deletedAt" IS NULL
              AND o."createdAt" >= ${startAt}
              AND o."createdAt" < ${endAt}
              ${sellerOrderSql}
          `,
        ),
        this.prisma.$queryRaw<Array<{ warnCount: bigint | number }>>(Prisma.sql`
          SELECT COUNT(*)::int AS "warnCount"
          FROM (
            SELECT c."id"
            FROM "Customer" c
            INNER JOIN (
              SELECT
                l."customerId",
                COALESCE(
                  SUM(
                    CASE
                      WHEN l."type" = 'DEBIT' THEN l."amountCents"
                      ELSE -l."amountCents"
                    END
                  ),
                  0
                )::bigint AS "debtCents"
              FROM "CustomerLedgerEntry" l
              WHERE l."businessId" = ${scope.businessId}
                ${sellerLedgerSql}
              GROUP BY l."customerId"
            ) debt ON debt."customerId" = c."id"
            WHERE c."businessId" = ${scope.businessId}
              AND c."deletedAt" IS NULL
              AND c."creditBlockPolicy" = 'WARN'
              AND c."creditLimitCents" IS NOT NULL
              AND debt."debtCents" > c."creditLimitCents"
          ) warn_customers
        `),
      ]);

    const grossRevenueCents = Number(orderAggregate._sum.totalAmountCents ?? 0);
    const collectedCents = Number(paymentAggregate._sum.amountCents ?? 0);
    const totalDebit = Number(debitAggregate._sum.amountCents ?? 0);
    const totalCredit = Number(creditAggregate._sum.amountCents ?? 0);
    const openCreditCents = Math.max(totalDebit - totalCredit, 0);
    const grossProfitCents = Number(profitRows[0]?.grossProfitCents ?? 0);
    const shippingCostCents = Number(profitRows[0]?.shippingCostCents ?? 0);
    const commissionCostCents = Number(profitRows[0]?.commissionCostCents ?? 0);
    const returnCostCents = Number(profitRows[0]?.returnCostCents ?? 0);
    const netProfitV2Cents =
      grossProfitCents - shippingCostCents - commissionCostCents - returnCostCents;
    const warnCount = Number(warnRows[0]?.warnCount ?? 0);

    return {
      range: { startAt, endAt },
      orderCount: orderAggregate._count._all,
      grossRevenueCents,
      collectedCents,
      grossProfitCents,
      netProfitV2Cents,
      shippingCostCents,
      commissionCostCents,
      returnCostCents,
      openCreditCents,
      warnCount,
      averageOrderValueCents:
        orderAggregate._count._all > 0
          ? Math.round(grossRevenueCents / orderAggregate._count._all)
          : 0,
    };
  }

  async getSellerUserSalesReport(
    currentUser: JwtPayload,
    params?: { dateFrom?: string; dateTo?: string; sellerId?: number },
  ) {
    const scope = await this.resolveSellerScope(currentUser, params?.sellerId);
    const { startAt, endAt } = this.parseDateRange(params, 30);

    const orderWhere: Prisma.OrderWhereInput = {
      ...scope.orderWhere,
      deletedAt: null,
      createdAt: { gte: startAt, lt: endAt },
    };

    const sellerOrderSql = this.buildSellerSqlFilter(
      Prisma.sql`o."sellerId"`,
      scope.sellerIds,
    );

    const [orderGroups, profitRows] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['createdByUserId'],
        where: orderWhere,
        _count: { _all: true },
        _sum: { totalAmountCents: true },
      }),
      this.prisma.$queryRaw<
        Array<{
          userId: number;
          profitCents: bigint | number;
          shippingCostCents: bigint | number;
          commissionCostCents: bigint | number;
          returnCostCents: bigint | number;
        }>
      >(
        Prisma.sql`
          SELECT
            o."createdByUserId" AS "userId",
            COALESCE(
              SUM((oi."unitPriceCents" - COALESCE(oi."costSnapshotCents", 0)) * oi."quantity"),
              0
            )::bigint AS "profitCents",
            COALESCE(
              SUM(
                COALESCE(
                  NULLIF(oi."shippingAllocationCents", 0),
                  CASE
                    WHEN o."totalAmountCents" > 0
                      THEN ROUND(
                        COALESCE(o."shippingCostCents", 0)::numeric
                        * (oi."totalAmountCents"::numeric / o."totalAmountCents"::numeric)
                      )::int
                    ELSE 0
                  END
                )
              ),
              0
            )::bigint AS "shippingCostCents",
            COALESCE(
              SUM(
                COALESCE(
                  NULLIF(oi."commissionAllocationCents", 0),
                  CASE
                    WHEN o."totalAmountCents" > 0
                      THEN ROUND(
                        COALESCE(o."commissionSnapshotCents", 0)::numeric
                        * (oi."totalAmountCents"::numeric / o."totalAmountCents"::numeric)
                      )::int
                    ELSE 0
                  END
                )
              ),
              0
            )::bigint AS "commissionCostCents",
            COALESCE(
              SUM(
                COALESCE(
                  NULLIF(oi."returnAllocationCents", 0),
                  CASE
                    WHEN o."totalAmountCents" > 0
                      THEN ROUND(
                        COALESCE(o."returnCostCents", 0)::numeric
                        * (oi."totalAmountCents"::numeric / o."totalAmountCents"::numeric)
                      )::int
                    ELSE 0
                  END
                )
              ),
              0
            )::bigint AS "returnCostCents"
          FROM "Order" o
          INNER JOIN "OrderItem" oi
            ON oi."orderId" = o."id"
           AND oi."businessId" = o."businessId"
          WHERE o."businessId" = ${scope.businessId}
            AND o."deletedAt" IS NULL
            AND o."createdAt" >= ${startAt}
            AND o."createdAt" < ${endAt}
            ${sellerOrderSql}
          GROUP BY o."createdByUserId"
        `,
      ),
    ]);

    const userIds = orderGroups.map((row) => row.createdByUserId);
    const users =
      userIds.length > 0
        ? await this.prisma.user.findMany({
            where: {
              businessId: scope.businessId,
              id: { in: userIds },
            },
            select: {
              id: true,
              name: true,
              role: true,
            },
          })
        : [];

    const userMap = new Map(users.map((row) => [row.id, row] as const));
    const profitMap = new Map(
      profitRows.map((row) => [
        Number(row.userId),
        {
          grossProfitCents: Number(row.profitCents ?? 0),
          shippingCostCents: Number(row.shippingCostCents ?? 0),
          commissionCostCents: Number(row.commissionCostCents ?? 0),
          returnCostCents: Number(row.returnCostCents ?? 0),
        },
      ] as const),
    );

    const rows = orderGroups
      .map((group) => {
        const user = userMap.get(group.createdByUserId);
        const salesTotalCents = Number(group._sum.totalAmountCents ?? 0);
        const orderCount = group._count._all;
        const profit = profitMap.get(group.createdByUserId) ?? {
          grossProfitCents: 0,
          shippingCostCents: 0,
          commissionCostCents: 0,
          returnCostCents: 0,
        };
        const netProfitV2Cents =
          profit.grossProfitCents -
          profit.shippingCostCents -
          profit.commissionCostCents -
          profit.returnCostCents;

        return {
          userId: group.createdByUserId,
          userName: user?.name ?? `User #${group.createdByUserId}`,
          role: user?.role ?? null,
          orderCount,
          salesTotalCents,
          profitCents: profit.grossProfitCents,
          netProfitV2Cents,
          shippingCostCents: profit.shippingCostCents,
          commissionCostCents: profit.commissionCostCents,
          returnCostCents: profit.returnCostCents,
          averageOrderValueCents:
            orderCount > 0 ? Math.round(salesTotalCents / orderCount) : 0,
        };
      })
      .sort((a, b) => b.salesTotalCents - a.salesTotalCents);

    return {
      range: { startAt, endAt },
      rows,
      totals: {
        orderCount: rows.reduce((acc, row) => acc + row.orderCount, 0),
        salesTotalCents: rows.reduce((acc, row) => acc + row.salesTotalCents, 0),
        profitCents: rows.reduce((acc, row) => acc + row.profitCents, 0),
        netProfitV2Cents: rows.reduce((acc, row) => acc + row.netProfitV2Cents, 0),
        shippingCostCents: rows.reduce((acc, row) => acc + row.shippingCostCents, 0),
        commissionCostCents: rows.reduce(
          (acc, row) => acc + row.commissionCostCents,
          0,
        ),
        returnCostCents: rows.reduce((acc, row) => acc + row.returnCostCents, 0),
      },
    };
  }

  async getSellerProductProfitReport(
    currentUser: JwtPayload,
    params?: {
      dateFrom?: string;
      dateTo?: string;
      sellerId?: number;
      limit?: number;
    },
  ) {
    const scope = await this.resolveSellerScope(currentUser, params?.sellerId);
    const { startAt, endAt } = this.parseDateRange(params, 30);
    const limit = Math.min(Math.max(Number(params?.limit ?? 50), 1), 200);

    const sellerOrderSql = this.buildSellerSqlFilter(
      Prisma.sql`o."sellerId"`,
      scope.sellerIds,
    );

    const rows = await this.prisma.$queryRaw<
      Array<{
        productId: number;
        productName: string;
        quantity: bigint | number;
        salesCents: bigint | number;
        costCents: bigint | number;
        profitCents: bigint | number;
        shippingCostCents: bigint | number;
        commissionCostCents: bigint | number;
        returnCostCents: bigint | number;
      }>
    >(Prisma.sql`
      SELECT
        oi."productId" AS "productId",
        COALESCE(MAX(oi."productName"), CONCAT('#', oi."productId"::text)) AS "productName",
        COALESCE(SUM(oi."quantity"), 0)::bigint AS "quantity",
        COALESCE(SUM(oi."totalAmountCents"), 0)::bigint AS "salesCents",
        COALESCE(SUM(COALESCE(oi."costSnapshotCents", 0) * oi."quantity"), 0)::bigint AS "costCents",
        COALESCE(
          SUM((oi."unitPriceCents" - COALESCE(oi."costSnapshotCents", 0)) * oi."quantity"),
          0
        )::bigint AS "profitCents",
        COALESCE(
          SUM(
            COALESCE(
              NULLIF(oi."shippingAllocationCents", 0),
              CASE
                WHEN o."totalAmountCents" > 0
                  THEN ROUND(
                    COALESCE(o."shippingCostCents", 0)::numeric
                    * (oi."totalAmountCents"::numeric / o."totalAmountCents"::numeric)
                  )::int
                ELSE 0
              END
            )
          ),
          0
        )::bigint AS "shippingCostCents",
        COALESCE(
          SUM(
            COALESCE(
              NULLIF(oi."commissionAllocationCents", 0),
              CASE
                WHEN o."totalAmountCents" > 0
                  THEN ROUND(
                    COALESCE(o."commissionSnapshotCents", 0)::numeric
                    * (oi."totalAmountCents"::numeric / o."totalAmountCents"::numeric)
                  )::int
                ELSE 0
              END
            )
          ),
          0
        )::bigint AS "commissionCostCents",
        COALESCE(
          SUM(
            COALESCE(
              NULLIF(oi."returnAllocationCents", 0),
              CASE
                WHEN o."totalAmountCents" > 0
                  THEN ROUND(
                    COALESCE(o."returnCostCents", 0)::numeric
                    * (oi."totalAmountCents"::numeric / o."totalAmountCents"::numeric)
                  )::int
                ELSE 0
              END
            )
          ),
          0
        )::bigint AS "returnCostCents"
      FROM "OrderItem" oi
      INNER JOIN "Order" o
        ON o."id" = oi."orderId"
       AND o."businessId" = oi."businessId"
      WHERE o."businessId" = ${scope.businessId}
        AND o."deletedAt" IS NULL
        AND o."createdAt" >= ${startAt}
        AND o."createdAt" < ${endAt}
        ${sellerOrderSql}
      GROUP BY oi."productId"
      ORDER BY "salesCents" DESC
      LIMIT ${limit}
    `);

    const normalizedRows = rows.map((row) => ({
      productId: Number(row.productId),
      productName: row.productName,
      quantity: Number(row.quantity ?? 0),
      salesCents: Number(row.salesCents ?? 0),
      costCents: Number(row.costCents ?? 0),
      profitCents: Number(row.profitCents ?? 0),
      shippingCostCents: Number(row.shippingCostCents ?? 0),
      commissionCostCents: Number(row.commissionCostCents ?? 0),
      returnCostCents: Number(row.returnCostCents ?? 0),
      netProfitV2Cents:
        Number(row.profitCents ?? 0) -
        Number(row.shippingCostCents ?? 0) -
        Number(row.commissionCostCents ?? 0) -
        Number(row.returnCostCents ?? 0),
    }));

    return {
      range: { startAt, endAt },
      rows: normalizedRows,
      totals: {
        quantity: normalizedRows.reduce((acc, row) => acc + row.quantity, 0),
        salesCents: normalizedRows.reduce((acc, row) => acc + row.salesCents, 0),
        costCents: normalizedRows.reduce((acc, row) => acc + row.costCents, 0),
        profitCents: normalizedRows.reduce((acc, row) => acc + row.profitCents, 0),
        netProfitV2Cents: normalizedRows.reduce(
          (acc, row) => acc + row.netProfitV2Cents,
          0,
        ),
        shippingCostCents: normalizedRows.reduce(
          (acc, row) => acc + row.shippingCostCents,
          0,
        ),
        commissionCostCents: normalizedRows.reduce(
          (acc, row) => acc + row.commissionCostCents,
          0,
        ),
        returnCostCents: normalizedRows.reduce(
          (acc, row) => acc + row.returnCostCents,
          0,
        ),
      },
    };
  }

  async ensureCommissionForFinalOrder(params: {
    businessId: number;
    orderId: number;
    beneficiaryUserId: number;
    grossAmountCents: number;
  }) {
    const rate = await this.getCommissionRate(params.businessId);
    const gross = Math.max(0, Math.floor(params.grossAmountCents));
    const commissionAmountCents = Math.max(0, Math.round(gross * rate));
    const netAmountCents = Math.max(0, gross - commissionAmountCents);

    await this.prisma.commission.upsert({
      where: { orderId: params.orderId },
      update: {},
      create: {
        businessId: params.businessId,
        beneficiaryUserId: params.beneficiaryUserId,
        orderId: params.orderId,
        rate,
        grossAmountCents: gross,
        commissionAmountCents,
        netAmountCents,
      },
      select: { id: true },
    });

    await this.prisma.order.updateMany({
      where: {
        id: params.orderId,
        businessId: params.businessId,
      },
      data: {
        commissionSnapshotCents: commissionAmountCents,
      },
    });
  }
}

