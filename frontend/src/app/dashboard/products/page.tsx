/* eslint-disable react/no-unescaped-entities */
'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { formatPrice } from '@/lib/format';

type ProductType = 'PHYSICAL' | 'SERVICE' | 'WEIGHT' | 'CUSTOM';

interface ProductRow {
  id: number;
  categoryId?: number | null;
  name: string;
  subtitle?: string | null;
  sku?: string | null;
  type: ProductType;
  priceCents: number;
  stock?: number | null;
  imageUrl?: string | null;
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

export default function SellerProductsPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const { data, isLoading, isError } = useQuery<PaginatedProducts>({
    queryKey: ['seller-products', { page, pageSize }],
    queryFn: async () => {
      const res = await api.get<PaginatedProducts>('/products/manage', {
        params: {
          page,
          pageSize,
        },
      });
      return res.data;
    },
  });

  const products = data?.data ?? [];
  const meta = data?.meta;

  const lowStockCount = useMemo(() => {
    return products.filter((p) => typeof p.stock === 'number' && p.stock <= 5).length;
  }, [products]);

  const paging = useMemo(() => {
    const totalPages = meta?.totalPages ?? 1;
    return {
      totalPages,
      canPrev: page > 1,
      canNext: page < totalPages,
    };
  }, [meta?.totalPages, page]);

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
          Satıcı
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-serif text-[var(--primary-800)]">Ürünler</h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Katalog ve stok takibini buradan yönetin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full border border-[var(--neutral-200)] bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)]">
              Toplam: {meta?.total ?? products.length}
            </div>
            <div className="rounded-full border border-[var(--neutral-200)] bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)]">
              Düşük stok: {lowStockCount}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        {isLoading && <Spinner fullscreen label="Ürünler yükleniyor..." />}

        {isError && !isLoading && (
          <div className="rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Ürünler yüklenemedi. Token veya yetki problemi olabilir.
          </div>
        )}

        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--neutral-200)] text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                  <th className="py-3 pr-4">Ürün</th>
                  <th className="py-3 pr-4">Tip</th>
                  <th className="py-3 pr-4">SKU</th>
                  <th className="py-3 pr-4">Stok</th>
                  <th className="py-3 pr-4">Fiyat</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--neutral-100)]">
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-[var(--primary-800)]">{p.name}</div>
                      {p.subtitle && (
                        <div className="mt-1 text-xs text-[var(--neutral-600)]">{p.subtitle}</div>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-[var(--neutral-700)]">{formatType(p.type)}</td>
                    <td className="py-3 pr-4 text-[var(--neutral-700)]">{p.sku ?? '-'}</td>
                    <td className="py-3 pr-4 text-[var(--neutral-700)]">
                      {typeof p.stock === 'number' ? p.stock : '-'}
                    </td>
                    <td className="py-3 pr-4 text-[var(--neutral-700)]">{formatPrice(p.priceCents)}</td>
                  </tr>
                ))}

                {products.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-[var(--neutral-600)]">
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
