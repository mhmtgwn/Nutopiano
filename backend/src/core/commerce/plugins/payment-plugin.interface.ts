import { PaymentMethod } from '@prisma/client';
import { CommercePlugin } from './plugin.interface';

export abstract class PaymentPlugin extends CommercePlugin {
  readonly kind = 'payments' as const;

  abstract initSession(params: {
    businessId: number;
    orderId: number;
    storeId?: number | null;
    amountCents: number;
    currency: string;
    callbackUrl?: string | null;
  }): Promise<Record<string, unknown>>;

  abstract retrieveSession(params: {
    businessId: number;
    token: string;
    conversationId?: string | null;
  }): Promise<{
    status: 'SUCCESS' | 'FAILURE' | 'PENDING';
    paymentId?: string | null;
    paidAmountCents?: number | null;
    method?: PaymentMethod | null;
    raw: Record<string, unknown>;
  }>;

  abstract capture?(params: {
    businessId: number;
    paymentId: number;
    amountCents?: number | null;
  }): Promise<Record<string, unknown>>;

  abstract cancel?(params: {
    businessId: number;
    paymentId: number;
    amountCents?: number | null;
    reason?: string | null;
  }): Promise<Record<string, unknown>>;

  abstract refund?(params: {
    businessId: number;
    paymentId: number;
    amountCents: number;
    reason?: string | null;
  }): Promise<Record<string, unknown>>;

  abstract verifyWebhook(params: {
    payload: unknown;
    signature?: string | null;
  }): Promise<boolean>;
}
