import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    if (currentUser.role !== 'STAFF' && currentUser.role !== 'SELLER') {
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
    if (currentUser.role !== 'ADMIN') {
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

    if (currentUser.role !== 'STAFF' && currentUser.role !== 'SELLER') {
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
    if (currentUser.role !== 'ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);

    const payout = await this.prisma.payout.findFirst({
      where: { id: payoutId, businessId },
      select: { id: true, status: true },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.status !== 'pending') {
      throw new ForbiddenException('Payout can not be approved');
    }

    return this.prisma.payout.update({
      where: { id: payout.id },
      data: {
        status: 'approved',
        approvedAt: new Date(),
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

  async completePayout(currentUser: JwtPayload, payoutId: number) {
    if (currentUser.role !== 'ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);

    const payout = await this.prisma.payout.findFirst({
      where: { id: payoutId, businessId },
      select: { id: true, status: true },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.status !== 'approved') {
      throw new ForbiddenException('Payout can not be completed');
    }

    return this.prisma.payout.update({
      where: { id: payout.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
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
  }
}
