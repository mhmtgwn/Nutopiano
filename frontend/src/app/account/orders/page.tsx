'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { formatDate, formatPrice } from '@/utils/helpers';

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

interface OrderSummary {
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
  data: OrderSummary[];
  meta: PaginationMeta;
}

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const {
    data: ordersPayload,
    isLoading,
    isError,
    error,
  } = useQuery<PaginatedOrders>({
    queryKey: ['orders', { page, pageSize }],
    queryFn: async () => {
      const res = await api.get<PaginatedOrders>('/customer/orders', {
        params: {
          page,
          pageSize,
        },
      });
      return res.data;
    },
  });

  const orders = ordersPayload?.data ?? [];
  const meta = ordersPayload?.meta;

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col px-4 py-6 md:px-6 md:py-10">
        <Spinner fullscreen />
      </div>
    );
  }

  if (isError) {
    const message = resolveApiErrorMessage(
      error,
      'Siparişler yüklenirken bir hata oluştu.',
    );

    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:px-6 md:py-10">
        <h1 className="text-2xl font-semibold text-[var(--primary-800)] md:text-3xl">
          Siparişlerim
        </h1>
        <section className="space-y-3 rounded-[var(--radius-2xl)] border border-[var(--error-600)]/20 bg-[var(--error-100)] px-4 py-6 md:px-6">
          <p className="text-sm text-[var(--error-600)] md:text-base">{message}</p>
          <p className="text-xs text-[var(--error-600)]/80 md:text-sm">
            Oturum süreniz dolmuş veya yetkiniz olmayabilir. Gerekirse yeniden
            giriş yapmayı deneyin.
          </p>
          <Link
            href="/login"
            className="text-sm text-[var(--primary-800)] underline-offset-2 hover:underline"
          >
            Giriş sayfasına git
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-[var(--primary-800)] md:text-3xl">
          Siparişlerim
        </h1>
        <p className="text-xs text-[var(--neutral-600)] md:text-sm">
          Nutopiano işletmeniz için oluşturduğunuz siparişlerin özetini
          görüntüleyin.
        </p>
      </header>

      {!orders || orders.length === 0 ? (
        <section className="space-y-3 rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white px-4 py-6 shadow-[var(--shadow-md)] md:px-6">
          <p className="text-sm text-[var(--neutral-600)] md:text-base">
            Henüz sipariş bulunmuyor.
          </p>
          <Link
            href="/"
            className="text-sm text-[var(--primary-800)] underline-offset-2 hover:underline"
          >
            Anasayfaya dön
          </Link>
        </section>
      ) : (
        <section className="space-y-3">
          <div className="overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white shadow-[var(--shadow-md)]">
            <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-[var(--neutral-200)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--neutral-500)] md:px-5 md:py-3 md:text-xs">
              <span>Sipariş</span>
              <span>Müşteri</span>
              <span>Tutar</span>
              <span>Durum</span>
            </div>
            <div className="divide-y divide-[var(--neutral-200)]">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 px-4 py-3 text-xs text-[var(--primary-800)] md:px-5 md:py-3 md:text-sm"
                >
                  <div className="flex flex-col">
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      #{order.id}
                    </Link>
                    <span className="text-[11px] text-[var(--neutral-500)] md:text-xs">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium md:text-base">
                      ID: {order.customerId}
                    </span>
                    <span className="text-[11px] text-[var(--neutral-500)] md:text-xs">
                      Oluşturan: {order.createdByUserId}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium">
                      {formatPrice(order.totalAmountCents / 100)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--primary-800)] md:text-[13px]">
                      {order.statusKey}
                    </span>
                    <span className="text-[11px] text-[var(--neutral-500)] md:text-xs">
                      Kaynak: {order.source}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!isLoading && !isError && meta && meta.totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-2 text-xs text-[var(--neutral-600)]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                Sayfa {meta.page} / {meta.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={meta.page <= 1}
                  className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Önceki
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={meta.page >= meta.totalPages}
                  className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-800)] px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
