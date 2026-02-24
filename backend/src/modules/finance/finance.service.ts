import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FinanceLedgerAccountType,
  FinanceLedgerDirection,
  FinanceLedgerEventType,
  OrderSource,
  Prisma,
  PayoutRequestStatus,
  ReturnRequestStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { LedgerPostingService } from '../../core/commerce';
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
    private readonly ledgerPostingService: LedgerPostingService,
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

  private parseOptionalDateRange(params?: { dateFrom?: string; dateTo?: string }) {
    const fromRaw = params?.dateFrom?.trim();
    const toRaw = params?.dateTo?.trim();

    let startAt: Date | undefined;
    let endAtExclusive: Date | undefined;

    if (fromRaw) {
      startAt = new Date(`${fromRaw}T00:00:00.000Z`);
      if (Number.isNaN(startAt.getTime())) {
        throw new BadRequestException('dateFrom gecersiz');
      }
    }

    if (toRaw) {
      endAtExclusive = new Date(`${toRaw}T00:00:00.000Z`);
      if (Number.isNaN(endAtExclusive.getTime())) {
        throw new BadRequestException('dateTo gecersiz');
      }
      endAtExclusive.setUTCDate(endAtExclusive.getUTCDate() + 1);
    }

    if (startAt && endAtExclusive && endAtExclusive <= startAt) {
      throw new BadRequestException('dateTo, dateFrom tarihinden once olamaz');
    }

    return { startAt, endAtExclusive };
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
      sellerId: number;
      amountCents: number;
      status: string;
      requestedAt: Date;
      approvedAt?: Date | null;
      paidAt?: Date | null;
      rejectedAt?: Date | null;
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
    const sellerId = await this.resolveSellerProfileId(businessId, userId);
    if (!sellerId) {
      throw new ForbiddenException('Aktif seller profili bulunamadi');
    }

    const where = { businessId, sellerId };
    const total = await this.prisma.payoutRequest.count({ where });
    const meta = buildPaginationMeta(total, page, pageSize);
    const { skip, take } = paginationToSkipTake(meta);

    const data = await this.prisma.payoutRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        sellerId: true,
        amountCents: true,
        status: true,
        createdAt: true,
        approvedAt: true,
        paidAt: true,
        rejectedAt: true,
      },
    });

    return {
      data: data.map((row) => ({
        id: row.id,
        sellerId: row.sellerId,
        amountCents: row.amountCents,
        status: row.status,
        requestedAt: row.createdAt,
        approvedAt: row.approvedAt,
        paidAt: row.paidAt,
        rejectedAt: row.rejectedAt,
      })),
      meta,
    };
  }

  async listPlatformPayouts(
    currentUser: JwtPayload,
    params?: { status?: string; page?: number; pageSize?: number },
  ): Promise<{
    data: Array<{
      id: number;
      sellerId: number;
      amountCents: number;
      status: string;
      requestedAt: Date;
      approvedAt?: Date | null;
      paidAt?: Date | null;
      rejectedAt?: Date | null;
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
    const where: { businessId: number; status?: PayoutRequestStatus } = {
      businessId,
    };
    if (status) {
      const normalizedStatus = status.toUpperCase() as PayoutRequestStatus;
      if (!Object.values(PayoutRequestStatus).includes(normalizedStatus)) {
        throw new BadRequestException('status gecersiz');
      }
      where.status = normalizedStatus;
    }

    const total = await this.prisma.payoutRequest.count({ where });
    const meta = buildPaginationMeta(total, page, pageSize);
    const { skip, take } = paginationToSkipTake(meta);

    const data = await this.prisma.payoutRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        sellerId: true,
        amountCents: true,
        status: true,
        createdAt: true,
        approvedAt: true,
        paidAt: true,
        rejectedAt: true,
      },
    });

    return {
      data: data.map((row) => ({
        id: row.id,
        sellerId: row.sellerId,
        amountCents: row.amountCents,
        status: row.status,
        requestedAt: row.createdAt,
        approvedAt: row.approvedAt,
        paidAt: row.paidAt,
        rejectedAt: row.rejectedAt,
      })),
      meta,
    };
  }

  private async getSellerPayoutabilityBySellerId(
    businessId: number,
    sellerId: number,
  ): Promise<{
    pendingBalanceCents: number;
    availableBalanceCents: number;
    reservedByRequestsCents: number;
    availableForRequestCents: number;
    currency: string;
  }> {
    const wallet = await this.prisma.sellerWallet.findFirst({
      where: { businessId, sellerId },
      select: {
        pendingBalanceCents: true,
        availableBalanceCents: true,
        currency: true,
      },
    });

    const requestAggregate = await this.prisma.payoutRequest.aggregate({
      where: {
        businessId,
        sellerId,
        status: { in: [PayoutRequestStatus.REQUESTED, PayoutRequestStatus.APPROVED] },
      },
      _sum: { amountCents: true },
    });

    const pendingBalanceCents = Number(wallet?.pendingBalanceCents ?? 0);
    const availableBalanceCents = Number(wallet?.availableBalanceCents ?? 0);
    const reservedByRequestsCents = Number(
      requestAggregate._sum.amountCents ?? 0,
    );
    const availableForRequestCents = Math.max(
      availableBalanceCents - reservedByRequestsCents,
      0,
    );

    return {
      pendingBalanceCents,
      availableBalanceCents,
      reservedByRequestsCents,
      availableForRequestCents,
      currency: wallet?.currency ?? 'TRY',
    };
  }

  async requestPayout(currentUser: JwtPayload, amountCents: number) {
    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);

    if (currentUser.role !== 'SELLER') {
      throw new ForbiddenException('Access denied');
    }

    const requested = Number(amountCents);
    if (!Number.isFinite(requested) || requested <= 0) {
      throw new BadRequestException('Invalid amount');
    }
    const sellerId = await this.resolveSellerProfileId(businessId, userId);
    if (!sellerId) {
      throw new ForbiddenException('Aktif seller profili bulunamadi');
    }

    const payoutability = await this.getSellerPayoutabilityBySellerId(
      businessId,
      sellerId,
    );
    if (requested > payoutability.availableForRequestCents) {
      throw new ForbiddenException('Insufficient available balance');
    }

    return this.prisma.payoutRequest.create({
      data: {
        businessId,
        sellerId,
        amountCents: Math.floor(requested),
        currency: payoutability.currency,
        status: PayoutRequestStatus.REQUESTED,
      },
      select: {
        id: true,
        sellerId: true,
        amountCents: true,
        status: true,
        createdAt: true,
        approvedAt: true,
        paidAt: true,
        rejectedAt: true,
      },
    });
  }

  async approvePayout(currentUser: JwtPayload, payoutId: number) {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);

    const existing = await this.prisma.payoutRequest.findFirst({
      where: { id: payoutId, businessId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Payout not found');
    }

    const updated = await this.prisma.payoutRequest.updateMany({
      where: {
        id: payoutId,
        businessId,
        status: PayoutRequestStatus.REQUESTED,
      },
      data: {
        status: PayoutRequestStatus.APPROVED,
        approvedAt: new Date(),
      },
    });

    if (updated.count === 0) {
      const current = await this.prisma.payoutRequest.findFirst({
        where: { id: payoutId, businessId },
        select: { status: true },
      });
      throw new ConflictException(
        `Payout state changed. Current status: ${current?.status ?? 'unknown'}`,
      );
    }

    return this.prisma.payoutRequest.findUniqueOrThrow({
      where: { id: payoutId },
      select: {
        id: true,
        sellerId: true,
        amountCents: true,
        status: true,
        createdAt: true,
        approvedAt: true,
        paidAt: true,
        rejectedAt: true,
      },
    });
  }

  async completePayout(currentUser: JwtPayload, payoutId: number) {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);

    return this.prisma.$transaction(async (tx) => {
      const payout = await tx.payoutRequest.findFirst({
        where: {
          id: payoutId,
          businessId,
        },
        select: {
          id: true,
          sellerId: true,
          amountCents: true,
          currency: true,
          status: true,
        },
      });

      if (!payout) {
        throw new NotFoundException('Payout not found');
      }
      if (payout.status !== PayoutRequestStatus.APPROVED) {
        throw new ConflictException(
          `Payout state changed. Current status: ${payout.status}`,
        );
      }

      await this.ledgerPostingService.postPayoutPaid(
        {
          businessId,
          payoutRequestId: payout.id,
          sellerId: payout.sellerId,
          amountCents: payout.amountCents,
          currency: payout.currency,
          metadata: {
            action: 'admin_mark_paid',
            payoutRequestId: payout.id,
          },
        },
        tx,
      );

      await tx.payoutRequest.update({
        where: { id: payout.id },
        data: {
          status: PayoutRequestStatus.PAID,
          paidAt: new Date(),
        },
      });

      return tx.payoutRequest.findUniqueOrThrow({
        where: { id: payout.id },
        select: {
          id: true,
          sellerId: true,
          amountCents: true,
          status: true,
          createdAt: true,
          approvedAt: true,
          paidAt: true,
          rejectedAt: true,
        },
      });
    });
  }

  async rejectPayout(currentUser: JwtPayload, payoutId: number) {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);

    const updated = await this.prisma.payoutRequest.updateMany({
      where: {
        id: payoutId,
        businessId,
        status: {
          in: [PayoutRequestStatus.REQUESTED, PayoutRequestStatus.APPROVED],
        },
      },
      data: {
        status: PayoutRequestStatus.REJECTED,
        rejectedAt: new Date(),
      },
    });

    if (updated.count === 0) {
      const current = await this.prisma.payoutRequest.findFirst({
        where: { id: payoutId, businessId },
        select: { status: true },
      });
      if (!current) {
        throw new NotFoundException('Payout not found');
      }
      throw new ConflictException(
        `Payout state changed. Current status: ${current.status}`,
      );
    }

    return this.prisma.payoutRequest.findUniqueOrThrow({
      where: { id: payoutId },
      select: {
        id: true,
        sellerId: true,
        amountCents: true,
        status: true,
        createdAt: true,
        approvedAt: true,
        paidAt: true,
        rejectedAt: true,
      },
    });
  }

  async getSellerPayoutability(currentUser: JwtPayload) {
    if (currentUser.role !== 'SELLER') {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);
    const sellerId = await this.resolveSellerProfileId(businessId, userId);
    if (!sellerId) {
      throw new ForbiddenException('Aktif seller profili bulunamadi');
    }

    const payoutability = await this.getSellerPayoutabilityBySellerId(
      businessId,
      sellerId,
    );

    return {
      sellerId,
      ...payoutability,
    };
  }

  async releasePendingToAvailable(
    currentUser: JwtPayload,
    params?: { limit?: number },
  ) {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);
    const limit = Math.max(Math.trunc(Number(params?.limit ?? 200)), 1);
    const now = new Date();
    const releaseThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const eligibleOrders = await this.prisma.order.findMany({
      where: {
        businessId,
        deletedAt: null,
        sellerId: { not: null },
        payoutReleasedAt: null,
        createdAt: { lte: releaseThreshold },
        status: {
          key: 'COMPLETED',
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: {
        id: true,
        sellerId: true,
        currency: true,
        sellerPayoutCents: true,
        platformRevenueCents: true,
      },
    });

    let releasedOrderCount = 0;
    for (const order of eligibleOrders) {
      if (typeof order.sellerId !== 'number') continue;
      const sellerId = order.sellerId;

      await this.prisma.$transaction(async (tx) => {
        const lock = await tx.order.updateMany({
          where: {
            id: order.id,
            businessId,
            payoutReleasedAt: null,
          },
          data: {
            payoutReleasedAt: now,
          },
        });

        if (lock.count === 0) {
          return;
        }

        await this.ledgerPostingService.postPendingToAvailableRelease(
          {
            businessId,
            orderId: order.id,
            sellerId,
            currency: order.currency,
            sellerPayoutCents: order.sellerPayoutCents,
            platformRevenueCents: order.platformRevenueCents,
            metadata: {
              policy: 'COMPLETED_PLUS_T7',
              releasedAt: now.toISOString(),
            },
          },
          tx,
        );

        releasedOrderCount += 1;
      });
    }

    return {
      releaseThreshold,
      scannedCount: eligibleOrders.length,
      releasedOrderCount,
    };
  }

  async getFinanceHealth(
    currentUser: JwtPayload,
    params?: { payoutAgingDays?: number },
  ) {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const payoutAgingDays = Math.max(
      Math.trunc(Number(params?.payoutAgingDays ?? 3)),
      1,
    );
    const payoutAgingThreshold = new Date(
      now.getTime() - payoutAgingDays * 24 * 60 * 60 * 1000,
    );

    const [
      mismatchCount24h,
      totalOrders24h,
      negativeSellerWalletCount,
      negativePlatformWalletCount,
      payoutAgingCount,
      openPayoutRequestCount,
      orderSalesTodayAgg,
      ledgerNetSalesRows,
      imbalanceRows,
      sellerWalletTotals,
      platformWalletTotals,
      refundVolume24hRows,
    ] = await Promise.all([
      this.prisma.order.count({
        where: {
          businessId,
          deletedAt: null,
          priceMismatch: true,
          createdAt: { gte: last24h },
        },
      }),
      this.prisma.order.count({
        where: {
          businessId,
          deletedAt: null,
          createdAt: { gte: last24h },
        },
      }),
      this.prisma.sellerWallet.count({
        where: {
          businessId,
          OR: [
            { pendingBalanceCents: { lt: 0 } },
            { availableBalanceCents: { lt: 0 } },
          ],
        },
      }),
      this.prisma.platformWallet.count({
        where: {
          businessId,
          OR: [
            { pendingBalanceCents: { lt: 0 } },
            { availableBalanceCents: { lt: 0 } },
            { reserveBalanceCents: { lt: 0 } },
          ],
        },
      }),
      this.prisma.payoutRequest.count({
        where: {
          businessId,
          status: {
            in: [PayoutRequestStatus.REQUESTED, PayoutRequestStatus.APPROVED],
          },
          createdAt: { lte: payoutAgingThreshold },
        },
      }),
      this.prisma.payoutRequest.count({
        where: {
          businessId,
          status: {
            in: [PayoutRequestStatus.REQUESTED, PayoutRequestStatus.APPROVED],
          },
        },
      }),
      this.prisma.order.aggregate({
        where: {
          businessId,
          deletedAt: null,
          createdAt: { gte: todayStart },
        },
        _sum: { totalAmountCents: true },
      }),
      this.prisma.$queryRaw<Array<{ amount: bigint | number }>>`
        SELECT COALESCE(
          SUM(
            CASE
              WHEN "direction" = 'DEBIT' THEN "amountCents"
              ELSE -"amountCents"
            END
          ),
          0
        )::bigint AS amount
        FROM "FinanceLedgerEntry"
        WHERE "businessId" = ${businessId}
          AND "accountType" = 'CLEARING'
          AND "createdAt" >= ${todayStart}
      `,
      this.prisma.$queryRaw<Array<{ count: bigint | number }>>`
        SELECT COUNT(*)::bigint AS count
        FROM (
          SELECT "eventId"
          FROM "FinanceLedgerEntry"
          WHERE "businessId" = ${businessId}
          GROUP BY "eventId"
          HAVING
            SUM(CASE WHEN "direction" = 'DEBIT' THEN "amountCents" ELSE 0 END) !=
            SUM(CASE WHEN "direction" = 'CREDIT' THEN "amountCents" ELSE 0 END)
        ) AS imbalances
      `,
      this.prisma.sellerWallet.aggregate({
        where: { businessId },
        _sum: {
          pendingBalanceCents: true,
          availableBalanceCents: true,
        },
      }),
      this.prisma.platformWallet.aggregate({
        where: { businessId },
        _sum: {
          pendingBalanceCents: true,
          availableBalanceCents: true,
        },
      }),
      this.prisma.$queryRaw<Array<{ amount: bigint | number }>>`
        SELECT COALESCE(SUM("amountCents"), 0)::bigint AS amount
        FROM "FinanceLedgerEntry"
        WHERE "businessId" = ${businessId}
          AND "eventType" = 'ORDER_REFUND'
          AND "accountType" = 'CLEARING'
          AND "direction" = 'CREDIT'
          AND "createdAt" >= ${last24h}
      `,
    ]);

    const orderNetSalesTodayCents = Number(
      orderSalesTodayAgg._sum.totalAmountCents ?? 0,
    );
    const ledgerNetSalesTodayCents = Number(ledgerNetSalesRows[0]?.amount ?? 0);
    const ledgerImbalanceEventCount = Number(imbalanceRows[0]?.count ?? 0);
    const mismatchRate24h =
      totalOrders24h > 0 ? mismatchCount24h / totalOrders24h : 0;
    const sellerPendingTotalCents = Number(
      sellerWalletTotals._sum.pendingBalanceCents ?? 0,
    );
    const sellerAvailableTotalCents = Number(
      sellerWalletTotals._sum.availableBalanceCents ?? 0,
    );
    const platformPendingTotalCents = Number(
      platformWalletTotals._sum.pendingBalanceCents ?? 0,
    );
    const platformAvailableTotalCents = Number(
      platformWalletTotals._sum.availableBalanceCents ?? 0,
    );
    const refundVolume24hCents = Number(refundVolume24hRows[0]?.amount ?? 0);

    return {
      lastCheckedAt: now,
      ledgerInvariant: {
        ok: ledgerImbalanceEventCount === 0,
        imbalanceEventCount: ledgerImbalanceEventCount,
      },
      walletHealth: {
        negativeSellerWalletCount,
        negativePlatformWalletCount,
      },
      risk: {
        mismatchCount24h,
        totalOrders24h,
        mismatchRate24h,
      },
      payouts: {
        payoutAgingDays,
        agingOpenRequestCount: payoutAgingCount,
        openRequestCount: openPayoutRequestCount,
      },
      wallets: {
        sellerPendingTotalCents,
        sellerAvailableTotalCents,
        platformPendingTotalCents,
        platformAvailableTotalCents,
      },
      refunds: {
        volume24hCents: refundVolume24hCents,
      },
      reconciliation: {
        orderNetSalesTodayCents,
        ledgerNetSalesTodayCents,
        deltaCents: orderNetSalesTodayCents - ledgerNetSalesTodayCents,
      },
    };
  }

  async listPriceMismatches(
    currentUser: JwtPayload,
    params?: { page?: number; pageSize?: number },
  ): Promise<{
    data: Array<{
      orderId: number;
      sellerId?: number | null;
      staffUserId: number;
      source: string;
      totalAmountCents: number;
      createdAt: Date;
      meta?: unknown;
    }>;
    meta: PaginationMeta;
  }> {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);
    const page = clampPage(Number(params?.page ?? 1));
    const pageSize = clampPageSize(Number(params?.pageSize ?? 20));

    const where = {
      businessId,
      deletedAt: null as null,
      priceMismatch: true,
    };

    const total = await this.prisma.order.count({ where });
    const meta = buildPaginationMeta(total, page, pageSize);
    const { skip, take } = paginationToSkipTake(meta);

    const rows = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        sellerId: true,
        createdByUserId: true,
        source: true,
        totalAmountCents: true,
        createdAt: true,
        priceMismatchMetaJson: true,
      },
    });

    return {
      data: rows.map((row) => ({
        orderId: row.id,
        sellerId: row.sellerId,
        staffUserId: row.createdByUserId,
        source: row.source,
        totalAmountCents: row.totalAmountCents,
        createdAt: row.createdAt,
        meta: row.priceMismatchMetaJson ?? undefined,
      })),
      meta,
    };
  }

  async listFinanceLedger(
    currentUser: JwtPayload,
    params?: {
      page?: number;
      pageSize?: number;
      sellerId?: number;
      dateFrom?: string;
      dateTo?: string;
      type?: string;
      channel?: string;
      orderId?: number;
    },
  ): Promise<{
    data: Array<{
      id: number;
      timestamp: Date;
      accountType: string;
      direction: string;
      amountCents: number;
      currency: string;
      orderId?: number | null;
      sellerId?: number | null;
      eventType: string;
      channel?: string | null;
      reference: string;
    }>;
    meta: PaginationMeta;
  }> {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);
    const page = clampPage(Number(params?.page ?? 1));
    const pageSize = clampPageSize(Number(params?.pageSize ?? 20));
    const normalizedSellerId =
      typeof params?.sellerId === 'number' && Number.isFinite(params.sellerId)
        ? Math.trunc(params.sellerId)
        : undefined;
    const normalizedOrderId =
      typeof params?.orderId === 'number' && Number.isFinite(params.orderId)
        ? Math.trunc(params.orderId)
        : undefined;

    if (normalizedSellerId !== undefined && normalizedSellerId <= 0) {
      throw new BadRequestException('sellerId gecersiz');
    }
    if (normalizedOrderId !== undefined && normalizedOrderId <= 0) {
      throw new BadRequestException('orderId gecersiz');
    }

    const { startAt, endAtExclusive } = this.parseOptionalDateRange({
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
    });
    const where: Prisma.FinanceLedgerEntryWhereInput = {
      businessId,
      ...(normalizedSellerId ? { sellerId: normalizedSellerId } : {}),
      ...(normalizedOrderId ? { orderId: normalizedOrderId } : {}),
      ...(startAt || endAtExclusive
        ? {
            createdAt: {
              ...(startAt ? { gte: startAt } : {}),
              ...(endAtExclusive ? { lt: endAtExclusive } : {}),
            },
          }
        : {}),
    };

    const typeRaw = (params?.type ?? '').trim().toUpperCase();
    if (typeRaw) {
      const groupedTypeMap: Record<string, FinanceLedgerEventType[]> = {
        ORDER: [FinanceLedgerEventType.ORDER_SALE, FinanceLedgerEventType.RELEASE_AVAILABLE],
        REFUND: [FinanceLedgerEventType.ORDER_REFUND],
        PAYOUT: [FinanceLedgerEventType.PAYOUT_REQUEST, FinanceLedgerEventType.PAYOUT_PAID],
      };

      if (groupedTypeMap[typeRaw]) {
        where.eventType = { in: groupedTypeMap[typeRaw] };
      } else {
        const normalizedEventType = typeRaw as FinanceLedgerEventType;
        if (!Object.values(FinanceLedgerEventType).includes(normalizedEventType)) {
          throw new BadRequestException('type gecersiz');
        }
        where.eventType = normalizedEventType;
      }
    }

    const orderWhere: Prisma.OrderWhereInput = {};
    const channelRaw = (params?.channel ?? '').trim().toUpperCase();
    if (channelRaw) {
      if (channelRaw === 'POS') {
        orderWhere.source = OrderSource.POS;
      } else if (
        channelRaw === 'MARKETPLACE' ||
        channelRaw === 'ONLINE' ||
        channelRaw === 'WEB'
      ) {
        orderWhere.source = { in: [OrderSource.WEB, OrderSource.MOBILE] };
      } else if (channelRaw === 'MANUAL') {
        orderWhere.source = OrderSource.API;
      } else {
        throw new BadRequestException('channel gecersiz');
      }
    }
    if (Object.keys(orderWhere).length > 0) {
      where.order = orderWhere;
    }

    const total = await this.prisma.financeLedgerEntry.count({ where });
    const meta = buildPaginationMeta(total, page, pageSize);
    const { skip, take } = paginationToSkipTake(meta);

    const rows = await this.prisma.financeLedgerEntry.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take,
      select: {
        id: true,
        eventType: true,
        accountType: true,
        direction: true,
        amountCents: true,
        currency: true,
        orderId: true,
        sellerId: true,
        payoutRequestId: true,
        eventId: true,
        createdAt: true,
        order: {
          select: {
            source: true,
          },
        },
      },
    });

    return {
      data: rows.map((row) => {
        const source = row.order?.source;
        const channel =
          source === OrderSource.POS
            ? 'POS'
            : source === OrderSource.WEB || source === OrderSource.MOBILE
              ? 'MARKETPLACE'
              : source === OrderSource.API
                ? 'MANUAL'
                : null;
        const reference = row.orderId
          ? `ORDER#${row.orderId}`
          : row.payoutRequestId
            ? `PAYOUT#${row.payoutRequestId}`
            : row.eventId;

        return {
          id: row.id,
          timestamp: row.createdAt,
          accountType: row.accountType,
          direction: row.direction,
          amountCents: row.amountCents,
          currency: row.currency,
          orderId: row.orderId,
          sellerId: row.sellerId,
          eventType: row.eventType,
          channel,
          reference,
        };
      }),
      meta,
    };
  }

  async listSellerWallets(
    currentUser: JwtPayload,
    params?: { page?: number; pageSize?: number },
  ): Promise<{
    data: Array<{
      sellerId: number;
      sellerName: string;
      currency: string;
      pendingBalanceCents: number;
      availableBalanceCents: number;
      totalEarnedCents: number;
      totalPaidOutCents: number;
      lastActivityAt?: Date | null;
    }>;
    meta: PaginationMeta;
  }> {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);
    const page = clampPage(Number(params?.page ?? 1));
    const pageSize = clampPageSize(Number(params?.pageSize ?? 20));

    const where = { businessId };
    const total = await this.prisma.sellerWallet.count({ where });
    const meta = buildPaginationMeta(total, page, pageSize);
    const { skip, take } = paginationToSkipTake(meta);

    const [walletRows, earnedRows, paidOutRows, activityRows] = await Promise.all([
      this.prisma.sellerWallet.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
        select: {
          sellerId: true,
          currency: true,
          pendingBalanceCents: true,
          availableBalanceCents: true,
          seller: {
            select: {
              displayName: true,
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.financeLedgerEntry.groupBy({
        by: ['sellerId'],
        where: {
          businessId,
          sellerId: { not: null },
          eventType: FinanceLedgerEventType.ORDER_SALE,
          accountType: FinanceLedgerAccountType.SELLER_PENDING,
          direction: FinanceLedgerDirection.CREDIT,
        },
        _sum: { amountCents: true },
      }),
      this.prisma.financeLedgerEntry.groupBy({
        by: ['sellerId'],
        where: {
          businessId,
          sellerId: { not: null },
          eventType: FinanceLedgerEventType.PAYOUT_PAID,
          accountType: FinanceLedgerAccountType.SELLER_AVAILABLE,
          direction: FinanceLedgerDirection.DEBIT,
        },
        _sum: { amountCents: true },
      }),
      this.prisma.financeLedgerEntry.groupBy({
        by: ['sellerId'],
        where: {
          businessId,
          sellerId: { not: null },
        },
        _max: { createdAt: true },
      }),
    ]);

    const earnedBySeller = new Map(
      earnedRows
        .filter((row) => typeof row.sellerId === 'number')
        .map((row) => [Number(row.sellerId), Number(row._sum.amountCents ?? 0)] as const),
    );
    const paidOutBySeller = new Map(
      paidOutRows
        .filter((row) => typeof row.sellerId === 'number')
        .map((row) => [Number(row.sellerId), Number(row._sum.amountCents ?? 0)] as const),
    );
    const activityBySeller = new Map(
      activityRows
        .filter((row) => typeof row.sellerId === 'number')
        .map(
          (row) =>
            [Number(row.sellerId), (row._max.createdAt as Date | null) ?? null] as const,
        ),
    );

    return {
      data: walletRows.map((row) => ({
        sellerId: row.sellerId,
        sellerName:
          row.seller.displayName ||
          row.seller.user?.name ||
          `Seller #${row.sellerId}`,
        currency: row.currency,
        pendingBalanceCents: row.pendingBalanceCents,
        availableBalanceCents: row.availableBalanceCents,
        totalEarnedCents: earnedBySeller.get(row.sellerId) ?? 0,
        totalPaidOutCents: paidOutBySeller.get(row.sellerId) ?? 0,
        lastActivityAt: activityBySeller.get(row.sellerId) ?? null,
      })),
      meta,
    };
  }

  async listRefundRequests(
    currentUser: JwtPayload,
    params?: { status?: string; page?: number; pageSize?: number },
  ): Promise<{
    data: Array<{
      id: number;
      orderId: number;
      sellerId?: number | null;
      customerId: number;
      status: string;
      reason?: string | null;
      responseNote?: string | null;
      requestedAt: Date;
      decidedAt?: Date | null;
      originalSnapshot: {
        subtotalAmountCents: number;
        commissionAmountCents: number;
        taxAmountCents: number;
        totalAmountCents: number;
      };
      refundAmountCents: number;
      ledgerPreview: Array<{
        accountType: string;
        direction: string;
        amountCents: number;
        createdAt: Date;
      }>;
    }>;
    meta: PaginationMeta;
  }> {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);
    const page = clampPage(Number(params?.page ?? 1));
    const pageSize = clampPageSize(Number(params?.pageSize ?? 20));

    const statusRaw = (params?.status ?? '').trim().toUpperCase();
    const where: Prisma.ReturnRequestWhereInput = { businessId };
    if (statusRaw) {
      const status = statusRaw as ReturnRequestStatus;
      if (!Object.values(ReturnRequestStatus).includes(status)) {
        throw new BadRequestException('status gecersiz');
      }
      where.status = status;
    }

    const total = await (this.prisma as any).returnRequest.count({ where });
    const meta = buildPaginationMeta(total, page, pageSize);
    const { skip, take } = paginationToSkipTake(meta);

    const requests: Array<{
      id: number;
      orderId: number;
      customerId: number;
      status: string;
      reason?: string | null;
      responseNote?: string | null;
      requestedAt: Date;
      decidedAt?: Date | null;
      order?: {
        sellerId?: number | null;
        subtotalAmountCents?: number;
        commissionSnapshotCents?: number;
        taxAmountCents?: number;
        totalAmountCents?: number;
      } | null;
    }> = await (this.prisma as any).returnRequest.findMany({
      where,
      orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
      skip,
      take,
      select: {
        id: true,
        orderId: true,
        customerId: true,
        status: true,
        reason: true,
        responseNote: true,
        requestedAt: true,
        decidedAt: true,
        order: {
          select: {
            sellerId: true,
            subtotalAmountCents: true,
            commissionSnapshotCents: true,
            taxAmountCents: true,
            totalAmountCents: true,
          },
        },
      },
    });

    const orderIds = Array.from(new Set(requests.map((row) => Number(row.orderId))));
    const refundLedgerRows =
      orderIds.length > 0
        ? await this.prisma.financeLedgerEntry.findMany({
            where: {
              businessId,
              eventType: FinanceLedgerEventType.ORDER_REFUND,
              orderId: { in: orderIds },
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            select: {
              orderId: true,
              accountType: true,
              direction: true,
              amountCents: true,
              createdAt: true,
            },
          })
        : [];

    const ledgerByOrderId = new Map<
      number,
      Array<{
        accountType: string;
        direction: string;
        amountCents: number;
        createdAt: Date;
      }>
    >();
    for (const row of refundLedgerRows) {
      if (typeof row.orderId !== 'number') continue;
      const bucket = ledgerByOrderId.get(row.orderId) ?? [];
      bucket.push({
        accountType: row.accountType,
        direction: row.direction,
        amountCents: row.amountCents,
        createdAt: row.createdAt,
      });
      ledgerByOrderId.set(row.orderId, bucket);
    }

    return {
      data: requests.map((row) => {
        const snapshot = {
          subtotalAmountCents: Number(row.order?.subtotalAmountCents ?? 0),
          commissionAmountCents: Number(row.order?.commissionSnapshotCents ?? 0),
          taxAmountCents: Number(row.order?.taxAmountCents ?? 0),
          totalAmountCents: Number(row.order?.totalAmountCents ?? 0),
        };
        const ledgerPreview = (ledgerByOrderId.get(Number(row.orderId)) ?? []).slice(0, 8);
        const refundAmountCents = ledgerPreview
          .filter(
            (item) =>
              item.accountType === FinanceLedgerAccountType.CLEARING &&
              item.direction === FinanceLedgerDirection.CREDIT,
          )
          .reduce((acc, item) => acc + Number(item.amountCents ?? 0), 0);

        return {
          id: row.id,
          orderId: row.orderId,
          sellerId: row.order?.sellerId ?? null,
          customerId: row.customerId,
          status: row.status,
          reason: row.reason,
          responseNote: row.responseNote,
          requestedAt: row.requestedAt,
          decidedAt: row.decidedAt,
          originalSnapshot: snapshot,
          refundAmountCents,
          ledgerPreview,
        };
      }),
      meta,
    };
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
        platformRevenueCents: commissionAmountCents,
        sellerPayoutCents: netAmountCents,
      },
    });
  }
}

