import { PaymentMethod } from '@prisma/client';
import { Prisma } from '@prisma/client';

export type PaymentProviderSessionInitResult = {
  provider: string;
  token: string;
  conversationId: string | null;
  response: Record<string, unknown>;
};

export type PaymentProviderSessionRetrieveResult = {
  provider: string;
  status: 'SUCCESS' | 'FAILURE' | 'PENDING';
  paymentId?: string | null;
  paidAmountCents?: number | null;
  response: Record<string, unknown>;
};

export type RecordPaymentInput = {
  businessId: number;
  orderId: number;
  storeId?: number | null;
  sellerId?: number | null;
  createdByUserId?: number | null;
  amountCents: number;
  method: PaymentMethod;
  reference?: string | null;
  provider?: string | null;
  idempotencyKey?: string | null;
  tx?: Prisma.TransactionClient;
};

export type RecordRefundInput = {
  businessId: number;
  orderId: number;
  paymentId?: number | null;
  storeId?: number | null;
  sellerId?: number | null;
  createdByUserId?: number | null;
  amountCents: number;
  method?: PaymentMethod | null;
  reason?: string | null;
  reference?: string | null;
  provider?: string | null;
  tx?: Prisma.TransactionClient;
};

export abstract class PaymentsPort {
  abstract initializeIyzicoSession(params: {
    businessId: number;
    orderId: number;
    userId?: number | null;
    callbackUrl?: string | null;
    requestedConversationId?: string | null;
  }): Promise<PaymentProviderSessionInitResult>;

  abstract retrieveIyzicoSession(params: {
    businessId: number;
    token: string;
    conversationId?: string | null;
  }): Promise<PaymentProviderSessionRetrieveResult>;

  abstract recordPayment(input: RecordPaymentInput): Promise<{
    payment: {
      id: number;
      amountCents: number;
      method: PaymentMethod;
      reference: string | null;
      createdAt: Date;
    };
    transactionId: number;
  }>;

  abstract recordRefund(input: RecordRefundInput): Promise<{
    payment: {
      id: number;
      amountCents: number;
      method: PaymentMethod;
      reference: string | null;
      createdAt: Date;
    };
    refundId: number;
    transactionId: number;
  }>;
}
