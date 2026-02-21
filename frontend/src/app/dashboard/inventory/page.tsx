/* eslint-disable react/no-unescaped-entities */
'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Spinner from '@/components/common/Spinner';
import api from '@/services/api';

type ProductType = 'PHYSICAL' | 'SERVICE' | 'WEIGHT' | 'CUSTOM';

interface ProductRow {
  id: number;
  name: string;
  sku?: string | null;
  type: ProductType;
  stock?: number | null;
  priceCents: number;
  isActive: boolean;
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

export default function SellerInventoryPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const { data, isLoading, isError, error } = useQuery<PaginatedProducts>({
    queryKey: ['seller-inventory', { page, pageSize }],
    queryFn: async () => {
      const res = await api.get<PaginatedProducts>('/products/manage', {
        params: { page, pageSize },
      });
      return res.data;
    },
  });

  const products = data?.data ?? [];
  const meta = data?.meta;

  const [draftStock, setDraftStock] = useState<Record<number, string>>({});

  const paging = useMemo(() => {
    const totalPages = meta?.totalPages ?? 1;
    return {
      totalPages,
      canPrev: page > 1,
      canNext: page < totalPages,
    };
  }, [meta?.totalPages, page]);

  const updateStockMutation = useMutation({
    mutationFn: async (params: { productId: number; stock: number | null }) => {
      await api.patch(`/products/${params.productId}`, {
        stock: params.stock,
      });
    },
    onSuccess: async () => {
      toast.success('Stok güncellendi.');
      await queryClient.invalidateQueries({ queryKey: ['seller-inventory'] });
    },
    onError: (err: unknown) => {
      toast.error(resolveApiErrorMessage(err, 'Stok güncellenemedi.'));
    },
  });

  const isRowSaving = (productId: number) => {
    const current = updateStockMutation.variables;
    return updateStockMutation.isPending && current?.productId === productId;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
          Satıcı
        </p>
        <h1 className="mt-2 text-2xl font-serif text-[var(--primary-800)]">Stok</h1>
        <p className="mt-2 text-sm text-[var(--neutral-600)]">Ürün stok seviyelerini güncelleyin.</p>
      </div>

      <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        {isLoading && <Spinner fullscreen label="Stok yükleniyor..." />}

        {isError && !isLoading && (
          <div className="rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {resolveApiErrorMessage(error, 'Stok listesi yüklenemedi. Token veya yetki problemi olabilir.')}
          </div>
        )}

        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--neutral-200)] text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                  <th className="py-3 pr-4">Ürün</th>
                  <th className="py-3 pr-4">SKU</th>
                  <th className="py-3 pr-4">Stok</th>
                  <th className="py-3 pr-4">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const currentStock = typeof p.stock === 'number' ? p.stock : null;
                  const draft = draftStock[p.id];
                  const value = draft !== undefined ? draft : currentStock === null ? '' : String(currentStock);

                  return (
                    <tr key={p.id} className="border-b border-[var(--neutral-100)]">
                      <td className="py-3 pr-4">
                        <div className="font-semibold text-[var(--primary-800)]">{p.name}</div>
                        <div className="mt-1 text-xs text-[var(--neutral-600)]">#{p.id}</div>
                      </td>
                      <td className="py-3 pr-4 text-[var(--neutral-700)]">{p.sku ?? '-'}</td>
                      <td className="py-3 pr-4">
                        <input
                          value={value}
                          onChange={(e) => {
                            const next = e.target.value;
                            setDraftStock((prev) => ({ ...prev, [p.id]: next }));
                          }}
                          inputMode="numeric"
                          placeholder="-"
                          className="h-10 w-28 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm outline-none"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <button
                          type="button"
                          disabled={isRowSaving(p.id)}
                          onClick={() => {
                            const raw = (draftStock[p.id] ?? '').trim();
                            const nextStock = raw === '' ? null : Number(raw);

                            if (nextStock !== null && (!Number.isFinite(nextStock) || nextStock < 0)) {
                              toast.error('Stok 0 veya daha büyük bir sayı olmalı.');
                              return;
                            }

                            updateStockMutation.mutate({
                              productId: p.id,
                              stock: nextStock === null ? null : Math.floor(nextStock),
                            });
                          }}
                          className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-800)] px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Kaydet
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {products.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-sm text-[var(--neutral-600)]">
                      Henüz ürün yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!paging.canPrev}
            className={`inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border px-4 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${
              paging.canPrev
                ? 'border-[var(--neutral-200)] bg-white text-[var(--primary-800)] hover:bg-[var(--neutral-50)]'
                : 'cursor-not-allowed border-[var(--neutral-200)] bg-[var(--neutral-50)] text-[var(--neutral-400)]'
            }`}
          >
            Önceki
          </button>
          <div className="text-xs font-semibold text-[var(--neutral-600)]">
            Sayfa {page} / {paging.totalPages}
          </div>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(paging.totalPages, p + 1))}
            disabled={!paging.canNext}
            className={`inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border px-4 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${
              paging.canNext
                ? 'border-[var(--neutral-200)] bg-white text-[var(--primary-800)] hover:bg-[var(--neutral-50)]'
                : 'cursor-not-allowed border-[var(--neutral-200)] bg-[var(--neutral-50)] text-[var(--neutral-400)]'
            }`}
          >
            Sonraki
          </button>
        </div>
      </div>
    </div>
  );
}
