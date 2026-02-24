export type PosOrderQueuePayload = {
  customerId?: number;
  idempotencyKey?: string;
  paymentMode?: 'CASH' | 'CARD' | 'CREDIT' | 'SPLIT';
  items: Array<{
    productId: number;
    quantity: number;
    variantId?: number;
    expectedUnitPriceCents?: number;
    discountAmountCents?: number;
  }>;
  source: 'POS';
  notes?: string;
  couponCode?: string;
  cartDiscountAmountCents?: number;
};

export type PosOrderQueueItem = {
  id: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  payload: PosOrderQueuePayload;
};

export type PosProductCacheItem = {
  key: string;
  productId: number;
  variantId: number | null;
  name: string;
  sku?: string | null;
  priceCents: number;
  stock?: number | null;
  updatedAt: string;
};

export type PosCustomerCacheItem = {
  key: string;
  customerId: number;
  name: string;
  phone: string;
  balance: number;
  updatedAt: string;
};

export type PosPrintedReceiptLog = {
  saleId: string;
  printedAt: string;
};

const DB_NAME = 'nutopiano-offline';
const DB_VERSION = 2;
const ORDER_QUEUE_STORE = 'pos_order_queue';
const PRODUCT_CACHE_STORE = 'pos_product_cache';
const CUSTOMER_CACHE_STORE = 'pos_customer_cache';
const PRINTED_RECEIPT_STORE = 'pos_printed_receipt_log';
const MAX_RETRY_ATTEMPTS = 8;
const RETRY_BASE_DELAY_MS = 15_000;
const RETRY_MAX_DELAY_MS = 5 * 60_000;

const isIndexedDbAvailable = () =>
  typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

const getRequestResult = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });

const openDb = async () => {
  if (!isIndexedDbAvailable()) {
    throw new Error('IndexedDB is not available');
  }

  const request = window.indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(ORDER_QUEUE_STORE)) {
      const store = db.createObjectStore(ORDER_QUEUE_STORE, { keyPath: 'id' });
      store.createIndex('createdAt', 'createdAt', { unique: false });
      store.createIndex('nextRetryAt', 'nextRetryAt', { unique: false });
    } else {
      const store = request.transaction?.objectStore(ORDER_QUEUE_STORE);
      if (store && !store.indexNames.contains('nextRetryAt')) {
        store.createIndex('nextRetryAt', 'nextRetryAt', { unique: false });
      }
    }

    if (!db.objectStoreNames.contains(PRODUCT_CACHE_STORE)) {
      const store = db.createObjectStore(PRODUCT_CACHE_STORE, { keyPath: 'key' });
      store.createIndex('updatedAt', 'updatedAt', { unique: false });
      store.createIndex('sku', 'sku', { unique: false });
    }

    if (!db.objectStoreNames.contains(CUSTOMER_CACHE_STORE)) {
      const store = db.createObjectStore(CUSTOMER_CACHE_STORE, { keyPath: 'key' });
      store.createIndex('updatedAt', 'updatedAt', { unique: false });
      store.createIndex('phone', 'phone', { unique: false });
    }

    if (!db.objectStoreNames.contains(PRINTED_RECEIPT_STORE)) {
      const store = db.createObjectStore(PRINTED_RECEIPT_STORE, { keyPath: 'saleId' });
      store.createIndex('printedAt', 'printedAt', { unique: false });
    }
  };

  return getRequestResult(request);
};

const runTx = async <T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore, tx: IDBTransaction) => Promise<T> | T,
) => {
  const db = await openDb();
  try {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = await fn(store, tx);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    });
    return result;
  } finally {
    db.close();
  }
};

const computeNextRetryAt = (attempts: number) => {
  const boundedAttempts = Math.max(1, Math.min(attempts, MAX_RETRY_ATTEMPTS));
  const delay = Math.min(
    RETRY_MAX_DELAY_MS,
    RETRY_BASE_DELAY_MS * Math.pow(2, Math.max(boundedAttempts - 1, 0)),
  );
  return new Date(Date.now() + delay).toISOString();
};

