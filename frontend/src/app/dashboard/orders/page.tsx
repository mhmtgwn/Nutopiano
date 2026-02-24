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
  const [source, setSource] = useState('');
  const [statusKey, setStatusKey] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [createdByUserId, setCreatedByUserId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filters = useMemo(
    () => {
      const parsedCustomerId = Number(customerId);
      const parsedCreatedByUserId = Number(createdByUserId);
      return {
        source: source.trim() || undefined,
        statusKey: statusKey.trim() || undefined,
        customerId:
          customerId.trim().length > 0 && Number.isFinite(parsedCustomerId)
            ? parsedCustomerId
            : undefined,
        createdByUserId:
          createdByUserId.trim().length > 0 &&
          Number.isFinite(parsedCreatedByUserId)
            ? parsedCreatedByUserId
            : undefined,
        dateFrom: dateFrom.trim() || undefined,
        dateTo: dateTo.trim() || undefined,
      };
    },
    [source, statusKey, customerId, createdByUserId, dateFrom, dateTo],
  );

  const { data, isLoading, isError } = useQuery<PaginatedOrders>({
    queryKey: ['seller-orders', { page, pageSize, ...filters }],
    queryFn: async () => {
      const res = await api.get<PaginatedOrders>('/orders', {
        params: {
          page,
          pageSize,
          ...filters,
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
              Siparislerinizi takip edin. (SELLER kendi magazasi, USER seller scope)
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
          <>
            <div className="mb-4 grid gap-3 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-4 md:grid-cols-6">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-600)]">
                Kanal
                <select
                  value={source}
                  onChange={(e) => {
                    setSource(e.target.value);
                    setPage(1);
                  }}
                  className="mt-1 h-10 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
                >
                  <option value="">Tum</option>
                  <option value="POS">POS</option>
                  <option value="WEB">WEB</option>
                </select>
              </label>

              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-600)]">
                Durum
                <input
                  value={statusKey}
                  onChange={(e) => {
                    setStatusKey(e.target.value);
                    setPage(1);
                  }}
                  placeholder="CREATED"
                  className="mt-1 h-10 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
                />
              </label>

              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-600)]">
                Musteri
                <input
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value);
                    setPage(1);
                  }}
                  placeholder="ID"
                  inputMode="numeric"
                  className="mt-1 h-10 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
                />
              </label>

              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-600)]">
                Personel
                <input
                  value={createdByUserId}
                  onChange={(e) => {
                    setCreatedByUserId(e.target.value);
                    setPage(1);
                  }}
                  placeholder="User ID"
                  inputMode="numeric"
                  className="mt-1 h-10 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
                />
              </label>

              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-600)]">
                Baslangic
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="mt-1 h-10 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
                />
              </label>

              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-600)]">
                Bitis
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="mt-1 h-10 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
                />
              </label>
            </div>

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
          </>
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

