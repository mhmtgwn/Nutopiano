'use client';

import { FormEvent, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Archive, Pencil, Save, X } from 'lucide-react';

import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { formatPrice } from '@/utils/helpers';

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
  if (Array.isArray(message)) {
    return message.map(String).join(', ');
  }
  if (typeof message === 'string') return message;
  return fallback;
};

type ProductType = 'PHYSICAL' | 'SERVICE' | 'WEIGHT' | 'CUSTOM';

interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
  orderIndex: number;
}

interface ProductRow {
  id: number;
  categoryId?: number | null;
  name: string;
  subtitle?: string | null;
  sku?: string | null;
  type: ProductType;
  priceCents: number;
  description?: string | null;
  features?: string[];
  imageUrl?: string | null;
  stock?: number | null;
  tags?: string[];
  isActive: boolean;
  updatedAt?: string;
}

const formatType = (type: ProductType) => {
  switch (type) {
    case 'PHYSICAL':
      return 'Fiziksel';
    case 'SERVICE':
      return 'Hizmet';
    case 'WEIGHT':
      return 'Kilo';
    case 'CUSTOM':
      return 'Özel';
    default:
      return type;
  }
};

export default function AdminProductsPage() {
  const queryClient = useQueryClient();

  const [createForm, setCreateForm] = useState({
    name: '',
    subtitle: '',
    sku: '',
    categoryId: '',
    type: 'PHYSICAL' as ProductType,
    priceCents: '',
    stock: '',
    imageUrl: '',
    description: '',
    features: '',
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    subtitle: '',
    sku: '',
    categoryId: '',
    type: 'PHYSICAL' as ProductType,
    priceCents: '',
    stock: '',
    imageUrl: '',
    description: '',
    features: '',
  });

  const parseFeatures = (value: string) =>
    value
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<{ url: string }>(
        '/uploads/product-image',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );
      return res.data;
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, 'Görsel yüklenemedi.'));
    },
  });

  const {
    data: categories,
    isLoading: categoriesLoading,
    isError: categoriesError,
  } = useQuery<CategoryRow[]>({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const res = await api.get<CategoryRow[]>('/categories');
      return res.data;
    },
  });

  const categoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    (categories ?? []).forEach((category) => {
      map.set(category.id, category.name);
    });
    return map;
  }, [categories]);

  const {
    data: products,
    isLoading,
    isError,
  } = useQuery<ProductRow[]>({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const res = await api.get<ProductRow[]>('/products');
      return res.data;
    },
  });

  const lowStockCount = useMemo(() => {
    if (!products) return 0;
    return products.filter((p) => typeof p.stock === 'number' && p.stock <= 5).length;
  }, [products]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const priceCents = Number(createForm.priceCents);
      const stock = createForm.stock ? Number(createForm.stock) : undefined;
      const parsedCategoryId = createForm.categoryId ? Number(createForm.categoryId) : undefined;
      if (!createForm.name.trim()) {
        throw new Error('Ürün adı zorunludur.');
      }
      if (!priceCents || Number.isNaN(priceCents) || priceCents < 0) {
        throw new Error('Fiyat (kuruş) geçerli olmalıdır.');
      }
      if (
        parsedCategoryId !== undefined &&
        (Number.isNaN(parsedCategoryId) || parsedCategoryId < 1)
      ) {
        throw new Error('Kategori seçimi geçersiz.');
      }

      await api.post('/products', {
        name: createForm.name.trim(),
        subtitle: createForm.subtitle.trim() || undefined,
        sku: createForm.sku.trim() || undefined,
        categoryId: parsedCategoryId ?? null,
        type: createForm.type,
        price: String(priceCents),
        description: createForm.description.trim() || undefined,
        features: parseFeatures(createForm.features),
        stock: typeof stock === 'number' && !Number.isNaN(stock) ? stock : undefined,
        imageUrl: createForm.imageUrl.trim() || undefined,
      });
    },
    onSuccess: async () => {
      toast.success('Ürün oluşturuldu.');
      setCreateForm({
        name: '',
        subtitle: '',
        sku: '',
        categoryId: '',
        type: 'PHYSICAL',
        priceCents: '',
        stock: '',
        imageUrl: '',
        description: '',
        features: '',
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, 'Ürün oluşturulamadı.'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (productId: number) => {
      const priceCents = editForm.priceCents ? Number(editForm.priceCents) : undefined;
      const stock = editForm.stock ? Number(editForm.stock) : undefined;
      const parsedCategoryId = editForm.categoryId ? Number(editForm.categoryId) : undefined;

      if (
        parsedCategoryId !== undefined &&
        (Number.isNaN(parsedCategoryId) || parsedCategoryId < 1)
      ) {
        throw new Error('Kategori seçimi geçersiz.');
      }

      await api.patch(`/products/${productId}`, {
        name: editForm.name.trim() || undefined,
        subtitle: editForm.subtitle.trim() || undefined,
        sku: editForm.sku.trim() || undefined,
        categoryId: parsedCategoryId ?? null,
        type: editForm.type,
        price:
          typeof priceCents === 'number' && !Number.isNaN(priceCents)
            ? String(priceCents)
            : undefined,
        description: editForm.description.trim() || undefined,
        features: parseFeatures(editForm.features),
        stock:
          typeof stock === 'number' && !Number.isNaN(stock) ? stock : undefined,
        imageUrl: editForm.imageUrl.trim() || undefined,
      });
    },
    onSuccess: async () => {
      toast.success('Ürün güncellendi.');
      setEditingId(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, 'Ürün güncellenemedi.'));
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (productId: number) => {
      await api.delete(`/products/${productId}`);
    },
    onSuccess: async () => {
      toast.success('Ürün arşivlendi.');
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, 'Ürün arşivlenemedi.'));
    },
  });

  const beginEdit = (product: ProductRow) => {
    setEditingId(product.id);
    setEditForm({
      name: product.name ?? '',
      subtitle: product.subtitle ?? '',
      sku: product.sku ?? '',
      categoryId:
        product.categoryId === null || product.categoryId === undefined
          ? ''
          : String(product.categoryId),
      type: product.type,
      priceCents: String(product.priceCents ?? ''),
      stock: product.stock === null || product.stock === undefined ? '' : String(product.stock),
      imageUrl: product.imageUrl ?? '',
      description: product.description ?? '',
      features: (product.features ?? []).join('\n'),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      name: '',
      subtitle: '',
      sku: '',
      categoryId: '',
      type: 'PHYSICAL',
      priceCents: '',
      stock: '',
      imageUrl: '',
      description: '',
      features: '',
    });
  };

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-[#1A3C34]/10 bg-white/90 px-6 py-6 shadow-[0_30px_90px_rgba(26,60,52,0.12)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
              Katalog
            </p>
            <h1 className="text-3xl font-serif text-[#1A3C34] md:text-4xl">
              Ürün yönetimi
            </h1>
            <p className="text-sm text-[#5C5C5C]">
              Ürün ekleyin, fiyat/stok güncelleyin ve pasife alın.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[#1A3C34]/10 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#1A3C34]/70">
            <AlertTriangle className="h-4 w-4" />
            Düşük stok: {lowStockCount}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <form
          onSubmit={handleCreate}
          className="space-y-4 rounded-[28px] border border-[#E0D7C6] bg-white/90 px-6 py-6 shadow-[0_20px_60px_rgba(26,60,52,0.08)]"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
              Yeni ürün
            </p>
            <h2 className="mt-2 text-2xl font-serif text-[#1A3C34]">
              Ürün oluştur
            </h2>
            <p className="mt-2 text-sm text-[#5C5C5C]">
              Fiyat alanı kuruş (örn: 12990 = ₺129,90).
            </p>
          </div>

          <div className="grid gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                Ürün adı
              </label>
              <input
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="h-11 w-full rounded-2xl border border-[#E5E5E0] bg-white px-3 text-sm text-[#1A3C34] shadow-sm outline-none focus-visible:border-[#1A3C34] focus-visible:ring-2 focus-visible:ring-[#C5A059]/20"
                placeholder="Örn: Premium Ürün"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                Alt başlık
              </label>
              <input
                value={createForm.subtitle}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, subtitle: e.target.value }))
                }
                className="h-11 w-full rounded-2xl border border-[#E5E5E0] bg-white px-3 text-sm text-[#1A3C34] shadow-sm outline-none focus-visible:border-[#1A3C34] focus-visible:ring-2 focus-visible:ring-[#C5A059]/20"
                placeholder="Örn: Özel müşteri taleplerine göre kişiselleştirilen ürün"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                  SKU
                </label>
                <input
                  value={createForm.sku}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, sku: e.target.value }))
                  }
                  className="h-11 w-full rounded-2xl border border-[#E5E5E0] bg-white px-3 text-sm text-[#1A3C34] shadow-sm outline-none focus-visible:border-[#1A3C34] focus-visible:ring-2 focus-visible:ring-[#C5A059]/20"
                  placeholder="SKU-001"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                  Tür
                </label>
                <select
                  value={createForm.type}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      type: e.target.value as ProductType,
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-[#E5E5E0] bg-white px-3 text-sm text-[#1A3C34] shadow-sm outline-none focus-visible:border-[#1A3C34] focus-visible:ring-2 focus-visible:ring-[#C5A059]/20"
                >
                  <option value="PHYSICAL">Fiziksel</option>
                  <option value="SERVICE">Hizmet</option>
                  <option value="WEIGHT">Kilo</option>
                  <option value="CUSTOM">Özel</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                Açıklama
              </label>
              <textarea
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, description: e.target.value }))
                }
                className="min-h-[110px] w-full resize-y rounded-2xl border border-[#E5E5E0] bg-white px-3 py-3 text-sm text-[#1A3C34] shadow-sm outline-none focus-visible:border-[#1A3C34] focus-visible:ring-2 focus-visible:ring-[#C5A059]/20"
                placeholder="Ürün açıklaması..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                Özellikler
              </label>
              <textarea
                value={createForm.features}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, features: e.target.value }))
                }
                className="min-h-[110px] w-full resize-y rounded-2xl border border-[#E5E5E0] bg-white px-3 py-3 text-sm text-[#1A3C34] shadow-sm outline-none focus-visible:border-[#1A3C34] focus-visible:ring-2 focus-visible:ring-[#C5A059]/20"
                placeholder={'Her satıra 1 özellik yaz.\nÖrn: El yapımı\nÖrn: 2 yıl garanti'}
              />
              <p className="text-[11px] text-[#8A8A8A] md:text-xs">
                Her satır bir özellik olarak kaydedilir.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                Kategori
              </label>
              <select
                value={createForm.categoryId}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    categoryId: e.target.value,
                  }))
                }
                className="h-11 w-full rounded-2xl border border-[#E5E5E0] bg-white px-3 text-sm text-[#1A3C34] shadow-sm outline-none focus-visible:border-[#1A3C34] focus-visible:ring-2 focus-visible:ring-[#C5A059]/20"
                disabled={categoriesLoading || categoriesError}
              >
                <option value="">Kategori seç</option>
                {(categories ?? []).map((category) => (
                  <option key={category.id} value={String(category.id)}>
                    {category.name}
                  </option>
                ))}
              </select>
              {categoriesLoading && (
                <p className="text-[11px] text-[#8A8A8A] md:text-xs">
                  Kategoriler yükleniyor...
                </p>
              )}
              {!categoriesLoading && categoriesError && (
                <p className="text-[11px] text-red-600 md:text-xs">
                  Kategoriler yüklenemedi.
                </p>
              )}
              {!categoriesLoading &&
                !categoriesError &&
                categories &&
                categories.length === 0 && (
                  <p className="text-[11px] text-[#8A8A8A] md:text-xs">
                    Henüz kategori yok. Önce kategori oluştur.
                  </p>
                )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                  Fiyat (kuruş)
                </label>
                <input
                  value={createForm.priceCents}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      priceCents: e.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-[#E5E5E0] bg-white px-3 text-sm text-[#1A3C34] shadow-sm outline-none focus-visible:border-[#1A3C34] focus-visible:ring-2 focus-visible:ring-[#C5A059]/20"
                  placeholder="12990"
                  inputMode="numeric"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                  Stok
                </label>
                <input
                  value={createForm.stock}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, stock: e.target.value }))
                  }
                  className="h-11 w-full rounded-2xl border border-[#E5E5E0] bg-white px-3 text-sm text-[#1A3C34] shadow-sm outline-none focus-visible:border-[#1A3C34] focus-visible:ring-2 focus-visible:ring-[#C5A059]/20"
                  placeholder="10"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                Ürün görseli
              </label>
              <div className="flex flex-col gap-2 rounded-2xl border border-[#E5E5E0] bg-white px-3 py-3">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const result = await uploadMutation.mutateAsync(file);
                    setCreateForm((prev) => ({ ...prev, imageUrl: result.url }));
                    toast.success('Görsel yüklendi.');
                  }}
                  disabled={uploadMutation.isPending}
                  className="text-xs"
                />
                <input
                  value={createForm.imageUrl}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, imageUrl: e.target.value }))
                  }
                  className="h-10 w-full rounded-xl border border-[#E5E5E0] bg-white px-3 text-xs text-[#1A3C34] outline-none"
                  placeholder="https://api.../uploads/..."
                />
                {createForm.imageUrl.trim() && (
                  <p className="text-[11px] text-[#5C5C5C]">
                    Görsel kaydedilecek: {createForm.imageUrl.trim()}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={createMutation.isPending}
            isLoading={createMutation.isPending}
            className="w-full"
          >
            Ürünü kaydet
          </Button>
        </form>

        <section className="rounded-[28px] border border-[#E0D7C6] bg-white/90 px-6 py-6 shadow-[0_20px_60px_rgba(26,60,52,0.08)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                Liste
              </p>
              <h2 className="mt-2 text-2xl font-serif text-[#1A3C34]">
                Ürünler
              </h2>
              <p className="mt-2 text-sm text-[#5C5C5C]">
                Toplam: {products?.length ?? 0}
              </p>
            </div>
          </div>

          {isLoading && (
            <div className="pt-6">
              <Spinner fullscreen />
            </div>
          )}

          {isError && !isLoading && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Ürünler yüklenemedi. Token veya yetki problemi olabilir.
            </div>
          )}

          {!isLoading && !isError && (!products || products.length === 0) && (
            <div className="mt-6 rounded-2xl border border-[#E0D7C6] bg-white px-4 py-4 text-sm text-[#5C5C5C]">
              Ürün bulunamadı.
            </div>
          )}

          {!isLoading && !isError && products && products.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-[#1A3C34]/10 bg-white">
              <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,0.8fr)_minmax(0,0.6fr)_minmax(0,0.9fr)] gap-3 border-b border-[#E5E5E0] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#1A3C34]/60">
                <span>Ürün</span>
                <span>Kategori</span>
                <span>Tür</span>
                <span>Fiyat</span>
                <span>Stok</span>
                <span className="text-right">Aksiyon</span>
              </div>
              <div className="divide-y divide-[#F0F0EA]">
                {products.map((product) => {
                  const isEditing = editingId === product.id;
                  const stockLabel =
                    typeof product.stock === 'number' ? String(product.stock) : '-';
                  return (
                    <div
                      key={product.id}
                      className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,0.8fr)_minmax(0,0.6fr)_minmax(0,0.9fr)] gap-3 px-4 py-3 text-sm text-[#1A3C34]"
                    >
                      <div className="min-w-0">
                        {!isEditing ? (
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{product.name}</p>
                            <p className="truncate text-xs text-[#5C5C5C]">
                              {product.sku ? `SKU: ${product.sku}` : `ID: ${product.id}`}
                            </p>
                          </div>
                        ) : (
                          <div className="grid gap-2">
                            <input
                              value={editForm.name}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  name: e.target.value,
                                }))
                              }
                              className="h-9 w-full rounded-xl border border-[#E5E5E0] bg-white px-3 text-sm outline-none"
                            />
                            <input
                              value={editForm.sku}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  sku: e.target.value,
                                }))
                              }
                              className="h-9 w-full rounded-xl border border-[#E5E5E0] bg-white px-3 text-xs outline-none"
                              placeholder="SKU"
                            />
                            <div className="grid gap-2">
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const result = await uploadMutation.mutateAsync(file);
                                  setEditForm((prev) => ({ ...prev, imageUrl: result.url }));
                                  toast.success('Görsel yüklendi.');
                                }}
                                disabled={uploadMutation.isPending}
                                className="text-[11px]"
                              />
                              <input
                                value={editForm.imageUrl}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    imageUrl: e.target.value,
                                  }))
                                }
                                className="h-9 w-full rounded-xl border border-[#E5E5E0] bg-white px-3 text-xs outline-none"
                                placeholder="imageUrl"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        {!isEditing ? (
                          <span className="text-sm text-[#5C5C5C]">
                            {typeof product.categoryId === 'number'
                              ? (categoryNameById.get(product.categoryId) ?? '-')
                              : '-'}
                          </span>
                        ) : (
                          <select
                            value={editForm.categoryId}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                categoryId: e.target.value,
                              }))
                            }
                            className="h-9 w-full rounded-xl border border-[#E5E5E0] bg-white px-2 text-xs outline-none"
                            disabled={categoriesLoading || categoriesError}
                          >
                            <option value="">Kategori seç</option>
                            {(categories ?? []).map((category) => (
                              <option key={category.id} value={String(category.id)}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div>
                        {!isEditing ? (
                          <span className="text-sm text-[#5C5C5C]">
                            {formatType(product.type)}
                          </span>
                        ) : (
                          <select
                            value={editForm.type}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                type: e.target.value as ProductType,
                              }))
                            }
                            className="h-9 w-full rounded-xl border border-[#E5E5E0] bg-white px-2 text-xs outline-none"
                          >
                            <option value="PHYSICAL">Fiziksel</option>
                            <option value="SERVICE">Hizmet</option>
                            <option value="WEIGHT">Kilo</option>
                            <option value="CUSTOM">Özel</option>
                          </select>
                        )}
                      </div>

                      <div>
                        {!isEditing ? (
                          <span className="font-semibold">
                            {formatPrice(product.priceCents / 100)}
                          </span>
                        ) : (
                          <input
                            value={editForm.priceCents}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                priceCents: e.target.value,
                              }))
                            }
                            className="h-9 w-full rounded-xl border border-[#E5E5E0] bg-white px-3 text-xs outline-none"
                            inputMode="numeric"
                            placeholder="Kuruş"
                          />
                        )}
                      </div>

                      <div>
                        {!isEditing ? (
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                              typeof product.stock === 'number' && product.stock <= 5
                                ? 'bg-[#C5A059] text-[#3E2723]'
                                : 'bg-[#F3EEE3] text-[#3E2723]'
                            }`}
                          >
                            {stockLabel}
                          </span>
                        ) : (
                          <input
                            value={editForm.stock}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                stock: e.target.value,
                              }))
                            }
                            className="h-9 w-full rounded-xl border border-[#E5E5E0] bg-white px-3 text-xs outline-none"
                            inputMode="numeric"
                            placeholder="Stok"
                          />
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        {!isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => beginEdit(product)}
                              className="inline-flex items-center gap-2 rounded-full border border-[#1A3C34]/15 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#1A3C34]"
                            >
                              <Pencil className="h-4 w-4" />
                              Düzenle
                            </button>
                            <button
                              type="button"
                              onClick={() => archiveMutation.mutate(product.id)}
                              disabled={archiveMutation.isPending}
                              className="inline-flex items-center gap-2 rounded-full border border-[#B04B4B]/30 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#B04B4B] disabled:opacity-60"
                            >
                              <Archive className="h-4 w-4" />
                              Arşivle
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => updateMutation.mutate(product.id)}
                              disabled={updateMutation.isPending}
                              className="inline-flex items-center gap-2 rounded-full bg-[#1A3C34] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-white disabled:opacity-60"
                            >
                              <Save className="h-4 w-4" />
                              Kaydet
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="inline-flex items-center gap-2 rounded-full border border-[#1A3C34]/15 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#1A3C34]"
                            >
                              <X className="h-4 w-4" />
                              İptal
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
