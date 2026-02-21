/* eslint-disable react/no-unescaped-entities */
'use client';

import { useQuery } from '@tanstack/react-query';

import Spinner from '@/components/common/Spinner';
import { formatDate, formatPrice } from '@/lib/format';
import api from '@/services/api';

interface SellerReportsSummary {
  range: {
    from: string;
    to: string;
    days: number;
  };
  ordersCount: number;
  revenueCents: number;
  averageOrderValueCents: number;
  topProducts: Array<{
    productId: number;
    name: string;
    quantity: number;
    revenueCents: number;
  }>;
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

export default function SellerReportsPage() {
  const { data, isLoading, isError, error } = useQuery<SellerReportsSummary>({
    queryKey: ['seller-reports-summary'],
    queryFn: async () => {
      const res = await api.get<SellerReportsSummary>('/dashboard/reports/summary');
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
          Satıcı
        </p>
        <h1 className="mt-2 text-2xl font-serif text-[var(--primary-800)]">Raporlar</h1>
        <p className="mt-2 text-sm text-[var(--neutral-600)]">
          Son {data?.range?.days ?? 30} gün temel satış metrikleri.
        </p>
        {data?.range?.from && data?.range?.to && (
          <p className="mt-1 text-xs text-[var(--neutral-500)]">
            {formatDate(data.range.from)} - {formatDate(data.range.to)}
          </p>
        )}
      </div>

      {isLoading && <Spinner fullscreen label="Yükleniyor..." />}

      {isError && !isLoading && (
        <div className="rounded-[var(--radius-xl)] border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
          {resolveApiErrorMessage(error, 'Rapor verisi yüklenemedi.')}
        </div>
      )}

      {!isLoading && !isError && data && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">Sipariş</p>
              <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">{data.ordersCount}</p>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">Ciro</p>
              <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">{formatPrice(data.revenueCents)}</p>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">Ortalama sepet</p>
              <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
                {formatPrice(data.averageOrderValueCents)}
              </p>
            </div>
          </div>

          <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-xl font-serif text-[var(--primary-800)]">En çok satan ürünler</h2>
              <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Top {data.topProducts.length}
              </div>
            </div>

            {data.topProducts.length === 0 ? (
              <div className="mt-4 text-sm text-[var(--neutral-600)]">Bu aralıkta satış yok.</div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--neutral-200)] text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                      <th className="py-3 pr-4">Ürün</th>
                      <th className="py-3 pr-4">Adet</th>
                      <th className="py-3 pr-4">Ciro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProducts.map((p) => (
                      <tr key={p.productId} className="border-b border-[var(--neutral-100)]">
                        <td className="py-3 pr-4 font-semibold text-[var(--primary-800)]">{p.name}</td>
                        <td className="py-3 pr-4 text-sm text-[var(--neutral-700)]">{p.quantity}</td>
                        <td className="py-3 pr-4 font-semibold text-[var(--primary-800)]">
                          {formatPrice(p.revenueCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
