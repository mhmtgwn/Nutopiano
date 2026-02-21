import { Injectable } from '@nestjs/common';
import crypto from 'crypto';
import {
  PaymentProviderClient,
  VerifyWebhookResult,
} from './payment-provider.interface';

@Injectable()
export class IyzicoProvider implements PaymentProviderClient {
  readonly provider = 'IYZICO';

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