export const isPosOrderRetryable = (item: PosOrderQueueItem) =>
  Math.max(0, Math.trunc(item.attempts ?? 0)) < MAX_RETRY_ATTEMPTS;

export const enqueuePosOrder = async (payload: PosOrderQueuePayload) => {
  const item: PosOrderQueueItem = {
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    attempts: 0,
    nextRetryAt: new Date().toISOString(),
    payload,
  };
  await runTx(ORDER_QUEUE_STORE, 'readwrite', (store) => {
    store.put(item);
  });
  return item;
};

export const listQueuedPosOrders = async () => {
  const items = await runTx(ORDER_QUEUE_STORE, 'readonly', async (store) => {
    const request = store.getAll();
    return getRequestResult(request);
  });
  return (items as PosOrderQueueItem[]).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
};

export const listReadyQueuedPosOrders = async (nowIso = new Date().toISOString()) => {
  const all = await listQueuedPosOrders();
  return all.filter((item) => {
    if (!isPosOrderRetryable(item)) return false;
    const nextRetryAt = item.nextRetryAt ?? item.createdAt;
    return nextRetryAt <= nowIso;
  });
};

export const removeQueuedPosOrder = async (id: string) => {
  await runTx(ORDER_QUEUE_STORE, 'readwrite', (store) => {
    store.delete(id);
  });
};

export const markQueuedPosOrderAttempt = async (id: string, error?: string) => {
  await runTx(ORDER_QUEUE_STORE, 'readwrite', async (store) => {
    const item = (await getRequestResult(store.get(id))) as PosOrderQueueItem | undefined;
    if (!item) return;

    const attempts = (item.attempts ?? 0) + 1;
    const nextRetryAt = computeNextRetryAt(attempts);
    store.put({
      ...item,
      attempts,
      lastError: error,
      lastAttemptAt: new Date().toISOString(),
      nextRetryAt,
    } satisfies PosOrderQueueItem);
  });
};

const normalizeProductCacheKey = (productId: number, variantId?: number | null) =>
  `${Math.trunc(productId)}:${typeof variantId === 'number' && variantId > 0 ? Math.trunc(variantId) : 0}`;

export const upsertCachedPosProducts = async (
  rows: Array<{
    productId: number;
    variantId?: number | null;
    name: string;
    sku?: string | null;
    priceCents: number;
    stock?: number | null;
  }>,
) => {
  const nowIso = new Date().toISOString();
  await runTx(PRODUCT_CACHE_STORE, 'readwrite', async (store) => {
    for (const row of rows) {
      const productId = Math.trunc(Number(row.productId));
      if (!Number.isFinite(productId) || productId <= 0) continue;
      const priceCents = Math.trunc(Number(row.priceCents));
      if (!Number.isFinite(priceCents) || priceCents < 0) continue;

      const variantId =
        typeof row.variantId === 'number' && Number.isFinite(row.variantId) && row.variantId > 0
          ? Math.trunc(row.variantId)
          : null;
      const item: PosProductCacheItem = {
        key: normalizeProductCacheKey(productId, variantId),
        productId,
        variantId,
        name: String(row.name ?? '').trim() || `Urun #${productId}`,
        sku: row.sku ? String(row.sku).trim() : null,
        priceCents,
        stock:
          typeof row.stock === 'number' && Number.isFinite(row.stock)
            ? Math.trunc(row.stock)
            : null,
        updatedAt: nowIso,
      };
      store.put(item);
    }
  });
};

export const listCachedPosProducts = async (limit = 100) => {
  const normalizedLimit = Math.max(1, Math.min(Math.trunc(limit), 500));
  const items = await runTx(PRODUCT_CACHE_STORE, 'readonly', async (store) => {
    const request = store.getAll();
    return getRequestResult(request);
  });

  return (items as PosProductCacheItem[])
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, normalizedLimit);
};

