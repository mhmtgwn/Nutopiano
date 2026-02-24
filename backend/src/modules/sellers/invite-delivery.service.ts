import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InviteDeliveryChannel, InviteDeliveryStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  InviteDeliveryAdapter,
  InviteDeliveryEmailAdapter,
  InviteDeliverySmsAdapter,
} from './invite-delivery.adapters';

@Injectable()
export class SellerInviteDeliveryService
  implements OnModuleDestroy
{
  private readonly adapters = new Map<InviteDeliveryChannel, InviteDeliveryAdapter>();
  private readonly timers = new Map<number, NodeJS.Timeout>();
  private readonly processing = new Set<number>();
  private shuttingDown = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    emailAdapter: InviteDeliveryEmailAdapter,
    smsAdapter: InviteDeliverySmsAdapter,
  ) {
    this.adapters.set(emailAdapter.channel, emailAdapter);
    this.adapters.set(smsAdapter.channel, smsAdapter);
  }

  onModuleDestroy() {
    this.shuttingDown = true;

    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.processing.clear();
  }

  private resolveConfiguredChannels(): InviteDeliveryChannel[] {
    const raw = String(
      this.config.get<string>('SELLER_INVITE_DELIVERY_CHANNELS') ?? 'SMS',
    );
    const values = raw
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);
    const allowed = new Set<InviteDeliveryChannel>(['EMAIL', 'SMS']);
    const channels = Array.from(
      new Set(values.filter((value): value is InviteDeliveryChannel => allowed.has(value as InviteDeliveryChannel))),
    );
    return channels.length > 0 ? channels : ['SMS'];
  }

  private resolveMaxAttempts(): number {
    const parsed = Math.trunc(
      Number(this.config.get<string>('SELLER_INVITE_DELIVERY_MAX_ATTEMPTS') ?? 3),
    );
    if (!Number.isFinite(parsed)) {
      return 3;
    }
    return Math.max(1, Math.min(parsed, 10));
  }

  private resolveRetryDelayMs(): number {
    const parsed = Math.trunc(
      Number(this.config.get<string>('SELLER_INVITE_RETRY_DELAY_MS') ?? 500),
    );
    if (!Number.isFinite(parsed)) {
      return 500;
    }
    return Math.max(50, Math.min(parsed, 60_000));
  }

  private enqueueDelivery(deliveryId: number, delayMs = 0) {
    if (this.shuttingDown) {
      return;
    }

    if (!Number.isFinite(deliveryId) || deliveryId <= 0) {
      return;
    }

    const existingTimer = this.timers.get(deliveryId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.timers.delete(deliveryId);
      void this.processDelivery(deliveryId).catch(() => undefined);
    }, Math.max(0, delayMs));

    this.timers.set(deliveryId, timer);
  }

  async ensureDeliveriesForInvite(inviteId: number): Promise<void> {
    if (this.shuttingDown) {
      return;
    }

    if (!Number.isFinite(inviteId) || inviteId <= 0) {
      return;
    }

    const invite = await this.prisma.sellerInvite.findFirst({
      where: { id: inviteId },
      select: {
        id: true,
        businessId: true,
        token: true,
        expiresAt: true,
        seller: {
          select: {
            displayName: true,
          },
        },
        targetUser: {
          select: {
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!invite) {
      return;
    }

    const maxAttempts = this.resolveMaxAttempts();
    const channels = this.resolveConfiguredChannels();

    for (const channel of channels) {
      const target =
        channel === 'EMAIL'
          ? String(invite.targetUser.email ?? '').trim()
          : String(invite.targetUser.phone ?? '').trim();

      const existing = await this.prisma.sellerInviteDelivery.findFirst({
        where: {
          inviteId: invite.id,
          channel,
        },
        select: {
          id: true,
          status: true,
          nextRetryAt: true,
        },
      });

      if (existing) {
        if (existing.status === 'PENDING' || existing.status === 'RETRY') {
          const delayMs =
            existing.status === 'RETRY' && existing.nextRetryAt
              ? Math.max(existing.nextRetryAt.getTime() - Date.now(), 0)
              : 0;
          this.enqueueDelivery(existing.id, delayMs);
        }
        continue;
      }

      const missingTarget = target.length === 0;
      const created = await this.prisma.sellerInviteDelivery.create({
        data: {
          businessId: invite.businessId,
          inviteId: invite.id,
          channel,
          target: missingTarget ? `missing:${channel.toLowerCase()}` : target,
          status: missingTarget ? 'DEAD_LETTER' : 'PENDING',
          maxAttempts,
          lastError: missingTarget ? `${channel} hedefi bulunamadi` : null,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (created.status === 'PENDING') {
        this.enqueueDelivery(created.id, 0);
      }
    }
  }

  private async processDelivery(deliveryId: number): Promise<void> {
    if (this.shuttingDown) {
      return;
    }

    if (this.processing.has(deliveryId)) {
      return;
    }
    this.processing.add(deliveryId);

    try {
      const delivery = await this.prisma.sellerInviteDelivery.findUnique({
        where: { id: deliveryId },
        select: {
          id: true,
          channel: true,
          status: true,
          target: true,
          attemptCount: true,
          maxAttempts: true,
          nextRetryAt: true,
          invite: {
            select: {
              id: true,
              token: true,
              expiresAt: true,
              seller: {
                select: {
                  displayName: true,
                },
              },
              targetUser: {
                select: {
                  name: true,
                  phone: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!delivery) {
        return;
      }

      if (delivery.status === 'SENT' || delivery.status === 'DEAD_LETTER') {
        return;
      }

      if (delivery.status === 'RETRY' && delivery.nextRetryAt) {
        const delayMs = delivery.nextRetryAt.getTime() - Date.now();
        if (delayMs > 0) {
          this.enqueueDelivery(delivery.id, delayMs);
          return;
        }
      }

      const adapter = this.adapters.get(delivery.channel);
      if (!adapter) {
        throw new Error(`Adapter bulunamadi: ${delivery.channel}`);
      }

      const now = new Date();
      const nextAttemptCount = delivery.attemptCount + 1;

      try {
        await adapter.send({
          inviteId: delivery.invite.id,
          inviteToken: delivery.invite.token,
          expiresAt: delivery.invite.expiresAt,
          sellerDisplayName: delivery.invite.seller.displayName,
          targetName: delivery.invite.targetUser.name,
          targetPhone:
            delivery.channel === 'SMS'
              ? delivery.target
              : delivery.invite.targetUser.phone,
          targetEmail:
            delivery.channel === 'EMAIL'
              ? delivery.target
              : delivery.invite.targetUser.email,
        });

        await this.prisma.sellerInviteDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'SENT',
            attemptCount: nextAttemptCount,
            lastAttemptAt: now,
            lastError: null,
            nextRetryAt: null,
            sentAt: now,
          },
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Delivery failed';
        const isDeadLetter = nextAttemptCount >= delivery.maxAttempts;
        const retryDelayMs = this.resolveRetryDelayMs();
        const nextRetryAt = isDeadLetter
          ? null
          : new Date(Date.now() + retryDelayMs);
        const nextStatus: InviteDeliveryStatus = isDeadLetter
          ? 'DEAD_LETTER'
          : 'RETRY';

        await this.prisma.sellerInviteDelivery.update({
          where: { id: delivery.id },
          data: {
            status: nextStatus,
            attemptCount: nextAttemptCount,
            lastAttemptAt: now,
            lastError: errorMessage,
            nextRetryAt,
          },
        });

        if (!isDeadLetter && nextRetryAt) {
          this.enqueueDelivery(delivery.id, retryDelayMs);
        }
      }
    } catch {
      return;
    } finally {
      this.processing.delete(deliveryId);
    }
  }
}
