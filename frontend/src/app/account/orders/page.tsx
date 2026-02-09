'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { formatDate, formatPrice, getAuthToken } from '@/utils/helpers';

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

export default function OrdersPage() {
  const token = getAuthToken();

  const {
    data: orders,
    isLoading,
    isError,
    error,
  } = useQuery<OrderSummary[]>({
    queryKey: ['orders'],
    enabled: !!token,
    queryFn: async () => {
      const res = await api.get<OrderSummary[]>('/orders');
      return res.data;
    },
  });

  if (!token) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:px-6 md:py-10">
        <h1 className="text-2xl font-semibold text-[#1A3C34] md:text-3xl">
          Siparişlerim
        </h1>
        <section className="space-y-3 rounded-2xl border border-[#E5E5E0] bg-white px-4 py-6 md:px-6">
          <p className="text-sm text-[#5C5C5C] md:text-base">
            Sipariş geçmişinizi görüntülemek için önce giriş yapmanız gerekir.
          </p>
          <Link
            href="/login"
            className="text-sm text-[#1A3C34] underline-offset-2 hover:underline"
          >
            Giriş yap
          </Link>
        </section>
      </div>
    );
  }

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
        <h1 className="text-2xl font-semibold text-[#1A3C34] md:text-3xl">
          Siparişlerim
        </h1>
        <section className="space-y-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-6 md:px-6">
          <p className="text-sm text-red-700 md:text-base">{message}</p>
          <p className="text-xs text-red-700/80 md:text-sm">
            Oturum süreniz dolmuş veya yetkiniz olmayabilir. Gerekirse yeniden
            giriş yapmayı deneyin.
          </p>
          <Link
            href="/login"
            className="text-sm text-[#1A3C34] underline-offset-2 hover:underline"
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
        <h1 className="text-2xl font-semibold text-[#1A3C34] md:text-3xl">
          Siparişlerim
        </h1>
        <p className="text-xs text-[#5C5C5C] md:text-sm">
          Nutopiano işletmeniz için oluşturduğunuz siparişlerin özetini
          görüntüleyin.
        </p>
      </header>

      {!orders || orders.length === 0 ? (
        <section className="space-y-3 rounded-2xl border border-[#E5E5E0] bg-white px-4 py-6 md:px-6">
          <p className="text-sm text-[#5C5C5C] md:text-base">
            Henüz sipariş bulunmuyor.
          </p>
          <Link
            href="/"
            className="text-sm text-[#1A3C34] underline-offset-2 hover:underline"
          >
            Anasayfaya dön
          </Link>
        </section>
      ) : (
        <section className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-[#E5E5E0] bg-white">
            <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-[#E5E5E0] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#8A8A8A] md:px-5 md:py-3 md:text-xs">
              <span>Sipariş</span>
              <span>Müşteri</span>
              <span>Tutar</span>
              <span>Durum</span>
            </div>
            <div className="divide-y divide-[#F0F0EA]">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 px-4 py-3 text-xs text-[#1A3C34] md:px-5 md:py-3 md:text-sm"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">#{order.id}</span>
                    <span className="text-[11px] text-[#8A8A8A] md:text-xs">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium md:text-base">
                      ID: {order.customerId}
                    </span>
                    <span className="text-[11px] text-[#8A8A8A] md:text-xs">
                      Oluşturan: {order.createdByUserId}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium">
                      {formatPrice(order.totalAmountCents / 100)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#1A3C34] md:text-[13px]">
                      {order.statusKey}
                    </span>
                    <span className="text-[11px] text-[#8A8A8A] md:text-xs">
                      Kaynak: {order.source}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
