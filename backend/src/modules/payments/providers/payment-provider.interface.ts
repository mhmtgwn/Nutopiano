export type VerifyWebhookResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_signature' | 'missing_signature' };

export interface PaymentProviderClient {
  readonly provider: string;

  verifyWebhookSignature(params: {
    rawBody?: Buffer;
    payload?: unknown;
    signature?: string;
  }): VerifyWebhookResult;
}
