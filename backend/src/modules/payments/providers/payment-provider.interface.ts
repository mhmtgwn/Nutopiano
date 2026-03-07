export type VerifyWebhookResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_signature' | 'missing_signature' };

export type InitializePaymentSessionInput = {
  conversationId: string;
  callbackUrl: string;
  currency: string;
  price: number;
  buyer: Record<string, unknown>;
  shippingAddress: Record<string, unknown>;
  billingAddress: Record<string, unknown>;
  basketItems: Array<Record<string, unknown>>;
};

export type InitializePaymentSessionResult = {
  token: string;
  conversationId: string | null;
  raw: Record<string, unknown>;
};

export type RetrievePaymentSessionInput = {
  conversationId: string;
  token: string;
};

export type RetrievePaymentSessionResult = {
  status: 'SUCCESS' | 'FAILURE' | 'PENDING';
  paymentId?: string | null;
  paidAmount?: number | null;
  raw: Record<string, unknown>;
};

export type CapturePaymentInput = {
  paymentId: string;
  amount?: number | null;
  conversationId: string;
};

export type CapturePaymentResult = {
  status: 'SUCCESS' | 'FAILURE' | 'PENDING';
  raw: Record<string, unknown>;
};

export type CancelPaymentInput = {
  paymentId: string;
  conversationId: string;
};

export type CancelPaymentResult = {
  status: 'SUCCESS' | 'FAILURE' | 'PENDING';
  raw: Record<string, unknown>;
};

export type RefundPaymentInput = {
  paymentId: string;
  amount: number;
  conversationId: string;
};

export type RefundPaymentResult = {
  status: 'SUCCESS' | 'FAILURE' | 'PENDING';
  raw: Record<string, unknown>;
};

export interface PaymentProviderClient {
  readonly provider: string;

  initSession(
    params: InitializePaymentSessionInput,
  ): Promise<InitializePaymentSessionResult>;

  retrieveSession(
    params: RetrievePaymentSessionInput,
  ): Promise<RetrievePaymentSessionResult>;

  capturePayment(
    params: CapturePaymentInput,
  ): Promise<CapturePaymentResult>;

  cancelPayment(
    params: CancelPaymentInput,
  ): Promise<CancelPaymentResult>;

  refundPayment(
    params: RefundPaymentInput,
  ): Promise<RefundPaymentResult>;

  verifyWebhookSignature(params: {
    rawBody?: Buffer;
    payload?: unknown;
    signature?: string;
  }): VerifyWebhookResult;
}
