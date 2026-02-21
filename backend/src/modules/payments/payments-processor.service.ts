import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

type WebhookEventRecord = {
  id: number;
  provider: string;
  eventId: string;
  businessId: number | null;
  payload: unknown;
  eventType: string | null;
};

@Injectable()
export class PaymentsProcessorService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger = new Logger(PaymentsProcessorService.name);

  private isDevDebugEnabled() {
    return process.env.NODE_ENV !== 'production';
  }

  private safePayloadKeys(payload: unknown): string[] {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return [];
    return Object.keys(payload as Record<string, unknown>).slice(0, 40);
  }

  private findFirstString(obj: unknown, keys: string[]): string | undefined {
    const needle = new Set(keys.map((k) => k.toLowerCase()));

    const visit = (value: unknown): string | undefined => {
      if (!value) return undefined;
      if (typeof value === 'string') return undefined;

      if (Array.isArray(value)) {
        for (const v of value) {
          const found = visit(v);
          if (found) return found;
        }
        return undefined;
      }

      if (typeof value === 'object') {
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          if (needle.has(k.toLowerCase()) && typeof v === 'string' && v.trim()) {
            return v.trim();
          }
          const nested = visit(v);
          if (nested) return nested;
        }
      }

      return undefined;
    };

    return visit(obj);
  }

  private findFirstNumber(obj: unknown, keys: string[]): number | undefined {
    const needle = new Set(keys.map((k) => k.toLowerCase()));

    const visit = (value: unknown): number | undefined => {
      if (value === null || value === undefined) return undefined;
      if (typeof value === 'number' && Number.isFinite(value)) return value;

      if (Array.isArray(value)) {
        for (const v of value) {
          const found = visit(v);
          if (found !== undefined) return found;
        }
        return undefined;
      }

      if (typeof value === 'object') {
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          if (needle.has(k.toLowerCase())) {
            const n = typeof v === 'number' ? v : Number(v);
            if (Number.isFinite(n)) return n;
          }
          const nested = visit(v);
          if (nested !== undefined) return nested;
        }
      }

      return undefined;
    };

    return visit(obj);
  }

  private async processEvent(ev: WebhookEventRecord): Promise<'processed' | 'skipped' | 'failed'> {
    // Idempotent claim: if another worker already processed it, updateMany count will be 0.
    const claimed = await (this.prisma as any).paymentWebhookEvent.updateMany({
      where: {
        id: ev.id,
        status: 'RECEIVED',
      },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
        error: null,
      },
    });

    if (claimed.count === 0) {
      return 'skipped';
    }

    try {
      // Best-effort event processing.
      // If we can find token/paymentId we will bind to PaymentSession and create Payment.
      if (String(ev.provider).toUpperCase() === 'IYZICO') {
        const payload = ev.payload as unknown;
        const debug = this.isDevDebugEnabled();

        const token = this.findFirstString(payload, [
          'token',
          'checkoutFormToken',
          'checkoutFormtoken',
          'checkoutformtoken',
        ]);

        const paymentId = this.findFirstString(payload, ['paymentId', 'paymentid']);
        const paymentStatus = this.findFirstString(payload, [
          'paymentStatus',
          'status',
          'result',
        ]);

        const paidPrice = this.findFirstNumber(payload, ['paidPrice', 'paidprice', 'price']);

        if (debug && !token) {
          this.logger.debug(
            `Webhook parse: token not found (eventId=${String(ev.eventId)}, eventType=${String(ev.eventType ?? '')}, keys=${this.safePayloadKeys(payload).join(',')})`,
          );
        }

        if (token) {
          const session = await (this.prisma as any).paymentSession.findFirst({
            where: {
              businessId: ev.businessId ?? undefined,
              provider: 'IYZICO',
              token,
            },
            select: {
              id: true,
              businessId: true,
              orderId: true,
              amountCents: true,
            },
          });

          if (debug && !session) {
            this.logger.debug(
              `Webhook parse: PaymentSession not found (token=${token}, eventId=${String(ev.eventId)})`,
            );
          }

          if (session) {
            const normalizedStatus = String(paymentStatus ?? '').toUpperCase();
            const isSuccess = normalizedStatus === 'SUCCESS';

            if (debug && !normalizedStatus) {
              this.logger.debug(
                `Webhook parse: paymentStatus not found (token=${token}, eventId=${String(ev.eventId)})`,
              );
            }

            if (isSuccess && paymentId) {
              const amountCents = Number.isFinite(paidPrice)
                ? Math.round(Number(paidPrice) * 100)
                : Number(session.amountCents);

              const existing = await this.prisma.payment.findFirst({
                where: {
                  businessId: Number(session.businessId),
                  reference: paymentId,
                },
                select: { id: true },
              });

              if (!existing) {
                await this.prisma.payment.create({
                  data: {
                    businessId: Number(session.businessId),
                    orderId: Number(session.orderId),
                    amountCents,
                    method: 'CARD',
                    reference: paymentId,
                  } as any,
                  select: { id: true },
                });
              }

              await (this.prisma as any).paymentSession.updateMany({
                where: { id: session.id },
                data: { status: 'COMPLETED', paymentId },
              });
            } else if (isSuccess && debug && !paymentId) {
              this.logger.debug(
                `Webhook parse: paymentId not found on SUCCESS (token=${token}, eventId=${String(ev.eventId)})`,
              );
            } else if (normalizedStatus) {
              await (this.prisma as any).paymentSession.updateMany({
                where: { id: session.id },
                data: { status: 'FAILED' },
              });
            }
          }
        }
      }

      return 'processed';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      await (this.prisma as any).paymentWebhookEvent.updateMany({
        where: {
          id: ev.id,
        },
        data: {
          status: 'FAILED',
          processedAt: new Date(),
          error: message,
        },
      });
      return 'failed';
    }
  }

  async processEventById(params: { eventDbId: number }) {
    const eventDbId = Number(params.eventDbId);
    if (!Number.isFinite(eventDbId) || eventDbId <= 0) {
      return { ok: false as const, reason: 'invalid_event_id' };
    }

    const ev = await (this.prisma as any).paymentWebhookEvent.findFirst({
      where: { id: eventDbId },
      select: {
        id: true,
        provider: true,
        eventId: true,
        businessId: true,
        payload: true,
        eventType: true,
      },
    });

    if (!ev) {
      return { ok: false as const, reason: 'not_found' };
    }

    const outcome = await this.processEvent(ev as WebhookEventRecord);
    return { ok: true as const, outcome };
  }

  async processReceivedEvents(params: {
    provider: string;
    limit?: number;
    businessId?: number;
  }) {
    const limit = Math.min(Math.max(Number(params.limit ?? 50), 1), 200);

    const events = await (this.prisma as any).paymentWebhookEvent.findMany({
      where: {
        provider: params.provider,
        status: 'RECEIVED',
        businessId: params.businessId,
      },
      orderBy: { receivedAt: 'asc' },
      take: limit,
      select: {
        id: true,
        provider: true,
        eventId: true,
        businessId: true,
        payload: true,
        eventType: true,
      },
    });

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const ev of events) {
      const outcome = await this.processEvent(ev as WebhookEventRecord);
      if (outcome === 'processed') processed++;
      if (outcome === 'skipped') skipped++;
      if (outcome === 'failed') failed++;
    }

    return {
      ok: true as const,
      total: events.length,
      processed,
      skipped,
      failed,
    };
  }
}
