import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class OutboxWorkerService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;
  private shuttingDown = false;
  private running = false;
  private readonly processing = new Set<number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const enabled = (this.config.get<string>('OUTBOX_WORKER_ENABLED') ?? 'true') === 'true';
    if (!enabled) {
      return;
    }

    const intervalMs = this.resolvePollIntervalMs();
    this.timer = setInterval(() => {
      void this.tick().catch(() => undefined);
    }, intervalMs);

    void this.tick().catch(() => undefined);
  }

  onModuleDestroy() {
    this.shuttingDown = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.processing.clear();
  }

  private resolvePollIntervalMs(): number {
    const parsed = Math.trunc(
      Number(this.config.get<string>('OUTBOX_POLL_INTERVAL_MS') ?? 750),
    );
    if (!Number.isFinite(parsed)) return 750;
    return Math.max(200, Math.min(parsed, 30_000));
  }

  private resolveBatchSize(): number {
    const parsed = Math.trunc(
      Number(this.config.get<string>('OUTBOX_BATCH_SIZE') ?? 30),
    );
    if (!Number.isFinite(parsed)) return 30;
    return Math.max(1, Math.min(parsed, 200));
  }

  private resolveMaxAttempts(): number {
    const parsed = Math.trunc(
      Number(this.config.get<string>('OUTBOX_MAX_ATTEMPTS') ?? 3),
    );
    if (!Number.isFinite(parsed)) return 3;
    return Math.max(1, Math.min(parsed, 20));
  }

  private resolveBaseRetryDelayMs(): number {
    const parsed = Math.trunc(
      Number(this.config.get<string>('OUTBOX_RETRY_DELAY_MS') ?? 500),
    );
    if (!Number.isFinite(parsed)) return 500;
    return Math.max(100, Math.min(parsed, 120_000));
  }

  private computeRetryDelayMs(attemptCount: number): number {
    const base = this.resolveBaseRetryDelayMs();
    const exponent = Math.max(0, Math.min(attemptCount - 1, 6));
    return base * Math.pow(2, exponent);
  }

  private async tick() {
    if (this.shuttingDown || this.running) {
      return;
    }
    this.running = true;
    try {
      const now = new Date();
      const candidates = await this.prisma.outboxEvent.findMany({
        where: {
          processedAt: null,
          deadLetteredAt: null,
          OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: this.resolveBatchSize(),
        select: { id: true },
      });

      for (const row of candidates) {
        if (this.shuttingDown) break;
        await this.processOne(row.id);
      }
    } finally {
      this.running = false;
    }
  }

  private async processOne(eventId: number) {
    if (this.shuttingDown || this.processing.has(eventId)) {
      return;
    }
    this.processing.add(eventId);

    try {
      const lockTime = new Date();
      const lockResult = await this.prisma.outboxEvent.updateMany({
        where: {
          id: eventId,
          processedAt: null,
          deadLetteredAt: null,
        },
        data: {
          attemptCount: { increment: 1 },
          processingStartedAt: lockTime,
        },
      });

      if (lockResult.count === 0) {
        return;
      }

      const current = await this.prisma.outboxEvent.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          eventType: true,
          payloadJson: true,
          attemptCount: true,
        },
      });

      if (!current) {
        return;
      }

      try {
        const payload = current.payloadJson as Record<string, unknown> | null;
        const forceFail =
          payload && typeof payload === 'object' && payload.forceFail === true;
        if (forceFail) {
          throw new Error('Forced outbox failure');
        }

        await this.prisma.outboxEvent.update({
          where: { id: current.id },
          data: {
            processedAt: new Date(),
            nextRetryAt: null,
            processingStartedAt: null,
            lastError: null,
          },
        });
      } catch (error) {
        const maxAttempts = this.resolveMaxAttempts();
        const attemptCount = Math.max(1, Number(current.attemptCount ?? 1));
        const message =
          error instanceof Error ? error.message : 'Outbox processing failed';

        if (attemptCount >= maxAttempts) {
          await this.prisma.outboxEvent.update({
            where: { id: current.id },
            data: {
              deadLetteredAt: new Date(),
              processingStartedAt: null,
              nextRetryAt: null,
              lastError: message,
            },
          });
          return;
        }

        const retryDelayMs = this.computeRetryDelayMs(attemptCount);
        await this.prisma.outboxEvent.update({
          where: { id: current.id },
          data: {
            nextRetryAt: new Date(Date.now() + retryDelayMs),
            processingStartedAt: null,
            lastError: message,
          },
        });
      }
    } catch {
      return;
    } finally {
      this.processing.delete(eventId);
    }
  }
}
