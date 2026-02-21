import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordWebhookEvent(params: {
    provider: string;
    eventId: string;
    eventType?: string;
    payload: Prisma.InputJsonValue;
    signature?: string;
    businessId?: number;
  }): Promise<{ ok: true; created: boolean; eventDbId?: number }> {
    try {
      const created = await (this.prisma as any).paymentWebhookEvent.create({
        data: {
          businessId: params.businessId,
          provider: params.provider,
          eventId: params.eventId,
          eventType: params.eventType,
          payload: params.payload,
          signature: params.signature,
          status: 'RECEIVED',
        },
        select: { id: true },
      });

      return { ok: true, created: true, eventDbId: Number(created.id) };
    } catch (err: unknown) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return { ok: true, created: false };
      }
      throw err;
    }
  }

  async markWebhookProcessed(params: {
    provider: string;
    eventId: string;
    businessId?: number;
  }): Promise<void> {
    await (this.prisma as any).paymentWebhookEvent.updateMany({
      where: {
        provider: params.provider,
        eventId: params.eventId,
        businessId: params.businessId,
      },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
        error: null,
      },
    });
  }

  async markWebhookFailed(params: {
    provider: string;
    eventId: string;
    businessId?: number;
    error: string;
  }): Promise<void> {
    await (this.prisma as any).paymentWebhookEvent.updateMany({
      where: {
        provider: params.provider,
        eventId: params.eventId,
        businessId: params.businessId,
      },
      data: {
        status: 'FAILED',
        processedAt: new Date(),
        error: params.error,
      },
    });
  }

  listWebhookEvents(params: {
    provider?: string;
    status?: string;
    businessId?: number;
  }) {
    return (this.prisma as any).paymentWebhookEvent.findMany({
      where: {
        businessId: params.businessId,
        provider: params.provider,
        status: params.status,
      },
      orderBy: { receivedAt: 'desc' },
      select: {
        id: true,
        businessId: true,
        provider: true,
        eventId: true,
        eventType: true,
        status: true,
        receivedAt: true,
        processedAt: true,
        error: true,
      },
    });
  }

  listProviders() {
    return [{ provider: 'IYZICO' }];
  }
}
