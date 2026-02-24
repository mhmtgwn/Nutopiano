import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InviteDeliveryChannel } from '@prisma/client';
import { EmailService } from '../../email/email.service';

export type InviteDeliverySendPayload = {
  inviteId: number;
  inviteToken: string;
  expiresAt: Date;
  sellerDisplayName: string;
  targetName?: string | null;
  targetPhone?: string | null;
  targetEmail?: string | null;
};

export type InviteDeliverySendResult = {
  externalId?: string;
};

export interface InviteDeliveryAdapter {
  readonly channel: InviteDeliveryChannel;
  send(payload: InviteDeliverySendPayload): Promise<InviteDeliverySendResult>;
}

@Injectable()
export class InviteDeliveryEmailAdapter implements InviteDeliveryAdapter {
  readonly channel: InviteDeliveryChannel = 'EMAIL';

  constructor(
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async send(payload: InviteDeliverySendPayload): Promise<InviteDeliverySendResult> {
    const enabled =
      (this.config.get<string>('SELLER_INVITE_EMAIL_ENABLED') ?? 'true') ===
      'true';
    if (!enabled) {
      throw new Error('EMAIL invite delivery disabled');
    }

    const targetEmail = String(payload.targetEmail ?? '').trim();
    if (!targetEmail) {
      throw new Error('Target email bulunamadi');
    }

    const frontendBase =
      this.config.get<string>('FRONTEND_URL') ??
      this.config.get<string>('APP_URL') ??
      'http://localhost:3000';
    const baseUrl = frontendBase.replace(/\/+$/, '');
    const inviteUrl = `${baseUrl}/login?sellerInviteToken=${encodeURIComponent(payload.inviteToken)}`;

    await this.emailService.sendSellerTeamInviteEmail({
      to: targetEmail,
      sellerName: payload.sellerDisplayName,
      inviteUrl,
      expiresAt: payload.expiresAt,
      targetName: payload.targetName ?? undefined,
    });

    return {};
  }
}

@Injectable()
export class InviteDeliverySmsAdapter implements InviteDeliveryAdapter {
  readonly channel: InviteDeliveryChannel = 'SMS';

  constructor(private readonly config: ConfigService) {}

  async send(payload: InviteDeliverySendPayload): Promise<InviteDeliverySendResult> {
    const enabled =
      (this.config.get<string>('SELLER_INVITE_SMS_ENABLED') ?? 'true') ===
      'true';
    if (!enabled) {
      throw new Error('SMS invite delivery disabled');
    }

    const targetPhone = String(payload.targetPhone ?? '').trim();
    if (!targetPhone) {
      throw new Error('Target phone bulunamadi');
    }

    const forcedFailurePhones = String(
      this.config.get<string>('SELLER_INVITE_SMS_FAIL_PHONES') ?? '',
    )
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (forcedFailurePhones.includes(targetPhone)) {
      throw new Error('Simulated SMS failure');
    }

    console.log('Invite SMS queued', {
      inviteId: payload.inviteId,
      to: targetPhone,
      sellerName: payload.sellerDisplayName,
    });

    return {
      externalId: `mock-sms-${payload.inviteId}-${Date.now()}`,
    };
  }
}
