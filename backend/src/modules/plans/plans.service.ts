import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlanInterval } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../../auth/types/jwt-payload';
import {
  buildPaginationMeta,
  clampPage,
  clampPageSize,
  paginationToSkipTake,
  type PaginationMeta,
} from '@common/utils/pagination';
import type { CreatePlanDto } from './dto/create-plan.dto';
import type { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async listPlatformPlans(
    currentUser: JwtPayload,
    params?: {
      interval?: string;
      isActive?: string;
      page?: number;
      pageSize?: number;
    },
  ): Promise<{
    data: Array<{
      id: number;
      name: string;
      interval: string;
      priceCents: number;
      currency: string;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>;
    meta: PaginationMeta;
  }> {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);
    const page = clampPage(Number(params?.page ?? 1));
    const pageSize = clampPageSize(Number(params?.pageSize ?? 20));

    const where: {
      businessId: number;
      interval?: any;
      isActive?: boolean;
    } = {
      businessId,
    };

    const interval = (params?.interval ?? '').trim();
    if (interval) {
      where.interval = interval;
    }

    const isActiveRaw = (params?.isActive ?? '').trim().toLowerCase();
    if (isActiveRaw === 'true' || isActiveRaw === 'false') {
      where.isActive = isActiveRaw === 'true';
    }

    const total = await this.prisma.plan.count({ where });
    const meta = buildPaginationMeta(total, page, pageSize);
    const { skip, take } = paginationToSkipTake(meta);

    const data = await this.prisma.plan.findMany({
      where,
      orderBy: [{ interval: 'asc' }, { priceCents: 'asc' }, { id: 'asc' }],
      skip,
      take,
      select: {
        id: true,
        name: true,
        interval: true,
        priceCents: true,
        currency: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { data, meta };
  }

  async createPlatformPlan(
    currentUser: JwtPayload,
    payload: CreatePlanDto,
  ): Promise<{
    id: number;
    name: string;
    interval: string;
    priceCents: number;
    currency: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }> {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);

    const plan = await this.prisma.plan.create({
      data: {
        businessId,
        name: payload.name,
        interval: payload.interval as PlanInterval,
        priceCents: payload.priceCents,
        currency: payload.currency ?? 'TRY',
        isActive: payload.isActive ?? true,
      },
      select: {
        id: true,
        name: true,
        interval: true,
        priceCents: true,
        currency: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return plan;
  }

  async updatePlatformPlan(
    currentUser: JwtPayload,
    id: number,
    payload: UpdatePlanDto,
  ): Promise<{
    id: number;
    name: string;
    interval: string;
    priceCents: number;
    currency: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }> {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);

    const existing = await this.prisma.plan.findFirst({
      where: { id, businessId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Plan not found');
    }

    const plan = await this.prisma.plan.update({
      where: { id },
      data: {
        name: payload.name ?? undefined,
        interval: payload.interval
          ? (payload.interval as PlanInterval)
          : undefined,
        priceCents:
          typeof payload.priceCents === 'number'
            ? payload.priceCents
            : undefined,
        currency: payload.currency ?? undefined,
        isActive:
          typeof payload.isActive === 'boolean' ? payload.isActive : undefined,
      },
      select: {
        id: true,
        name: true,
        interval: true,
        priceCents: true,
        currency: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return plan;
  }
}
