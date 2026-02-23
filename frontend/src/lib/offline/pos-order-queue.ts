export type PosOrderQueuePayload = {
  customerId?: number;
  idempotencyKey?: string;
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
  payload: PosOrderQueuePayload;
};

const DB_NAME = 'nutopiano-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pos_order_queue';

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
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      store.createIndex('createdAt', 'createdAt', { unique: false });
    }
  };

  return getRequestResult(request);
};

export const enqueuePosOrder = async (payload: PosOrderQueuePayload) => {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const item: PosOrderQueueItem = {
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    attempts: 0,
    payload,
  };
  store.put(item);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
  });
  db.close();
  return item;
};

export const listQueuedPosOrders = async () => {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();
  const items = await getRequestResult(request);
  db.close();
  return (items as PosOrderQueueItem[]).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
};

export const removeQueuedPosOrder = async (id: string) => {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
  });
  db.close();
};

export const markQueuedPosOrderAttempt = async (id: string, error?: string) => {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const item = (await getRequestResult(store.get(id))) as PosOrderQueueItem | undefined;
  if (item) {
    store.put({
      ...item,
      attempts: (item.attempts ?? 0) + 1,
      lastError: error,
    } satisfies PosOrderQueueItem);
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
  });
  db.close();
};
