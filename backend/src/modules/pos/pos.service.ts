import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { OpenRegisterSessionDto } from './dto/open-register-session.dto';
import { CloseRegisterSessionDto } from './dto/close-register-session.dto';
import { PosReturnOrderDto } from './dto/pos-return-order.dto';
import { ApplyCustomerBalanceDto } from './dto/apply-customer-balance.dto';
import { ApplySplitPaymentsDto } from './dto/apply-split-payments.dto';

type SalesBucketPeriod = 'day' | 'week' | 'month';

@Injectable()
export class PosService {
  constructor(private readonly prisma: PrismaService) {}

  private aggregateStockLines(
    lines: Array<{ productId: number; variantId?: number | null; quantity: number }>,
  ) {
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

  private assertAllowedRole(currentUser: JwtPayload) {
    if (
      currentUser.role !== 'ADMIN' &&
      currentUser.role !== 'SUPER_ADMIN' &&
      currentUser.role !== 'SELLER' &&
      currentUser.role !== 'STAFF'
    ) {
      throw new ForbiddenException('Access denied');
    }
  }

  private normalizeSalesPeriod(raw?: string): SalesBucketPeriod {
    const value = (raw ?? 'day').trim().toLowerCase();
    if (value === 'day' || value === 'week' || value === 'month') {
      return value;
    }
    throw new BadRequestException('period gecersiz. day|week|month kullanin');
  }

  private parseDateRange(
    params?: { dateFrom?: string; dateTo?: string },
    defaultDays = 30,
  ) {
    const now = new Date();
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    const dateFromRaw = params?.dateFrom?.trim();
    const dateToRaw = params?.dateTo?.trim();

    let startAt: Date;
    let endAtExclusive: Date;

    if (dateFromRaw) {
      startAt = new Date(`${dateFromRaw}T00:00:00.000Z`);
      if (Number.isNaN(startAt.getTime())) {
        throw new BadRequestException('dateFrom gecersiz');
      }
    } else {
      startAt = new Date(todayStart);
      startAt.setUTCDate(startAt.getUTCDate() - Math.max(defaultDays - 1, 0));
    }

    if (dateToRaw) {
      endAtExclusive = new Date(`${dateToRaw}T00:00:00.000Z`);
      if (Number.isNaN(endAtExclusive.getTime())) {
        throw new BadRequestException('dateTo gecersiz');
      }
    } else if (dateFromRaw) {
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

  private escapeCsvCell(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private settingToText(value: unknown): string | null {
    if (typeof value === 'string') {
      const normalized = value.trim();
      return normalized.length > 0 ? normalized : null;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return null;
  }

  async getCurrentSession(currentUser: JwtPayload) {
    this.assertAllowedRole(currentUser);
    const businessId = Number(currentUser.businessId);

    const session = await this.prisma.cashRegisterSession.findFirst({
      where: { businessId, closedAt: null },
      orderBy: { openedAt: 'desc' },
      select: {
        id: true,
        registerCode: true,
        openingCashCents: true,
        closingCashCents: true,
        openNote: true,
        closeNote: true,
        openedAt: true,
        closedAt: true,
        openedByUserId: true,
        closedByUserId: true,
      },
    });

    if (!session) {
      return null;
    }

    return {
      ...session,
      varianceCents:
        typeof session.closingCashCents === 'number'
          ? session.closingCashCents - session.openingCashCents
          : null,
    };
  }

  async listSessions(currentUser: JwtPayload, limit = 20) {
    this.assertAllowedRole(currentUser);
    const businessId = Number(currentUser.businessId);
    const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const sessions = await this.prisma.cashRegisterSession.findMany({
      where: { businessId },
      orderBy: [{ openedAt: 'desc' }],
      take: normalizedLimit,
      select: {
        id: true,
        registerCode: true,
        openingCashCents: true,
        closingCashCents: true,
        openNote: true,
        closeNote: true,
        openedAt: true,
        closedAt: true,
        openedByUserId: true,
        closedByUserId: true,
      },
    });

    return sessions.map((session) => ({
      ...session,
      varianceCents:
        typeof session.closingCashCents === 'number'
          ? session.closingCashCents - session.openingCashCents
          : null,
    }));
  }

  async openSession(currentUser: JwtPayload, payload: OpenRegisterSessionDto) {
    this.assertAllowedRole(currentUser);
    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);
    const registerCode = (payload.registerCode ?? 'MAIN').trim().toUpperCase();
    if (!registerCode) {
      throw new BadRequestException('Kasa kodu bos olamaz');
    }

    const active = await this.prisma.cashRegisterSession.findFirst({
      where: { businessId, registerCode, closedAt: null },
      select: { id: true },
    });

    if (active) {
      throw new ConflictException('Bu kasa kodu icin acik vardiya zaten var');
    }

    return this.prisma.cashRegisterSession.create({
      data: {
        businessId,
        registerCode,
        openedByUserId: userId,
        openingCashCents: payload.openingCashCents,
        openNote: payload.note?.trim() || null,
      },
      select: {
        id: true,
        registerCode: true,
        openingCashCents: true,
        openNote: true,
        openedAt: true,
        openedByUserId: true,
      },
    });
  }

  async closeSession(
    currentUser: JwtPayload,
    payload: CloseRegisterSessionDto,
  ) {
    this.assertAllowedRole(currentUser);
    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);
    const registerCode = payload.registerCode?.trim().toUpperCase();

    let active = null as
      | { id: number; registerCode: string; openedByUserId: number; openingCashCents: number }
      | null;

    if (payload.sessionId) {
      active = await this.prisma.cashRegisterSession.findFirst({
        where: { id: payload.sessionId, businessId, closedAt: null },
        select: {
          id: true,
          registerCode: true,
          openedByUserId: true,
          openingCashCents: true,
        },
      });
    } else if (registerCode) {
      active = await this.prisma.cashRegisterSession.findFirst({
        where: { businessId, registerCode, closedAt: null },
        select: {
          id: true,
          registerCode: true,
          openedByUserId: true,
          openingCashCents: true,
        },
      });
    } else {
      const activeRows = await this.prisma.cashRegisterSession.findMany({
        where: { businessId, closedAt: null },
        select: {
          id: true,
          registerCode: true,
          openedByUserId: true,
          openingCashCents: true,
        },
        orderBy: { openedAt: 'desc' },
      });

      if (currentUser.role === 'STAFF') {
        active =
          activeRows.find((row) => row.openedByUserId === userId) ?? null;
      } else {
        if (activeRows.length > 1) {
          throw new BadRequestException(
            'Birden fazla aktif vardiya var. sessionId veya registerCode gonderin.',
          );
        }
        active = activeRows[0] ?? null;
      }
    }

    if (!active) {
      throw new NotFoundException('Kapatilacak aktif vardiya bulunamadi');
    }

    if (currentUser.role === 'STAFF' && active.openedByUserId !== userId) {
      throw new ForbiddenException('Bu kasayi kapatamazsiniz');
    }

    const closed = await this.prisma.cashRegisterSession.update({
      where: { id: active.id },
      data: {
        closedByUserId: userId,
        closingCashCents: payload.closingCashCents,
        closeNote: payload.note?.trim() || null,
        closedAt: new Date(),
      },
      select: {
        id: true,
        registerCode: true,
        openingCashCents: true,
        closingCashCents: true,
        openNote: true,
        closeNote: true,
        openedAt: true,
        closedAt: true,
        openedByUserId: true,
        closedByUserId: true,
      },
    });

    return {
      ...closed,
      varianceCents:
        (closed.closingCashCents ?? 0) - closed.openingCashCents,
    };
  }

  async listShifts(
    currentUser: JwtPayload,
    params?: {
      userId?: number;
      registerCode?: string;
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
    },
  ) {
    this.assertAllowedRole(currentUser);
    const businessId = Number(currentUser.businessId);
    const limit = Math.min(Math.max(Number(params?.limit ?? 50), 1), 200);

    const where: {
      businessId: number;
      openedByUserId?: number;
      registerCode?: string;
      openedAt?: { gte?: Date; lt?: Date };
    } = { businessId };

    if (params?.userId && Number.isFinite(params.userId)) {
      where.openedByUserId = Number(params.userId);
    }
    if (params?.registerCode?.trim()) {
      where.registerCode = params.registerCode.trim().toUpperCase();
    }

    const startAtRaw = params?.dateFrom?.trim();
    const endAtRaw = params?.dateTo?.trim();
    if (startAtRaw || endAtRaw) {
      const openedAt: { gte?: Date; lt?: Date } = {};
      if (startAtRaw) {
        const dt = new Date(`${startAtRaw}T00:00:00.000Z`);
        if (Number.isNaN(dt.getTime())) {
          throw new BadRequestException('dateFrom gecersiz');
        }
        openedAt.gte = dt;
      }
      if (endAtRaw) {
        const dt = new Date(`${endAtRaw}T00:00:00.000Z`);
        if (Number.isNaN(dt.getTime())) {
          throw new BadRequestException('dateTo gecersiz');
        }
        dt.setUTCDate(dt.getUTCDate() + 1);
        openedAt.lt = dt;
      }
      where.openedAt = openedAt;
    }

    const shifts = await this.prisma.cashRegisterSession.findMany({
      where,
      orderBy: [{ openedAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        registerCode: true,
        openingCashCents: true,
        closingCashCents: true,
        openNote: true,
        closeNote: true,
        openedAt: true,
        closedAt: true,
        openedByUserId: true,
        closedByUserId: true,
        openedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        closedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return shifts.map((shift) => ({
      ...shift,
      durationMinutes: shift.closedAt
        ? Math.max(
            Math.round(
              (shift.closedAt.getTime() - shift.openedAt.getTime()) / 60_000,
            ),
            0,
          )
        : null,
      varianceCents:
        typeof shift.closingCashCents === 'number'
          ? shift.closingCashCents - shift.openingCashCents
          : null,
    }));
  }

  async getStaffSalesReport(
    currentUser: JwtPayload,
    params?: { userId?: number; dateFrom?: string; dateTo?: string },
  ) {
    this.assertAllowedRole(currentUser);
    const businessId = Number(currentUser.businessId);

    const now = new Date();
    const startAt = params?.dateFrom?.trim()
      ? new Date(`${params.dateFrom.trim()}T00:00:00.000Z`)
      : new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
        );
    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException('dateFrom gecersiz');
    }

    const endAt = params?.dateTo?.trim()
      ? new Date(`${params.dateTo.trim()}T00:00:00.000Z`)
      : new Date(startAt);
    if (Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('dateTo gecersiz');
    }
    endAt.setUTCDate(endAt.getUTCDate() + 1);

    const staffFilterUserId =
      params?.userId && Number.isFinite(params.userId)
        ? Number(params.userId)
        : undefined;

    const orderWhere: {
      businessId: number;
      source: 'POS';
      deletedAt: null;
      createdAt: { gte: Date; lt: Date };
      createdByUserId?: number;
    } = {
      businessId,
      source: 'POS',
      deletedAt: null,
      createdAt: { gte: startAt, lt: endAt },
    };
    if (staffFilterUserId) {
      orderWhere.createdByUserId = staffFilterUserId;
    }

    const orderGroups = await this.prisma.order.groupBy({
      by: ['createdByUserId'],
      where: orderWhere,
      _count: { _all: true },
      _sum: { totalAmountCents: true },
    });

    const userIds = orderGroups.map((g) => g.createdByUserId);
    if (userIds.length === 0) {
      return {
        range: { startAt, endAt },
        rows: [],
        totals: {
          orderCount: 0,
          salesTotalCents: 0,
          paymentsTotalCents: 0,
        },
      };
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, businessId },
      select: { id: true, name: true, role: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const paymentRows = await this.prisma.$queryRaw<
      Array<{ userId: number; paidCents: number }>
    >`
      SELECT o."createdByUserId" AS "userId", COALESCE(SUM(p."amountCents"), 0)::int AS "paidCents"
      FROM "Order" o
      LEFT JOIN "Payment" p ON p."orderId" = o."id" AND p."businessId" = o."businessId"
      WHERE o."businessId" = ${businessId}
        AND o."source" = 'POS'
        AND o."deletedAt" IS NULL
        AND o."createdAt" >= ${startAt}
        AND o."createdAt" < ${endAt}
        ${
          staffFilterUserId
            ? Prisma.sql`AND o."createdByUserId" = ${staffFilterUserId}`
            : Prisma.empty
        }
      GROUP BY o."createdByUserId"
    `;
    const paymentMap = new Map(paymentRows.map((r) => [Number(r.userId), Number(r.paidCents)]));

    const shiftGroups = await this.prisma.cashRegisterSession.groupBy({
      by: ['openedByUserId'],
      where: {
        businessId,
        openedByUserId: { in: userIds },
        openedAt: { gte: startAt, lt: endAt },
      },
      _count: { _all: true },
      _sum: {
        openingCashCents: true,
        closingCashCents: true,
      },
    });
    const shiftMap = new Map(
      shiftGroups.map((g) => [
        g.openedByUserId,
        {
          shiftCount: g._count._all,
          openingCashCents: g._sum.openingCashCents ?? 0,
          closingCashCents: g._sum.closingCashCents ?? 0,
        },
      ]),
    );

    const rows = orderGroups
      .map((group) => {
        const user = userMap.get(group.createdByUserId);
        const paymentsTotalCents = paymentMap.get(group.createdByUserId) ?? 0;
        const shifts = shiftMap.get(group.createdByUserId) ?? {
          shiftCount: 0,
          openingCashCents: 0,
          closingCashCents: 0,
        };
        const orderCount = group._count._all;
        const salesTotalCents = group._sum.totalAmountCents ?? 0;
        return {
          userId: group.createdByUserId,
          userName: user?.name ?? `User #${group.createdByUserId}`,
          role: user?.role ?? null,
          orderCount,
          salesTotalCents,
          avgTicketCents:
            orderCount > 0 ? Math.round(salesTotalCents / orderCount) : 0,
          paymentsTotalCents,
          shiftCount: shifts.shiftCount,
          openingCashCents: shifts.openingCashCents,
          closingCashCents: shifts.closingCashCents,
        };
      })
      .sort((a, b) => b.salesTotalCents - a.salesTotalCents);

    return {
      range: { startAt, endAt },
      rows,
      totals: {
        orderCount: rows.reduce((acc, r) => acc + r.orderCount, 0),
        salesTotalCents: rows.reduce((acc, r) => acc + r.salesTotalCents, 0),
        paymentsTotalCents: rows.reduce(
          (acc, r) => acc + r.paymentsTotalCents,
          0,
        ),
      },
    };
  }

  async getSalesReport(
    currentUser: JwtPayload,
    params?: {
      period?: string;
      dateFrom?: string;
      dateTo?: string;
      topLimit?: number;
    },
  ) {
    this.assertAllowedRole(currentUser);
    const businessId = Number(currentUser.businessId);
    const period = this.normalizeSalesPeriod(params?.period);
    const topLimit = Math.min(Math.max(Number(params?.topLimit ?? 10), 1), 50);
    const { startAt, endAt } = this.parseDateRange(params, 30);

    const bucketExpr =
      period === 'week'
        ? Prisma.sql`date_trunc('week', o."createdAt")`
        : period === 'month'
          ? Prisma.sql`date_trunc('month', o."createdAt")`
          : Prisma.sql`date_trunc('day', o."createdAt")`;

    const [orderAggregate, paymentAggregate, paymentMethodGroups, trendRows, topProducts] =
      await Promise.all([
        this.prisma.order.aggregate({
          where: {
            businessId,
            source: 'POS',
            deletedAt: null,
            createdAt: { gte: startAt, lt: endAt },
          },
          _count: { _all: true },
          _sum: { totalAmountCents: true },
        }),
        this.prisma.payment.aggregate({
          where: {
            businessId,
            order: {
              source: 'POS',
              deletedAt: null,
              createdAt: { gte: startAt, lt: endAt },
            },
          },
          _sum: { amountCents: true },
        }),
        this.prisma.payment.groupBy({
          by: ['method'],
          where: {
            businessId,
            order: {
              source: 'POS',
              deletedAt: null,
              createdAt: { gte: startAt, lt: endAt },
            },
          },
          _sum: { amountCents: true },
          _count: { _all: true },
        }),
        this.prisma.$queryRaw<
          Array<{
            bucketStart: Date;
            orderCount: number;
            salesTotalCents: number;
            paymentsTotalCents: number;
          }>
        >(Prisma.sql`
          SELECT
            ${bucketExpr} AS "bucketStart",
            COUNT(*)::int AS "orderCount",
            COALESCE(SUM(o."totalAmountCents"), 0)::int AS "salesTotalCents",
            COALESCE(SUM(op."paidCents"), 0)::int AS "paymentsTotalCents"
          FROM "Order" o
          LEFT JOIN (
            SELECT
              p."businessId",
              p."orderId",
              COALESCE(SUM(p."amountCents"), 0)::int AS "paidCents"
            FROM "Payment" p
            WHERE p."businessId" = ${businessId}
            GROUP BY p."businessId", p."orderId"
          ) op ON op."businessId" = o."businessId" AND op."orderId" = o."id"
          WHERE o."businessId" = ${businessId}
            AND o."source" = 'POS'
            AND o."deletedAt" IS NULL
            AND o."createdAt" >= ${startAt}
            AND o."createdAt" < ${endAt}
          GROUP BY 1
          ORDER BY 1 ASC
        `),
        this.prisma.$queryRaw<
          Array<{
            productId: number;
            productName: string;
            quantity: number;
            salesTotalCents: number;
            orderCount: number;
          }>
        >(Prisma.sql`
          SELECT
            oi."productId" AS "productId",
            MAX(oi."productName") AS "productName",
            COALESCE(SUM(oi."quantity"), 0)::int AS "quantity",
            COALESCE(SUM(oi."totalAmountCents"), 0)::int AS "salesTotalCents",
            COUNT(DISTINCT oi."orderId")::int AS "orderCount"
          FROM "OrderItem" oi
          INNER JOIN "Order" o
            ON o."id" = oi."orderId"
           AND o."businessId" = oi."businessId"
          WHERE o."businessId" = ${businessId}
            AND o."source" = 'POS'
            AND o."deletedAt" IS NULL
            AND o."createdAt" >= ${startAt}
            AND o."createdAt" < ${endAt}
          GROUP BY oi."productId"
          ORDER BY "salesTotalCents" DESC, "quantity" DESC
          LIMIT ${topLimit}
        `),
      ]);

    const orderCount = orderAggregate._count._all;
    const salesTotalCents = orderAggregate._sum.totalAmountCents ?? 0;
    const paymentsTotalCents = paymentAggregate._sum.amountCents ?? 0;

    return {
      range: { startAt, endAt, period },
      summary: {
        orderCount,
        salesTotalCents,
        paymentsTotalCents,
        avgTicketCents: orderCount > 0 ? Math.round(salesTotalCents / orderCount) : 0,
      },
      trend: trendRows.map((row) => ({
        bucketStart: row.bucketStart,
        orderCount: Number(row.orderCount),
        salesTotalCents: Number(row.salesTotalCents),
        paymentsTotalCents: Number(row.paymentsTotalCents),
      })),
      topProducts: topProducts.map((row) => ({
        productId: Number(row.productId),
        productName: row.productName,
        quantity: Number(row.quantity),
        salesTotalCents: Number(row.salesTotalCents),
        orderCount: Number(row.orderCount),
      })),
      paymentsByMethod: paymentMethodGroups.map((row) => ({
        method: row.method,
        count: row._count._all,
        amountCents: row._sum.amountCents ?? 0,
      })),
    };
  }

  async exportSalesReportCsv(
    currentUser: JwtPayload,
    params?: {
      period?: string;
      dateFrom?: string;
      dateTo?: string;
      topLimit?: number;
    },
  ) {
    const report = await this.getSalesReport(currentUser, params);
    const lines: string[] = [];

    lines.push('POS Sales Report');
    lines.push(`Period,${this.escapeCsvCell(report.range.period)}`);
    lines.push(`StartAt,${this.escapeCsvCell(report.range.startAt.toISOString())}`);
    lines.push(`EndAt,${this.escapeCsvCell(report.range.endAt.toISOString())}`);
    lines.push('');

    lines.push('Summary');
    lines.push('Metric,Value');
    lines.push(`OrderCount,${report.summary.orderCount}`);
    lines.push(`SalesTotalCents,${report.summary.salesTotalCents}`);
    lines.push(`PaymentsTotalCents,${report.summary.paymentsTotalCents}`);
    lines.push(`AvgTicketCents,${report.summary.avgTicketCents}`);
    lines.push('');

    lines.push('Trend');
    lines.push('BucketStart,OrderCount,SalesTotalCents,PaymentsTotalCents');
    for (const row of report.trend) {
      lines.push(
        `${this.escapeCsvCell(row.bucketStart.toISOString())},${row.orderCount},${row.salesTotalCents},${row.paymentsTotalCents}`,
      );
    }
    lines.push('');

    lines.push('TopProducts');
    lines.push('ProductId,ProductName,Quantity,SalesTotalCents,OrderCount');
    for (const row of report.topProducts) {
      lines.push(
        `${row.productId},${this.escapeCsvCell(row.productName)},${row.quantity},${row.salesTotalCents},${row.orderCount}`,
      );
    }
    lines.push('');

    lines.push('PaymentsByMethod');
    lines.push('Method,Count,AmountCents');
    for (const row of report.paymentsByMethod) {
      lines.push(`${row.method},${row.count},${row.amountCents}`);
    }

    return lines.join('\n');
  }

  async getOrderInvoice(currentUser: JwtPayload, orderId: number) {
    this.assertAllowedRole(currentUser);
    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        businessId,
        source: 'POS',
        deletedAt: null,
      },
      include: {
        status: {
          select: {
            key: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          select: {
            id: true,
            productId: true,
            variantId: true,
            productName: true,
            quantity: true,
            unitPriceCents: true,
            subtotalAmountCents: true,
            taxRateBps: true,
            taxAmountCents: true,
            totalAmountCents: true,
          },
          orderBy: { id: 'asc' },
        },
        payments: {
          select: {
            id: true,
            amountCents: true,
            method: true,
            reference: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('POS siparisi bulunamadi');
    }

    if (currentUser.role === 'STAFF' && order.createdByUserId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const [business, settingsRows, billingAddress] = await Promise.all([
      this.prisma.business.findUnique({
        where: { id: businessId },
        select: {
          id: true,
          name: true,
        },
      }),
      this.prisma.settings.findMany({
        where: {
          businessId,
          key: {
            in: [
              'invoice.companyName',
              'invoice.companyTitle',
              'invoice.taxOffice',
              'invoice.taxNumber',
              'invoice.address',
              'invoice.phone',
              'invoice.email',
              'invoice.website',
              'invoice.footerNote',
              'invoice.invoicePrefix',
            ],
          },
        },
        select: {
          key: true,
          value: true,
        },
      }),
      this.prisma.customerAddress.findFirst({
        where: {
          businessId,
          customerId: order.customerId,
        },
        orderBy: [
          { isDefaultBilling: 'desc' },
          { updatedAt: 'desc' },
        ],
        select: {
          id: true,
          title: true,
          fullName: true,
          phone: true,
          line1: true,
          line2: true,
          city: true,
          district: true,
          postalCode: true,
          country: true,
          isDefaultBilling: true,
        },
      }),
    ]);

    const settingsMap = new Map(settingsRows.map((row) => [row.key, row.value]));
    const settingValue = (key: string) => this.settingToText(settingsMap.get(key));
    const companyName =
      settingValue('invoice.companyName') ??
      settingValue('invoice.companyTitle') ??
      business?.name ??
      'Business';
    const invoicePrefix = settingValue('invoice.invoicePrefix') ?? 'INV';

    const taxByRate = new Map<
      number,
      {
        taxRateBps: number;
        baseAmountCents: number;
        taxAmountCents: number;
        totalAmountCents: number;
      }
    >();
    for (const line of order.items) {
      const rate = Number(line.taxRateBps ?? 0);
      const prev = taxByRate.get(rate) ?? {
        taxRateBps: rate,
        baseAmountCents: 0,
        taxAmountCents: 0,
        totalAmountCents: 0,
      };
      prev.baseAmountCents += Number(line.subtotalAmountCents ?? 0);
      prev.taxAmountCents += Number(line.taxAmountCents ?? 0);
      prev.totalAmountCents += Number(line.totalAmountCents ?? 0);
      taxByRate.set(rate, prev);
    }
    const taxBreakdown = Array.from(taxByRate.values()).sort(
      (a, b) => a.taxRateBps - b.taxRateBps,
    );

    const paidAmountCents = order.payments.reduce(
      (acc, p) => acc + Number(p.amountCents ?? 0),
      0,
    );

    return {
      invoiceNo: `${invoicePrefix}-${order.id}`,
      issueDate: order.createdAt,
      currency: 'TRY',
      order: {
        id: order.id,
        statusKey: order.status.key,
        source: order.source,
        createdAt: order.createdAt,
        notes: order.notes ?? null,
        createdBy: {
          id: order.createdBy.id,
          name: order.createdBy.name,
        },
      },
      business: {
        id: business?.id ?? businessId,
        name: companyName,
        legalName: settingValue('invoice.companyTitle'),
        taxOffice: settingValue('invoice.taxOffice'),
        taxNumber: settingValue('invoice.taxNumber'),
        address: settingValue('invoice.address'),
        phone: settingValue('invoice.phone'),
        email: settingValue('invoice.email'),
        website: settingValue('invoice.website'),
        footerNote: settingValue('invoice.footerNote'),
      },
      customer: {
        id: order.customer.id,
        name: order.customer.name,
        phone: order.customer.phone,
        billingAddress: billingAddress
          ? {
              id: billingAddress.id,
              title: billingAddress.title,
              fullName: billingAddress.fullName,
              phone: billingAddress.phone,
              line1: billingAddress.line1,
              line2: billingAddress.line2,
              city: billingAddress.city,
              district: billingAddress.district,
              postalCode: billingAddress.postalCode,
              country: billingAddress.country,
            }
          : null,
      },
      lines: order.items.map((line, idx) => ({
        lineNo: idx + 1,
        id: line.id,
        productId: line.productId,
        variantId: line.variantId,
        productName: line.productName,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        subtotalAmountCents: line.subtotalAmountCents,
        taxRateBps: line.taxRateBps,
        taxAmountCents: line.taxAmountCents,
        totalAmountCents: line.totalAmountCents,
      })),
      taxBreakdown,
      payments: order.payments.map((p) => ({
        id: p.id,
        method: p.method,
        amountCents: p.amountCents,
        reference: p.reference,
        createdAt: p.createdAt,
      })),
      totals: {
        subtotalAmountCents: order.subtotalAmountCents,
        taxAmountCents: order.taxAmountCents,
        discountAmountCents: order.discountAmountCents,
        totalAmountCents: order.totalAmountCents,
        paidAmountCents,
        remainingAmountCents: Math.max(order.totalAmountCents - paidAmountCents, 0),
      },
    };
  }

  async returnPosOrder(
    currentUser: JwtPayload,
    orderId: number,
    payload: PosReturnOrderDto,
  ) {
    this.assertAllowedRole(currentUser);
    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        businessId,
        deletedAt: null,
      },
      include: {
        status: {
          select: { key: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (currentUser.role === 'STAFF' && order.createdByUserId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (order.source !== 'POS') {
      throw new BadRequestException('Sadece POS siparisleri iade edilebilir');
    }

    const statusKey = String(order.status?.key ?? '').toUpperCase();
    if (statusKey.includes('RETURN') || statusKey.includes('CANCEL')) {
      throw new ConflictException('Siparis zaten iade/iptal surecinde');
    }

    const refundAmountCents = Number(payload.refundAmountCents ?? order.totalAmountCents);
    if (!Number.isFinite(refundAmountCents) || refundAmountCents <= 0) {
      throw new BadRequestException('Iade tutari pozitif olmali');
    }
    if (refundAmountCents > order.totalAmountCents) {
      throw new BadRequestException('Iade tutari siparis tutarini asamaz');
    }

    const refundedBefore = await this.prisma.payment.aggregate({
      where: {
        businessId,
        orderId: order.id,
        amountCents: { lt: 0 },
      },
      _sum: { amountCents: true },
    });
    const alreadyRefunded = Math.abs(refundedBefore._sum.amountCents ?? 0);
    if (alreadyRefunded + refundAmountCents > order.totalAmountCents) {
      throw new BadRequestException('Toplam iade tutari siparis tutarini asamaz');
    }

    const targetStatusRows = await this.prisma.orderStatus.findMany({
      where: {
        businessId,
        key: { in: ['RETURNED', 'CANCELLED'] },
      },
      select: { id: true, key: true },
    });
    const targetStatusMap = new Map(targetStatusRows.map((s) => [s.key, s.id]));
    const targetStatusId =
      targetStatusMap.get('RETURNED') ?? targetStatusMap.get('CANCELLED');
    if (!targetStatusId) {
      throw new NotFoundException('Order status not found: RETURNED/CANCELLED');
    }

    const refundMethod = payload.refundMethod ?? PaymentMethod.CASH;
    const reason = payload.note?.trim() || null;

    const result = await this.prisma.$transaction(async (tx) => {
      const items: Array<{ productId: number; variantId?: number | null; quantity: number }> =
        await (tx as any).orderItem.findMany({
          where: { businessId, orderId: order.id },
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

      await tx.order.update({
        where: { id: order.id },
        data: { statusId: targetStatusId },
      });

      const refundPayment = await tx.payment.create({
        data: {
          businessId,
          orderId: order.id,
          amountCents: -refundAmountCents,
          method: refundMethod,
          reference: `POS_RETURN:${order.id}`,
        },
        select: {
          id: true,
          amountCents: true,
          method: true,
          reference: true,
          createdAt: true,
        },
      });

      const existingRequest = await (tx as any).returnRequest.findFirst({
        where: { businessId, orderId: order.id },
        select: { id: true },
      });
      if (existingRequest) {
        await (tx as any).returnRequest.update({
          where: { id: existingRequest.id },
          data: {
            status: 'APPROVED',
            reason,
            responseNote: 'POS iade islemi',
            decidedAt: new Date(),
            decidedByUserId: userId,
          },
        });
      } else {
        await (tx as any).returnRequest.create({
          data: {
            businessId,
            orderId: order.id,
            customerId: order.customerId,
            status: 'APPROVED',
            reason,
            responseNote: 'POS iade islemi',
            decidedAt: new Date(),
            decidedByUserId: userId,
          },
        });
      }

      return refundPayment;
    });

    return {
      orderId: order.id,
      refundedAmountCents: refundAmountCents,
      refundMethod,
      payment: result,
      message: 'POS iade islemi tamamlandi',
    };
  }

  async getEndOfDayReport(currentUser: JwtPayload, date?: string) {
    this.assertAllowedRole(currentUser);
    const businessId = Number(currentUser.businessId);

    const day = (date ?? '').trim();
    const targetDate = day.length > 0 ? new Date(`${day}T00:00:00.000Z`) : new Date();
    if (Number.isNaN(targetDate.getTime())) {
      throw new BadRequestException('Gecersiz tarih. YYYY-MM-DD formatini kullanin');
    }

    const startAt = new Date(targetDate);
    startAt.setUTCHours(0, 0, 0, 0);
    const endAt = new Date(startAt);
    endAt.setUTCDate(endAt.getUTCDate() + 1);

    const [orderAggregate, paymentGroups, sessionRows] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          businessId,
          source: 'POS',
          deletedAt: null,
          createdAt: { gte: startAt, lt: endAt },
        },
        _count: { _all: true },
        _sum: { totalAmountCents: true },
      }),
      this.prisma.payment.groupBy({
        by: ['method'],
        where: {
          businessId,
          createdAt: { gte: startAt, lt: endAt },
          order: {
            deletedAt: null,
            source: 'POS',
          },
        },
        _sum: { amountCents: true },
        _count: { _all: true },
      }),
      this.prisma.cashRegisterSession.findMany({
        where: {
          businessId,
          openedAt: { gte: startAt, lt: endAt },
        },
        select: {
          id: true,
          openingCashCents: true,
          closingCashCents: true,
          openedAt: true,
          closedAt: true,
          openedByUserId: true,
          closedByUserId: true,
        },
        orderBy: { openedAt: 'asc' },
      }),
    ]);

    const paymentSummary = {
      cashCents: 0,
      cardCents: 0,
      transferCents: 0,
      otherCents: 0,
      totalCents: 0,
      paymentCount: 0,
    };
    for (const item of paymentGroups) {
      const amount = item._sum.amountCents ?? 0;
      paymentSummary.totalCents += amount;
      paymentSummary.paymentCount += item._count._all;
      if (item.method === 'CASH') paymentSummary.cashCents += amount;
      if (item.method === 'CARD') paymentSummary.cardCents += amount;
      if (item.method === 'TRANSFER') paymentSummary.transferCents += amount;
      if (item.method === 'OTHER') paymentSummary.otherCents += amount;
    }

    const sessionSummary = {
      sessionCount: sessionRows.length,
      openSessions: sessionRows.filter((s) => !s.closedAt).length,
      closedSessions: sessionRows.filter((s) => !!s.closedAt).length,
      openingCashCents: sessionRows.reduce(
        (acc, s) => acc + s.openingCashCents,
        0,
      ),
      closingCashCents: sessionRows.reduce(
        (acc, s) => acc + (s.closingCashCents ?? 0),
        0,
      ),
    };

    return {
      date: startAt.toISOString().slice(0, 10),
      range: { startAt, endAt },
      orders: {
        orderCount: orderAggregate._count._all,
        totalSalesCents: orderAggregate._sum.totalAmountCents ?? 0,
      },
      payments: paymentSummary,
      sessions: {
        ...sessionSummary,
        varianceCents:
          sessionSummary.closingCashCents - sessionSummary.openingCashCents,
      },
    };
  }

  async findProductByBarcode(currentUser: JwtPayload, barcode: string) {
    this.assertAllowedRole(currentUser);
    const businessId = Number(currentUser.businessId);
    const code = barcode.trim();
    if (!code) {
      throw new BadRequestException('Barkod bos olamaz');
    }

    const product = await this.prisma.product.findFirst({
      where: {
        businessId,
        isActive: true,
        sku: code,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        priceCents: true,
        stock: true,
      },
    });

    if (product) {
      return {
        type: 'PRODUCT' as const,
        productId: product.id,
        variantId: null,
        name: product.name,
        sku: product.sku,
        priceCents: product.priceCents,
        stock: product.stock,
      };
    }

    const variant = await (this.prisma as any).productVariant.findFirst({
      where: {
        businessId,
        isActive: true,
        sku: code,
      },
      select: {
        id: true,
        productId: true,
        name: true,
        sku: true,
        priceCents: true,
        stock: true,
      },
    });

    if (variant) {
      return {
        type: 'VARIANT' as const,
        productId: variant.productId,
        variantId: variant.id,
        name: variant.name,
        sku: variant.sku,
        priceCents: variant.priceCents,
        stock: variant.stock,
      };
    }

    throw new NotFoundException('Barkoda ait urun bulunamadi');
  }

  async searchProducts(
    currentUser: JwtPayload,
    params?: { q?: string; limit?: number },
  ) {
    this.assertAllowedRole(currentUser);
    const businessId = Number(currentUser.businessId);
    const q = (params?.q ?? '').trim();
    const limit = Math.min(Math.max(Number(params?.limit ?? 12), 1), 50);
    const qNumber = q && /^[0-9]+$/.test(q) ? Number(q) : null;

    const productWhere: Prisma.ProductWhereInput = {
      businessId,
      isActive: true,
      archivedAt: null,
    };

    if (q) {
      productWhere.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
      if (qNumber) {
        (productWhere.OR as Prisma.ProductWhereInput[]).push({ id: qNumber });
      }
    }

    const variantWhere: any = {
      businessId,
      isActive: true,
      product: {
        businessId,
        isActive: true,
        archivedAt: null,
      },
    };
    if (q) {
      const or: any[] = [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        {
          product: {
            name: { contains: q, mode: 'insensitive' },
          },
        },
      ];
      if (qNumber) {
        or.push({ id: qNumber }, { productId: qNumber });
      }
      variantWhere.OR = or;
    }

    const [products, variants] = await Promise.all([
      this.prisma.product.findMany({
        where: productWhere,
        select: {
          id: true,
          name: true,
          sku: true,
          priceCents: true,
          stock: true,
        },
        orderBy: [{ name: 'asc' }],
        take: limit,
      }),
      (this.prisma as any).productVariant.findMany({
        where: variantWhere,
        select: {
          id: true,
          productId: true,
          name: true,
          sku: true,
          priceCents: true,
          stock: true,
          product: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [{ name: 'asc' }],
        take: limit,
      }),
    ]);

    const normalized = [
      ...products.map((p) => ({
        type: 'PRODUCT' as const,
        productId: p.id,
        variantId: null as number | null,
        name: p.name,
        sku: p.sku,
        priceCents: p.priceCents,
        stock: p.stock,
      })),
      ...variants.map((v: any) => ({
        type: 'VARIANT' as const,
        productId: v.productId as number,
        variantId: v.id as number,
        name: `${v.product?.name ?? 'Urun'} / ${v.name}`,
        sku: v.sku as string | null,
        priceCents: v.priceCents as number,
        stock: v.stock as number | null,
      })),
    ];

    const queryLower = q.toLowerCase();
    const score = (row: {
      name: string;
      sku?: string | null;
      productId: number;
      variantId: number | null;
    }) => {
      if (!q) return 100;
      if (row.sku && row.sku.toLowerCase() === queryLower) return 0;
      if (row.name.toLowerCase().startsWith(queryLower)) return 1;
      if (row.sku?.toLowerCase().includes(queryLower)) return 2;
      if (row.name.toLowerCase().includes(queryLower)) return 3;
      if (qNumber && (row.productId === qNumber || row.variantId === qNumber)) return 4;
      return 10;
    };

    return normalized
      .sort((a, b) => {
        const scoreDiff = score(a) - score(b);
        if (scoreDiff !== 0) return scoreDiff;
        return a.name.localeCompare(b.name, 'tr');
      })
      .slice(0, limit);
  }

  async searchCustomers(
    currentUser: JwtPayload,
    params?: { q?: string; limit?: number },
  ) {
    this.assertAllowedRole(currentUser);
    const businessId = Number(currentUser.businessId);
    const q = (params?.q ?? '').trim();
    const limit = Math.min(Math.max(Number(params?.limit ?? 20), 1), 100);
    const qNumber = q && /^[0-9]+$/.test(q) ? Number(q) : null;

    const where: any = { businessId, deletedAt: null };
    if (q) {
      const or: any[] = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
      if (qNumber) or.push({ id: qNumber });
      where.OR = or;
    }

    return this.prisma.customer.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        balance: true,
      },
      orderBy: [{ id: 'desc' }],
      take: limit,
    });
  }

  async findCustomerById(currentUser: JwtPayload, customerId: number) {
    this.assertAllowedRole(currentUser);
    const businessId = Number(currentUser.businessId);

    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        businessId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        balance: true,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }

  async applySplitPayments(
    currentUser: JwtPayload,
    orderId: number,
    payload: ApplySplitPaymentsDto,
  ) {
    this.assertAllowedRole(currentUser);
    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);

    const paymentLines = (payload.payments ?? [])
      .map((line) => ({
        method: line.method,
        amountCents: Number(line.amountCents),
        reference: line.reference?.trim() || null,
      }))
      .filter((line) => Number.isFinite(line.amountCents) && line.amountCents > 0);

    if (paymentLines.length === 0) {
      throw new BadRequestException('En az bir odeme satiri gonderin');
    }

    const splitTotalCents = paymentLines.reduce(
      (acc, line) => acc + line.amountCents,
      0,
    );
    if (splitTotalCents <= 0) {
      throw new BadRequestException('Toplam odeme tutari pozitif olmali');
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          id: orderId,
          businessId,
          deletedAt: null,
        },
        select: {
          id: true,
          createdByUserId: true,
          totalAmountCents: true,
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }
      if (currentUser.role === 'STAFF' && order.createdByUserId !== userId) {
        throw new ForbiddenException('Access denied');
      }

      await tx.$queryRaw`SELECT 1 FROM "Order" WHERE "id" = ${order.id} FOR UPDATE`;

      const paymentAggregate = await tx.payment.aggregate({
        where: {
          businessId,
          orderId: order.id,
        },
        _sum: { amountCents: true },
      });

      const paidNet = Number(paymentAggregate._sum.amountCents ?? 0);
      const remainingDue = Math.max(order.totalAmountCents - paidNet, 0);
      if (remainingDue <= 0) {
        throw new BadRequestException('Siparisin kalan borcu yok');
      }

      if (splitTotalCents > remainingDue) {
        throw new BadRequestException(
          `Split odeme kalan borcu asamaz. Kalan: ${remainingDue}`,
        );
      }

      const createdPayments: Array<{
        id: number;
        amountCents: number;
        method: PaymentMethod;
        reference: string | null;
        createdAt: Date;
      }> = [];

      for (const line of paymentLines) {
        const payment = await tx.payment.create({
          data: {
            businessId,
            orderId: order.id,
            amountCents: line.amountCents,
            method: line.method,
            reference: line.reference,
          },
          select: {
            id: true,
            amountCents: true,
            method: true,
            reference: true,
            createdAt: true,
          },
        });
        createdPayments.push(payment);
      }

      const newRemainingDue = Math.max(remainingDue - splitTotalCents, 0);
      return {
        orderId: order.id,
        appliedAmountCents: splitTotalCents,
        remainingDueCents: newRemainingDue,
        payments: createdPayments,
      };
    });
  }

  async applyCustomerBalance(
    currentUser: JwtPayload,
    orderId: number,
    payload: ApplyCustomerBalanceDto,
  ) {
    this.assertAllowedRole(currentUser);
    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        businessId,
        deletedAt: null,
      },
      select: {
        id: true,
        customerId: true,
        totalAmountCents: true,
        createdByUserId: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (currentUser.role === 'STAFF' && order.createdByUserId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const [customer, paymentAggregate] = await Promise.all([
      this.prisma.customer.findFirst({
        where: { id: order.customerId, businessId, deletedAt: null },
        select: { id: true, balance: true },
      }),
      this.prisma.payment.aggregate({
        where: { businessId, orderId: order.id },
        _sum: { amountCents: true },
      }),
    ]);

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const paidNet = Number(paymentAggregate._sum.amountCents ?? 0);
    const remainingDue = Math.max(order.totalAmountCents - paidNet, 0);
    if (remainingDue <= 0) {
      throw new BadRequestException('Siparisin kalan borcu yok');
    }

    const requested =
      payload.amountCents !== undefined ? Number(payload.amountCents) : null;
    const autoAmount = Math.min(customer.balance, remainingDue);
    const applyAmount = requested ?? autoAmount;

    if (!Number.isFinite(applyAmount) || applyAmount <= 0) {
      throw new BadRequestException('Kullanilabilir bakiye yok');
    }
    if (applyAmount > customer.balance) {
      throw new BadRequestException('Musteri bakiyesi yetersiz');
    }
    if (applyAmount > remainingDue) {
      throw new BadRequestException('Uygulanacak bakiye kalan borcu asamaz');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedCustomer = await tx.customer.update({
        where: { id: customer.id },
        data: { balance: { decrement: applyAmount } },
        select: { id: true, balance: true },
      });

      const payment = await tx.payment.create({
        data: {
          businessId,
          orderId: order.id,
          amountCents: applyAmount,
          method: PaymentMethod.OTHER,
          reference: 'CUSTOMER_BALANCE',
        },
        select: {
          id: true,
          amountCents: true,
          method: true,
          reference: true,
          createdAt: true,
        },
      });

      const newPaidNet = paidNet + applyAmount;
      const newRemaining = Math.max(order.totalAmountCents - newPaidNet, 0);

      return {
        payment,
        customer: updatedCustomer,
        remainingDueCents: newRemaining,
      };
    });

    return {
      orderId: order.id,
      appliedAmountCents: applyAmount,
      remainingDueCents: result.remainingDueCents,
      customerBalanceCents: result.customer.balance,
      payment: result.payment,
    };
  }
}
