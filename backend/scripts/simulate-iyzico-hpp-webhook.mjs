import crypto from 'crypto';

const apiBase = process.env.API_BASE_URL ?? 'http://localhost:3001/api/v1';
const secretKey = (process.env.IYZICO_SECRET_KEY ?? '').trim();
const testBusinessIdRaw = (process.env.TEST_BUSINESS_ID ?? '').trim();
const testBusinessId = testBusinessIdRaw ? Number(testBusinessIdRaw) : undefined;

if (!secretKey) {
  // eslint-disable-next-line no-console
  console.error('Missing env: IYZICO_SECRET_KEY');
  process.exit(1);
}

const payload = {
  // HPP / CheckoutForm webhook format fields (from iyzico docs)
  paymentConversationId: `conv-${Date.now()}`,
  merchantId: 'TEST_MID',
  token: `token-${Date.now()}`,
  status: 'SUCCESS',
  iyziReferenceCode: `ref-${Date.now()}`,
  iyziEventType: 'CHECKOUT_FORM_AUTH',
  iyziEventTime: Date.now(),
  iyziPaymentId: String(Math.floor(Math.random() * 1_000_000_000)),
};

const dataToSign =
  secretKey +
  String(payload.iyziEventType) +
  String(payload.iyziPaymentId) +
  String(payload.token) +
  String(payload.paymentConversationId) +
  String(payload.status);

const signatureV3 = crypto
  .createHmac('sha256', secretKey)
  .update(dataToSign)
  .digest('hex');

const body = {
  eventId: `evt-${Date.now()}`,
  eventType: payload.iyziEventType,
  payload,
  // businessId is optional; real iyzico won't send it.
  // For local simulation, include it so admin processing (scoped by JWT businessId) can find the event.
  businessId: Number.isFinite(testBusinessId) ? testBusinessId : 1,
};

const url = `${apiBase.replace(/\/$/, '')}/payments/webhooks/iyzico`;

// eslint-disable-next-line no-console
console.log('POST', url);
// eslint-disable-next-line no-console
console.log('X-IYZ-SIGNATURE-V3', signatureV3);

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-IYZ-SIGNATURE-V3': signatureV3,
  },
  body: JSON.stringify(body),
});

const text = await res.text();
// eslint-disable-next-line no-console
console.log('Status:', res.status);
// eslint-disable-next-line no-console
console.log(text);

if (!res.ok) process.exit(1);
