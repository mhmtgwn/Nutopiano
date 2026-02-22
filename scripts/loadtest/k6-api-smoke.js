import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3001/api/v1';
const PHONE = __ENV.K6_PHONE || '';
const PASSWORD = __ENV.K6_PASSWORD || '';
const SEARCH_QUERY = __ENV.K6_SEARCH_QUERY || 'piano';
const SEARCH_PAGE_SIZE = Number(__ENV.K6_SEARCH_PAGE_SIZE || 20);
const ORDER_CUSTOMER_ID = Number(__ENV.K6_ORDER_CUSTOMER_ID || 0);
const ORDER_PRODUCT_ID = Number(__ENV.K6_ORDER_PRODUCT_ID || 0);
const ORDER_QUANTITY = Number(__ENV.K6_ORDER_QUANTITY || 1);
const ORDER_PRICE_CENTS = Number(__ENV.K6_ORDER_PRICE_CENTS || 0);
const STOCK_PRODUCT_ID = Number(__ENV.K6_STOCK_PRODUCT_ID || 0);
const STOCK_TARGET = Number(__ENV.K6_STOCK_TARGET || -1);

export const options = {
  vus: Number(__ENV.K6_VUS || 10),
  duration: __ENV.K6_DURATION || '1m',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500'],
  },
};

function getCsrfTokenFromJar(jar) {
  const cookies = jar.cookiesForURL(BASE_URL);
  const values = cookies.__csrf;
  if (!values || values.length === 0) return '';
  return values[0];
}

function warmupAndGetCsrf(jar) {
  const warmupRes = http.get(`${BASE_URL}/health`);
  check(warmupRes, {
    'health status is 200': (r) => r.status === 200,
  });

  return getCsrfTokenFromJar(jar);
}

function login(csrfToken) {
  if (!PHONE || !PASSWORD) return null;
  if (!csrfToken) return null;

  const payload = JSON.stringify({
    phone: PHONE,
    password: PASSWORD,
  });

  const headers = {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  };

  const loginRes = http.post(`${BASE_URL}/auth/login`, payload, { headers });
  check(loginRes, {
    'login status is 201': (r) => r.status === 201,
  });

  if (loginRes.status !== 201) return null;

  const profileRes = http.get(`${BASE_URL}/auth/profile`);
  check(profileRes, {
    'profile status is 200': (r) => r.status === 200,
  });

  return profileRes.status === 200;
}

function maybeCreateOrder(csrfToken) {
  const canCreateOrder =
    ORDER_CUSTOMER_ID > 0 &&
    ORDER_PRODUCT_ID > 0 &&
    ORDER_QUANTITY > 0 &&
    ORDER_PRICE_CENTS >= 0;

  if (!canCreateOrder || !csrfToken) return;

  const payload = JSON.stringify({
    customerId: ORDER_CUSTOMER_ID,
    items: [
      {
        productId: ORDER_PRODUCT_ID,
        quantity: ORDER_QUANTITY,
        expectedUnitPriceCents: ORDER_PRICE_CENTS,
      },
    ],
  });

  const headers = {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  };

  const orderRes = http.post(`${BASE_URL}/orders`, payload, { headers });
  check(orderRes, {
    'order create status is 201': (r) => r.status === 201,
  });
}

function runMarketplaceSearch() {
  const params = new URLSearchParams();
  if (SEARCH_QUERY.trim()) params.set('q', SEARCH_QUERY.trim());
  params.set('page', '1');
  params.set('pageSize', String(Math.max(1, SEARCH_PAGE_SIZE)));

  const searchRes = http.get(`${BASE_URL}/marketplace/search?${params.toString()}`);
  check(searchRes, {
    'marketplace search status is 200': (r) => r.status === 200,
  });
}

function maybeUpdateStock(csrfToken) {
  const canUpdateStock = STOCK_PRODUCT_ID > 0 && STOCK_TARGET >= 0 && csrfToken;
  if (!canUpdateStock) return;

  const payload = JSON.stringify({
    stock: STOCK_TARGET,
  });

  const headers = {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  };

  const updateRes = http.patch(
    `${BASE_URL}/products/${STOCK_PRODUCT_ID}`,
    payload,
    { headers },
  );
  check(updateRes, {
    'stock update status is 200': (r) => r.status === 200,
  });
}

export default function () {
  const jar = http.cookieJar();
  const csrfToken = warmupAndGetCsrf(jar);

  const loggedIn = login(csrfToken);
  runMarketplaceSearch();
  maybeCreateOrder(csrfToken);
  if (loggedIn) {
    maybeUpdateStock(csrfToken);
  }

  sleep(1);
}
