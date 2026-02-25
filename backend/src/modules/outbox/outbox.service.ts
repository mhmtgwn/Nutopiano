import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

type EnqueueOutboxEventInput = {
  businessId: number;
  aggregateType: string;
  aggregateId: string | number;
  eventType: string;
  payloadJson?: Prisma.InputJsonValue;
  idempotencyKey?: string | null;
};

@Injectable()
export class OutboxService {
  constructor(private readonly prisma: PrismaService) {}

  private isUniqueConstraintError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' && code === 'P2002';
  }

  async enqueueEvent(input: EnqueueOutboxEventInput) {
    const businessId = Number(input.businessId);
    if (!Number.isFinite(businessId) || businessId <= 0) {
      throw new BadRequestException('businessId gecersiz');
    }

    const aggregateType = String(input.aggregateType ?? '').trim();
    const aggregateId = String(input.aggregateId ?? '').trim();
    const eventType = String(input.eventType ?? '').trim();
    const idempotencyKey = input.idempotencyKey
      ? String(input.idempotencyKey).trim()
      : null;

    if (!aggregateType || !aggregateId || !eventType) {
      throw new BadRequestException('Outbox event alanlari eksik');
    }

    try {
      return await this.prisma.outboxEvent.create({
        data: {
          businessId,
          aggregateType,
          aggregateId,
          eventType,
          idempotencyKey: idempotencyKey || null,
          payloadJson: input.payloadJson ?? {},
        },
        select: {
          id: true,
          businessId: true,
          aggregateType: true,
          aggregateId: true,
          eventType: true,
          idempotencyKey: true,
          processedAt: true,
          deadLetteredAt: true,
          attemptCount: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (idempotencyKey && this.isUniqueConstraintError(error)) {
        const existing = await this.prisma.outboxEvent.findFirst({
          where: {
            businessId,
            aggregateType,
            aggregateId,
            eventType,
            idempotencyKey,
          },
          select: {
            id: true,
            businessId: true,
            aggregateType: true,
            aggregateId: true,
            eventType: true,
            idempotencyKey: true,
            processedAt: true,
            deadLetteredAt: true,
            attemptCount: true,
            createdAt: true,
          },
        });
        if (existing) {
          return existing;
        }
      }

      throw error;
    }
  }

  async listEvents(
    businessId: number,
    params?: { page?: number; pageSize?: number },
  ) {
    const page = Math.max(1, Math.trunc(Number(params?.page ?? 1)));
    const pageSize = Math.min(
      200,
      Math.max(1, Math.trunc(Number(params?.pageSize ?? 30))),
    );
    const skip = (page - 1) * pageSize;

    const where = { businessId };
    const [total, data] = await Promise.all([
      this.prisma.outboxEvent.count({ where }),
      this.prisma.outboxEvent.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
        select: {
          id: true,
          aggregateType: true,
          aggregateId: true,
          eventType: true,
          idempotencyKey: true,
          payloadJson: true,
          attemptCount: true,
          nextRetryAt: true,
          lastError: true,
          deadLetteredAt: true,
          processedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async getMetrics(businessId: number) {
    const whereBusiness = { businessId };

    const [
      totalCount,
      processedCount,
      pendingCount,
      retryCount,
      deadLetterCount,
      failedCount,
    ] = await Promise.all([
      this.prisma.outboxEvent.count({ where: whereBusiness }),
      this.prisma.outboxEvent.count({
        where: {
          ...whereBusiness,
          processedAt: { not: null },
        },
      }),
      this.prisma.outboxEvent.count({
        where: {
          ...whereBusiness,
          processedAt: null,
          deadLetteredAt: null,
        },
      }),
      this.prisma.outboxEvent.count({
        where: {
          ...whereBusiness,
          processedAt: null,
          deadLetteredAt: null,
          attemptCount: { gt: 0 },
        },
      }),
      this.prisma.outboxEvent.count({
        where: {
          ...whereBusiness,
          deadLetteredAt: { not: null },
        },
      }),
      this.prisma.outboxEvent.count({
        where: {
          ...whereBusiness,
          processedAt: null,
          attemptCount: { gt: 0 },
        },
      }),
    ]);

    return {
      totalCount,
      processedCount,
      pendingCount,
      retryCount,
      failedCount,
      deadLetterCount,
    };
  }
}
