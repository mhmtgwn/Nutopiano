/* eslint-disable react/no-unescaped-entities */
'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { formatDateTime, formatPrice } from '@/lib/format';

interface OrderRow {
  id: number;
  customerId: number;
  totalAmountCents: number;
  statusKey: string;
  source: string;
  createdByUserId: number;
  createdAt: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface PaginatedOrders {
  data: OrderRow[];
  meta: PaginationMeta;
}

const statusBadgeClassName = (statusKey: string) => {
  const key = statusKey.trim().toUpperCase();
  if (key.includes('NEW')) return 'bg-[#E8F1FF] text-[#0B3B91]';
  if (key.includes('PAID')) return 'bg-[#E6FBF2] text-[#0F5132]';
  if (key.includes('PREP')) return 'bg-[#FFF7E6] text-[#7A4B00]';
  if (key.includes('SHIP')) return 'bg-[#F3EEE3] text-[#3E2723]';
  if (key.includes('DELIV') || key.includes('COMP')) return 'bg-[#E6FBF2] text-[#0F5132]';
  if (key.includes('CANCEL')) return 'bg-[#FDECEC] text-[#9B1C1C]';
  return 'bg-[#F3EEE3] text-[#3E2723]';
};

export default function SellerOrdersPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const { data, isLoading, isError } = useQuery<PaginatedOrders>({
    queryKey: ['seller-orders', { page, pageSize }],
    queryFn: async () => {
      const res = await api.get<PaginatedOrders>('/orders', {
        params: {
          page,
          pageSize,
        },
      });
      return res.data;
    },
  });

  const orders = data?.data ?? [];
  const meta = data?.meta;

  const paging = useMemo(() => {
    const totalPages = meta?.totalPages ?? 1;
    return {
      canPrev: page > 1,
      canNext: page < totalPages,
      totalPages,
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
            <h1 className="text-2xl font-serif text-[var(--primary-800)]">Siparişler</h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Siparişlerinizi takip edin. (SELLER tüm işletme, STAFF sadece kendi oluşturdukları)
            </p>
          </div>
          <div className="rounded-full border border-[var(--neutral-200)] bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)]">
            Toplam: {meta?.total ?? orders.length}
          </div>
        </div>
      </div>

      <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        {isLoading && <Spinner fullscreen label="Siparişler yükleniyor..." />}

        {isError && !isLoading && (
          <div className="rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Siparişler yüklenemedi. Token veya yetki problemi olabilir.
          </div>
        )}

        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--neutral-200)] text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                  <th className="py-3 pr-4">ID</th>
                  <th className="py-3 pr-4">Durum</th>
                  <th className="py-3 pr-4">Kaynak</th>
                  <th className="py-3 pr-4">Tutar</th>
                  <th className="py-3 pr-4">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-[var(--neutral-100)]">
                    <td className="py-3 pr-4 font-semibold text-[var(--primary-800)]">#{o.id}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${statusBadgeClassName(
                          o.statusKey,
                        )}`}
                      >
                        {o.statusKey}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-[var(--neutral-700)]">{o.source}</td>
                    <td className="py-3 pr-4 text-[var(--neutral-700)]">{formatPrice(o.totalAmountCents)}</td>
                    <td className="py-3 pr-4 text-[var(--neutral-600)]">
                      {formatDateTime(o.createdAt)}
                    </td>
                  </tr>
                ))}

                {orders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-[var(--neutral-600)]">
                      Henüz sipariş yok.
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
