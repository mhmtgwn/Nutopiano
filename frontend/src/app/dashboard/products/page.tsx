'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { formatPrice } from '@/lib/format';
import { useAppSelector } from '@/store';

type ProductType = 'PHYSICAL' | 'SERVICE' | 'WEIGHT' | 'CUSTOM';

type CategoryTreeNode = {
  id: number;
  name: string;
  children?: CategoryTreeNode[];
};

interface ProductRow {
  id: number;
  categoryId?: number | null;
  name: string;
  type: ProductType;
  priceCents: number;
  stock?: number | null;
  isPublished?: boolean;
}

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface PaginatedProducts {
  data: ProductRow[];
  meta: PaginationMeta;
}

interface SellerApplicationResponse {
  slug: string;
}

const resolveApiErrorMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== 'object') return fallback;
  if (!('response' in error)) return fallback;
  const response = (error as { response?: unknown }).response;
  if (!response || typeof response !== 'object') return fallback;
  if (!('data' in response)) return fallback;
  const data = (response as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return fallback;
  if (!('message' in data)) return fallback;
  const message = (data as { message?: unknown }).message;
  if (Array.isArray(message)) return message.map(String).join(', ');
  if (typeof message === 'string') return message;
  return fallback;
};

const extractHttpStatus = (error: unknown) => {
  if (!error || typeof error !== 'object') return null;
  const maybeError = error as { response?: { status?: number } };
  const status = maybeError.response?.status;
  if (!Number.isFinite(status)) return null;
  return Math.trunc(status ?? 0);
};

const flattenCategories = (
  tree: CategoryTreeNode[],
  level = 0,
): Array<{ id: number; name: string; level: number }> => {
  const rows: Array<{ id: number; name: string; level: number }> = [];
  for (const node of tree) {
    rows.push({ id: node.id, name: node.name, level });
    if (node.children?.length) rows.push(...flattenCategories(node.children, level + 1));
  }
  return rows;
};

const formatType = (type: ProductType) => {
  if (type === 'PHYSICAL') return 'Fiziksel';
  if (type === 'SERVICE') return 'Hizmet';
  if (type === 'WEIGHT') return 'Kilo';
  return 'Ozel';
};