export const findCachedPosProductByBarcode = async (code: string) => {
  const normalized = String(code ?? '').trim().toLowerCase();
  if (!normalized) return null;
  const items = await listCachedPosProducts(200);
  return (
    items.find((row) => String(row.sku ?? '').trim().toLowerCase() === normalized) ?? null
  );
};

const normalizeCustomerCacheKey = (customerId: number) => `${Math.trunc(customerId)}`;

export const upsertCachedPosCustomers = async (
  rows: Array<{
    customerId: number;
    name: string;
    phone: string;
    balance: number;
  }>,
) => {
  const nowIso = new Date().toISOString();
  await runTx(CUSTOMER_CACHE_STORE, 'readwrite', async (store) => {
    for (const row of rows) {
      const customerId = Math.trunc(Number(row.customerId));
      if (!Number.isFinite(customerId) || customerId <= 0) continue;
      const item: PosCustomerCacheItem = {
        key: normalizeCustomerCacheKey(customerId),
        customerId,
        name: String(row.name ?? '').trim() || `Musteri #${customerId}`,
        phone: String(row.phone ?? '').trim(),
        balance: Number.isFinite(row.balance) ? Number(row.balance) : 0,
        updatedAt: nowIso,
      };
      store.put(item);
    }
  });
};

export const listCachedPosCustomers = async (limit = 20) => {
  const normalizedLimit = Math.max(1, Math.min(Math.trunc(limit), 200));
  const items = await runTx(CUSTOMER_CACHE_STORE, 'readonly', async (store) => {
    const request = store.getAll();
    return getRequestResult(request);
  });

  return (items as PosCustomerCacheItem[])
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, normalizedLimit);
};

export const findCachedPosCustomers = async (query: string, limit = 10) => {
  const normalizedQuery = String(query ?? '').trim().toLowerCase();
  const rows = await listCachedPosCustomers(200);
  if (!normalizedQuery) {
    return rows.slice(0, Math.max(1, Math.min(limit, 50)));
  }
  return rows
    .filter((row) => {
      const name = row.name.toLowerCase();
      const phone = row.phone.toLowerCase();
      const id = String(row.customerId);
      return (
        name.includes(normalizedQuery) ||
        phone.includes(normalizedQuery) ||
        id.includes(normalizedQuery)
      );
    })
    .slice(0, Math.max(1, Math.min(limit, 50)));
};

export const hasReceiptBeenPrinted = async (saleId: string) => {
  const normalizedSaleId = String(saleId ?? '').trim();
  if (!normalizedSaleId) return false;
  const row = await runTx(PRINTED_RECEIPT_STORE, 'readonly', async (store) => {
    const request = store.get(normalizedSaleId);
    return getRequestResult(request);
  });
  return Boolean(row);
};

export const markReceiptPrinted = async (saleId: string) => {
  const normalizedSaleId = String(saleId ?? '').trim();
  if (!normalizedSaleId) return;

  await runTx(PRINTED_RECEIPT_STORE, 'readwrite', (store) => {
    const row: PosPrintedReceiptLog = {
      saleId: normalizedSaleId,
      printedAt: new Date().toISOString(),
    };
    store.put(row);
  });
};

export const purgeOldReceiptPrintLogs = async (olderThanDays = 7) => {
  const cutoff = Date.now() - Math.max(1, Math.trunc(olderThanDays)) * 24 * 60 * 60 * 1000;
  await runTx(PRINTED_RECEIPT_STORE, 'readwrite', async (store) => {
    const rows = (await getRequestResult(store.getAll())) as PosPrintedReceiptLog[];
    for (const row of rows) {
      const printedAt = new Date(row.printedAt).getTime();
      if (!Number.isFinite(printedAt) || printedAt < cutoff) {
        store.delete(row.saleId);
      }
    }
  });
};
