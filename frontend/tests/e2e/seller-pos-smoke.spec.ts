import { expect, type Page, test } from '@playwright/test';

const sellerPhone = process.env.PLAYWRIGHT_SELLER_PHONE?.trim() ?? '';
const sellerPassword = process.env.PLAYWRIGHT_SELLER_PASSWORD?.trim() ?? '';
const sellerSlugFromEnv = process.env.PLAYWRIGHT_SELLER_SLUG?.trim() ?? '';
const hasSellerCreds = Boolean(sellerPhone && sellerPassword);

const loginAsSeller = async (page: Page) => {
  await page.goto('/login');
  await page.getByLabel('Telefon Numarası').fill(sellerPhone);
  await page.getByLabel('Şifre').fill(sellerPassword);
  await page.getByRole('button', { name: /Giriş Yap|Giris Yap/i }).click();
  await page.waitForLoadState('networkidle');
};

const getQueueLength = async (page: Page) =>
  page.evaluate(async () => {
    const openDb = () =>
      new Promise<IDBDatabase>((resolve, reject) => {
        const request = window.indexedDB.open('nutopiano-offline', 3);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('pos_order_queue')) {
            db.createObjectStore('pos_order_queue', { keyPath: 'id' });
          }
        };
        request.onsuccess = () => resolve(request.result);
      });

    const db = await openDb();
    try {
      const rows = await new Promise<unknown[]>((resolve, reject) => {
        const tx = db.transaction('pos_order_queue', 'readonly');
        const store = tx.objectStore('pos_order_queue');
        const request = store.getAll();
        request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed'));
        request.onsuccess = () => resolve((request.result as unknown[]) ?? []);
      });
      return rows.length;
    } finally {
      db.close();
    }
  });

test.describe('Seller + POS smoke', () => {
  test.skip(!hasSellerCreds, 'PLAYWRIGHT_SELLER_PHONE ve PLAYWRIGHT_SELLER_PASSWORD gerekli.');

  test('seller creates + publishes product and sees it in /magaza/{slug}', async ({ page }) => {
    await loginAsSeller(page);
    await page.goto('/dashboard/products');
    await page.waitForLoadState('networkidle');

    const categorySelect = page.locator('form select').first();
    await expect(categorySelect).toBeVisible();
    const optionCount = await categorySelect.locator('option').count();
    test.skip(optionCount <= 1, 'Smoke icin en az 1 kategori gerekli.');

    const productName = `PW Smoke ${Date.now()}`;
    await page.getByPlaceholder('Urun adi *').fill(productName);
    await categorySelect.selectOption({ index: 1 });
    await page.getByPlaceholder('Fiyat (kurus) *').fill('5500');
    await page.getByPlaceholder('Stok').fill('5');
    await page.getByRole('button', { name: /Urun olustur/i }).click();

    const productInput = page.locator(`tbody input[value="${productName}"]`).first();
    await expect(productInput).toBeVisible({ timeout: 20_000 });
    const productRow = productInput.locator('xpath=ancestor::tr');

    const publishButton = productRow.getByRole('button', { name: /Taslak|Yayinda/i });
    if ((await publishButton.textContent())?.toLowerCase().includes('taslak')) {
      await publishButton.click();
    }
    await expect(publishButton).toHaveText(/Yayinda/i, { timeout: 15_000 });

    let sellerSlug = sellerSlugFromEnv;
    if (!sellerSlug) {
      const codeText = (await page.locator('code').first().textContent()) ?? '';
      const match = codeText.match(/\/magaza\/([^/?\s]+)/i);
      sellerSlug = match?.[1] ?? '';
    }
    test.skip(!sellerSlug, 'Seller slug bulunamadi (PLAYWRIGHT_SELLER_SLUG verilebilir).');

    await page.goto(`/magaza/${sellerSlug}`);
    await expect(page.getByText(productName)).toBeVisible({ timeout: 20_000 });
  });

  test('pos queued sale syncs on force action', async ({ page }) => {
    await loginAsSeller(page);
    await page.goto('/pos');
    await page.waitForLoadState('networkidle');

    const queueId = `pw-queue-${Date.now()}`;
    await page.evaluate(async (id) => {
      const openDb = () =>
        new Promise<IDBDatabase>((resolve, reject) => {
          const request = window.indexedDB.open('nutopiano-offline', 3);
          request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
          request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('pos_order_queue')) {
              db.createObjectStore('pos_order_queue', { keyPath: 'id' });
            }
          };
          request.onsuccess = () => resolve(request.result);
        });

      const db = await openDb();
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction('pos_order_queue', 'readwrite');
          const store = tx.objectStore('pos_order_queue');
          store.put({
            id,
            createdAt: new Date().toISOString(),
            attempts: 0,
            payload: {
              source: 'POS',
              idempotencyKey: id,
              items: [{ productId: 1, quantity: 1, expectedUnitPriceCents: 1000 }],
            },
          });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
        });
      } finally {
        db.close();
      }
    }, queueId);

    await page.reload();
    await expect
      .poll(async () => getQueueLength(page), { timeout: 10_000 })
      .toBeGreaterThan(0);

    await page.route('**/orders', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { id: 999 } }),
      });
    });

    const syncButton = page.getByRole('button', { name: /Kuyrugu zorla sync et/i });
    await expect(syncButton).toBeVisible();
    await syncButton.click();

    await expect.poll(async () => getQueueLength(page), { timeout: 15_000 }).toBe(0);
  });
});