export default function SellerProductsPage() {
  const queryClient = useQueryClient();
  const user = useAppSelector((state) => state.user.user);
  const isSeller = user?.role === 'SELLER';

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [createForm, setCreateForm] = useState({
    name: '',
    categoryId: '',
    priceCents: '',
    stock: '',
  });

  const [rowDrafts, setRowDrafts] = useState<
    Record<number, { name: string; categoryId: string; priceCents: string; stock: string }>
  >({});

  const { data: categoriesTree = [], isLoading: isCategoriesLoading } = useQuery<CategoryTreeNode[]>({
    queryKey: ['seller-categories-tree'],
    queryFn: async () => {
      try {
        const res = await api.get<CategoryTreeNode[]>('/categories/tree');
        return res.data;
      } catch (error) {
        const status = extractHttpStatus(error);
        if (status === 401 || status === 403) {
          const fallback = await api.get<CategoryTreeNode[]>('/public/categories/tree');
          return fallback.data;
        }
        throw error;
      }
    },
  });

  const flatCategories = useMemo(() => flattenCategories(categoriesTree), [categoriesTree]);

  const categoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const category of flatCategories) map.set(category.id, category.name);
    return map;
  }, [flatCategories]);

  const { data: productsPayload, isLoading, isError, error } = useQuery<PaginatedProducts>({
    queryKey: ['seller-products', { page, pageSize }],
    queryFn: async () => {
      const res = await api.get<PaginatedProducts>('/products/manage', { params: { page, pageSize } });
      return res.data;
    },
  });

  const products = useMemo(() => productsPayload?.data ?? [], [productsPayload?.data]);
  const meta = productsPayload?.meta;

  const { data: sellerApplication, isError: sellerApplicationError } = useQuery<SellerApplicationResponse | null>({
    queryKey: ['seller-application-me'],
    queryFn: async () => {
      const res = await api.get<SellerApplicationResponse | null>('/sellers/applications/me');
      return res.data;
    },
    enabled: isSeller,
    retry: false,
  });

  const shareUrl = useMemo(() => {
    if (!sellerApplication?.slug) return null;
    const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nutopiano.com').replace(/\/$/, '');
    return `${base}/magaza/${sellerApplication.slug}`;
  }, [sellerApplication?.slug]);

  const lowStockCount = useMemo(
    () => products.filter((item) => typeof item.stock === 'number' && item.stock <= 5).length,
    [products],
  );

  const totalPages = meta?.totalPages ?? 1;

  const ensureRowDraft = (product: ProductRow) => {
    const existing = rowDrafts[product.id];
    if (existing) return existing;
    return {
      name: product.name,
      categoryId:
        product.categoryId === undefined || product.categoryId === null
          ? ''
          : String(product.categoryId),
      priceCents: String(product.priceCents ?? ''),
      stock:
        product.stock === undefined || product.stock === null ? '' : String(product.stock),
    };
  };

  const patchRowDraft = (product: ProductRow, patch: Partial<(typeof rowDrafts)[number]>) => {
    setRowDrafts((prev) => ({
      ...prev,
      [product.id]: {
        ...(prev[product.id] ?? {
          name: product.name,
          categoryId:
            product.categoryId === undefined || product.categoryId === null
              ? ''
              : String(product.categoryId),
          priceCents: String(product.priceCents ?? ''),
          stock:
            product.stock === undefined || product.stock === null
              ? ''
              : String(product.stock),
        }),
        ...patch,
      },
    }));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const name = createForm.name.trim();
      const categoryId = Number(createForm.categoryId);
      const priceCents = Number(createForm.priceCents);
      const stockRaw = createForm.stock.trim();
      const stock = stockRaw === '' ? undefined : Number(stockRaw);

      if (!name) throw new Error('Urun adi zorunludur.');
      if (!Number.isFinite(categoryId) || categoryId <= 0) {
        throw new Error('Kategori secimi zorunludur.');
      }
      if (!Number.isFinite(priceCents) || priceCents < 0) {
        throw new Error('Fiyat gecersiz.');
      }
      if (stock !== undefined && (!Number.isFinite(stock) || stock < 0)) {
        throw new Error('Stok 0 veya daha buyuk olmali.');
      }

      await api.post('/seller/products', {
        name,
        categoryId,
        type: 'PHYSICAL',
        price: String(Math.trunc(priceCents)),
        stock: stock === undefined ? undefined : Math.trunc(stock),
      });
    },
    onSuccess: async () => {
      toast.success('Urun olusturuldu.');
      setCreateForm({ name: '', categoryId: '', priceCents: '', stock: '' });
      await queryClient.invalidateQueries({ queryKey: ['seller-products'] });
    },
    onError: (err: unknown) => {
      toast.error(resolveApiErrorMessage(err, 'Urun olusturulamadi.'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (product: ProductRow) => {
      const draft = ensureRowDraft(product);
      const categoryId = Number(draft.categoryId);
      const priceCents = Number(draft.priceCents);
      const name = draft.name.trim();
      if (!name) throw new Error('Urun adi zorunludur.');
      if (!Number.isFinite(categoryId) || categoryId <= 0) {
        throw new Error('Kategori secimi zorunludur.');
      }
      if (!Number.isFinite(priceCents) || priceCents < 0) {
        throw new Error('Fiyat gecersiz.');
      }

      await api.patch(`/seller/products/${product.id}`, {
        name,
        categoryId,
        price: String(Math.trunc(priceCents)),
      });
    },
    onSuccess: async () => {
      toast.success('Urun guncellendi.');
      await queryClient.invalidateQueries({ queryKey: ['seller-products'] });
    },
    onError: (err: unknown) => {
      toast.error(resolveApiErrorMessage(err, 'Urun guncellenemedi.'));
    },
  });

  const stockMutation = useMutation({
    mutationFn: async (product: ProductRow) => {
      const draft = ensureRowDraft(product);
      const raw = draft.stock.trim();
      const stock = raw === '' ? null : Number(raw);
      if (stock !== null && (!Number.isFinite(stock) || stock < 0)) {
        throw new Error('Stok 0 veya daha buyuk olmali.');
      }
      await api.patch(`/seller/products/${product.id}/stock`, {
        stock: stock === null ? null : Math.trunc(stock),
      });
    },
    onSuccess: async () => {
      toast.success('Stok guncellendi.');
      await queryClient.invalidateQueries({ queryKey: ['seller-products'] });
    },
    onError: (err: unknown) => {
      toast.error(resolveApiErrorMessage(err, 'Stok guncellenemedi.'));
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (product: ProductRow) => {
      await api.patch(`/seller/products/${product.id}/publish`, {
        isPublished: !Boolean(product.isPublished),
      });
    },
    onSuccess: async () => {
      toast.success('Yayin durumu guncellendi.');
      await queryClient.invalidateQueries({ queryKey: ['seller-products'] });
    },
    onError: (err: unknown) => {
      toast.error(resolveApiErrorMessage(err, 'Yayin durumu guncellenemedi.'));
    },
  });

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Magaza linki kopyalandi.');
    } catch {
      toast.error('Link kopyalanamadi.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
          Satici
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-serif text-[var(--primary-800)]">Urunler</h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Urun olustur, guncelle, stok/yayin yonet ve magazanda paylas.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full border border-[var(--neutral-200)] bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)]">
              Toplam: {meta?.total ?? products.length}
            </div>
            <div className="rounded-full border border-[var(--neutral-200)] bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)]">
              Dusuk stok: {lowStockCount}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--neutral-500)]">
          Kendi Magazamda Paylas
        </p>
        {shareUrl ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <code className="rounded-[var(--radius-lg)] bg-[var(--neutral-100)] px-3 py-2 text-xs text-[var(--primary-800)]">
              {shareUrl}
            </code>
            <button
              type="button"
              onClick={copyShareUrl}
              className="inline-flex h-9 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-800)] px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white"
            >
              Linki kopyala
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--neutral-600)]">Magaza slug bilgisi yuklenemedi.</p>
        )}
        <p className="mt-3 text-xs text-[var(--neutral-600)]">
          Magazada gorunmek icin urun yayinda olmali ve stok degeri aktif olmalidir.
        </p>
        {!isSeller ? (
          <p className="mt-2 text-xs text-amber-700">
            Admin gorunumunde magaza linki ve yazma aksiyonlari pasiftir.
          </p>
        ) : null}
        {isSeller && sellerApplicationError ? (
          <p className="mt-2 text-xs text-red-600">/sellers/applications/me endpointi kontrol edilmeli.</p>
        ) : null}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          createMutation.mutate();
        }}
        className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--neutral-500)]">
          Yeni Urun Ekle
        </p>
        {!isSeller ? (
          <div className="mt-3 rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Bu ekran yalnizca SELLER rolu icin aciktir.
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            value={createForm.name}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Urun adi *"
            className="h-10 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] px-3 text-sm outline-none"
            required
          />
          <select
            value={createForm.categoryId}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, categoryId: e.target.value }))}
            className="h-10 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] px-3 text-sm outline-none"
            required
            disabled={isCategoriesLoading || flatCategories.length === 0}
          >
            <option value="">Kategori sec *</option>
            {flatCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {`${'-- '.repeat(category.level)}${category.name}`}
              </option>
            ))}
          </select>
          <input
            value={createForm.priceCents}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, priceCents: e.target.value }))}
            inputMode="numeric"
            placeholder="Fiyat (kurus) *"
            className="h-10 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] px-3 text-sm outline-none"
            required
          />
          <input
            value={createForm.stock}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, stock: e.target.value }))}
            inputMode="numeric"
            placeholder="Stok"
            className="h-10 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] px-3 text-sm outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={createMutation.isPending || !isSeller}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-800)] px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {createMutation.isPending ? 'Olusturuluyor...' : 'Urun olustur'}
        </button>
      </form>

      <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        {isLoading && <Spinner fullscreen label="Urunler yukleniyor..." />}
        {isError && !isLoading && (
          <div className="rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {resolveApiErrorMessage(error, 'Urunler yuklenemedi.')}
          </div>
        )}

        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--neutral-200)] text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                  <th className="py-3 pr-4">Urun</th>
                  <th className="py-3 pr-4">Kategori</th>
                  <th className="py-3 pr-4">Stok</th>
                  <th className="py-3 pr-4">Fiyat</th>
                  <th className="py-3 pr-4">Yayin</th>
                  <th className="py-3">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const draft = ensureRowDraft(product);
                  return (
                    <tr key={product.id} className="border-b border-[var(--neutral-100)]">
                      <td className="py-3 pr-4">
                        <input
                          value={draft.name}
                          onChange={(e) => patchRowDraft(product, { name: e.target.value })}
                          disabled={!isSeller}
                          className="h-9 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] px-3 text-sm"
                        />
                        <div className="mt-1 text-xs text-[var(--neutral-500)]">
                          #{product.id} • {formatType(product.type)}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <select
                          value={draft.categoryId}
                          onChange={(e) => patchRowDraft(product, { categoryId: e.target.value })}
                          disabled={!isSeller}
                          className="h-9 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] px-3 text-sm"
                        >
                          <option value="">Kategori sec</option>
                          {flatCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {`${'-- '.repeat(category.level)}${category.name}`}
                            </option>
                          ))}
                        </select>
                        {!draft.categoryId && product.categoryId ? (
                          <div className="mt-1 text-xs text-[var(--neutral-500)]">
                            {categoryNameById.get(product.categoryId) ?? `#${product.categoryId}`}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <input
                            value={draft.stock}
                            onChange={(e) => patchRowDraft(product, { stock: e.target.value })}
                            inputMode="numeric"
                            disabled={!isSeller}
                            className="h-9 w-20 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] px-3 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => stockMutation.mutate(product)}
                            disabled={!isSeller || stockMutation.isPending}
                            className="inline-flex h-9 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-200)] px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary-800)] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Kaydet
                          </button>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          value={draft.priceCents}
                          onChange={(e) => patchRowDraft(product, { priceCents: e.target.value })}
                          inputMode="numeric"
                          disabled={!isSeller}
                          className="h-9 w-28 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] px-3 text-sm"
                        />
                        <div className="mt-1 text-xs text-[var(--neutral-500)]">
                          {formatPrice(product.priceCents)}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <button
                          type="button"
                          onClick={() => publishMutation.mutate(product)}
                          disabled={!isSeller || publishMutation.isPending}
                          className={`inline-flex h-9 items-center justify-center rounded-[var(--radius-lg)] border px-3 text-[10px] font-semibold uppercase tracking-[0.15em] ${
                            product.isPublished
                              ? 'border-[#0F5132]/25 bg-[#E6FBF2] text-[#0F5132]'
                              : 'border-[#7A4B00]/25 bg-[#FFF7E6] text-[#7A4B00]'
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {product.isPublished ? 'Yayinda' : 'Taslak'}
                        </button>
                      </td>
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={() => updateMutation.mutate(product)}
                          disabled={!isSeller || updateMutation.isPending}
                          className="inline-flex h-9 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-800)] px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Guncelle
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-sm text-[var(--neutral-600)]">
                      Henuz urun yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-200)] px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Onceki
          </button>
          <div className="text-xs font-semibold text-[var(--neutral-600)]">
            Sayfa {page} / {totalPages}
          </div>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-200)] px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Sonraki
          </button>
        </div>
      </div>
    </div>
  );
}
