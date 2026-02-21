import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const jwt = require('jsonwebtoken');

const apiBase = process.env.API_BASE_URL ?? 'http://localhost:3001/api/v1';
const jwtSecret = process.env.JWT_SECRET ?? 'dev_jwt_secret_change_me';

const businessId = Number(process.env.TEST_BUSINESS_ID ?? 1);
const userId = Number(process.env.TEST_USER_ID ?? 1);
const role = process.env.TEST_ROLE ?? 'ADMIN';
const status = (process.env.STATUS ?? 'RECEIVED').trim().toUpperCase();

const token = jwt.sign(
  {
    businessId,
    userId,
    role,
    phone: '0000000000',
  },
  jwtSecret,
  { expiresIn: '15m' },
);

const url = `${apiBase.replace(/\/$/, '')}/payments/admin/webhook-events?provider=IYZICO&status=${encodeURIComponent(status)}`;
// eslint-disable-next-line no-console
console.log('GET', url);

const res = await fetch(url, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const text = await res.text();
// eslint-disable-next-line no-console
console.log('Status:', res.status);
// eslint-disable-next-line no-console
console.log(text);

if (!res.ok) process.exit(1);
