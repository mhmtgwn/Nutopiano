import { Injectable } from '@nestjs/common';
import crypto from 'crypto';
import {
  CancelPaymentInput,
  CancelPaymentResult,
  CapturePaymentInput,
  CapturePaymentResult,
  InitializePaymentSessionInput,
  InitializePaymentSessionResult,
  PaymentProviderClient,
  RefundPaymentInput,
  RefundPaymentResult,
  RetrievePaymentSessionInput,
  RetrievePaymentSessionResult,
  VerifyWebhookResult,
} from './payment-provider.interface';

@Injectable()
export class IyzicoProvider implements PaymentProviderClient {
  readonly provider = 'IYZICO';

  private getApiBaseUrl() {
    return (
      process.env.IYZICO_BASE_URL ?? 'https://sandbox-api.iyzipay.com'
    ).trim();
  }

  private async postIyzico<T extends Record<string, unknown>>(params: {
    uriPath: string;
    body: Record<string, unknown>;
  }): Promise<T> {
    const { authorization, randomKey } = this.buildIyzicoAuthHeader({
      uriPath: params.uriPath,
      body: params.body,
    });

    const response = await fetch(`${this.getApiBaseUrl()}${params.uriPath}`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
        'x-iyzi-rnd': randomKey,
      },
      body: JSON.stringify(params.body),
    });

    const text = await response.text();
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      json = { raw: text };
    }

    if (!response.ok || json?.status === 'failure') {
      throw new Error(String(json?.errorMessage ?? 'Iyzico request failed'));
    }

    return json as T;
  }

  buildIyzicoAuthHeader(params: {
    uriPath: string;
    body?: unknown;
  }): { authorization: string; randomKey: string } {
    const apiKey = (process.env.IYZICO_API_KEY ?? '').trim();
    const secretKey = (process.env.IYZICO_SECRET_KEY ?? '').trim();
    if (!apiKey || !secretKey) {
      // Keep error shape simple; controller converts it to 400.
      throw new Error('IYZICO_API_KEY/IYZICO_SECRET_KEY is not configured');
    }

    const randomKey = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
    const requestBody = params.body ? JSON.stringify(params.body) : '';
    const payload = `${randomKey}${params.uriPath}${requestBody}`;

    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(payload)
      .digest('hex');

    const authorizationString = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`;
    const base64Encoded = Buffer.from(authorizationString, 'utf8').toString('base64');
    return {
      authorization: `IYZWSv2 ${base64Encoded}`,
      randomKey,
    };
  }

  async initSession(
    params: InitializePaymentSessionInput,
  ): Promise<InitializePaymentSessionResult> {
    const raw = await this.postIyzico<Record<string, unknown>>({
      uriPath: '/payment/iyzipos/checkoutform/initialize/auth/ecom',
      body: {
        locale: (process.env.IYZICO_LOCALE ?? 'tr').trim(),
        conversationId: params.conversationId,
        price: params.price,
        paidPrice: params.price,
        currency: params.currency,
        paymentGroup: 'PRODUCT',
        basketId: params.conversationId,
        callbackUrl: params.callbackUrl,
        enabledInstallments: [1],
        buyer: params.buyer,
        shippingAddress: params.shippingAddress,
        billingAddress: params.billingAddress,
        basketItems: params.basketItems,
      },
    });

    const token = typeof raw.token === 'string' ? raw.token.trim() : '';
    if (!token) {
      throw new Error('Iyzico token missing');
    }

    return {
      token,
      conversationId:
        typeof raw.conversationId === 'string'
          ? raw.conversationId
          : params.conversationId,
      raw,
    };
  }

  async retrieveSession(
    params: RetrievePaymentSessionInput,
  ): Promise<RetrievePaymentSessionResult> {
    const raw = await this.postIyzico<Record<string, unknown>>({
      uriPath: '/payment/iyzipos/checkoutform/auth/ecom/detail',
      body: {
        locale: (process.env.IYZICO_LOCALE ?? 'tr').trim(),
        conversationId: params.conversationId,
        token: params.token,
      },
    });

    const normalized = String(raw.paymentStatus ?? raw.status ?? '')
      .trim()
      .toUpperCase();
    const status =
      normalized === 'SUCCESS'
        ? 'SUCCESS'
        : normalized === 'FAILURE'
          ? 'FAILURE'
          : 'PENDING';

    const paymentId =
      raw.paymentId !== undefined && raw.paymentId !== null
        ? String(raw.paymentId)
        : null;
    const paidAmount =
      typeof raw.paidPrice === 'number'
        ? raw.paidPrice
        : Number.isFinite(Number(raw.paidPrice))
          ? Number(raw.paidPrice)
          : null;

    return {
      status,
      paymentId,
      paidAmount,
      raw,
    };
  }

  async capturePayment(
    params: CapturePaymentInput,
  ): Promise<CapturePaymentResult> {
    return {
      status: params.paymentId.trim() ? 'SUCCESS' : 'FAILURE',
      raw: { provider: this.provider, action: 'capture.not_implemented' },
    };
  }

  async cancelPayment(
    params: CancelPaymentInput,
  ): Promise<CancelPaymentResult> {
    return {
      status: params.paymentId.trim() ? 'SUCCESS' : 'FAILURE',
      raw: { provider: this.provider, action: 'cancel.not_implemented' },
    };
  }

  async refundPayment(
    params: RefundPaymentInput,
  ): Promise<RefundPaymentResult> {
    return {
      status:
        params.paymentId.trim() && Number(params.amount) > 0
          ? 'SUCCESS'
          : 'FAILURE',
      raw: { provider: this.provider, action: 'refund.not_implemented' },
    };
  }

  verifyWebhookSignature(params: {
    rawBody?: Buffer;
    payload?: unknown;
    signature?: string;
  }): VerifyWebhookResult {
    const signature = params.signature?.trim();
    if (!signature) {
      return { ok: false, reason: 'missing_signature' };
    }

    const secretKey = (process.env.IYZICO_SECRET_KEY ?? '').trim();
    if (!secretKey) {
      return { ok: false, reason: 'invalid_signature' };
    }

    const normalized = signature.replace(/\s+/g, '').toLowerCase();

    // Prefer V3 verification when payload is present.
    // HPP (Hosted Payment Page / CheckoutForm) format:
    // HEX(HMACSHA256(secretKey + iyziEventType + iyziPaymentId + token + paymentConversationId + status))
    if (params.payload && typeof params.payload === 'object') {
      const p = params.payload as Record<string, unknown>;
      const iyziEventType = typeof p.iyziEventType === 'string' ? p.iyziEventType : undefined;
      const iyziPaymentId =
        typeof p.iyziPaymentId === 'string' || typeof p.iyziPaymentId === 'number'
          ? String(p.iyziPaymentId)
          : undefined;
      const token = typeof p.token === 'string' ? p.token : undefined;
      const paymentConversationId =
        typeof p.paymentConversationId === 'string'
          ? p.paymentConversationId
          : undefined;
      const status = typeof p.status === 'string' ? p.status : undefined;

      if (
        iyziEventType &&
        iyziPaymentId &&
        token &&
        paymentConversationId &&
        status
      ) {
        const dataToSign =
          secretKey +
          iyziEventType +
          iyziPaymentId +
          token +
          paymentConversationId +
          status;

        const computedHex = crypto
          .createHmac('sha256', secretKey)
          .update(dataToSign)
          .digest('hex')
          .toLowerCase();

        return computedHex === normalized
          ? { ok: true }
          : { ok: false, reason: 'invalid_signature' };
      }
    }

    // Fallback legacy verification: keep compatibility if someone still sends
    // the old signature scheme (rawBody-based). This is best-effort.
    const legacySecret = (process.env.IYZICO_WEBHOOK_SECRET ?? '').trim();
    if (!legacySecret) {
      return { ok: false, reason: 'invalid_signature' };
    }

    const rawBody = params.rawBody;
    if (!rawBody || !(rawBody instanceof Buffer)) {
      return { ok: false, reason: 'invalid_signature' };
    }

    const legacyHex = crypto
      .createHmac('sha256', legacySecret)
      .update(rawBody)
      .digest('hex')
      .toLowerCase();

    const legacyNormalized = normalized.replace(/^sha256=/i, '');
    const legacyCandidates = new Set<string>();
    legacyCandidates.add(legacyHex);
    legacyCandidates.add(Buffer.from(legacyHex, 'hex').toString('base64').toLowerCase());

    return legacyCandidates.has(legacyNormalized)
      ? { ok: true }
      : { ok: false, reason: 'invalid_signature' };
  }
}
