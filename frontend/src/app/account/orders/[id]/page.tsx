'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

type OrderItemRow = {
  id: number;
  productId: number;
  quantity: number;
  unitPriceCents: number;
  totalAmountCents: number;
};

type OrderDetail = {
  id: number;
  customerId: number;
  totalAmountCents: number;
  statusKey: string;
  source: string;
  createdByUserId: number;
  createdAt: string;
  notes?: string;
  items: OrderItemRow[];
};

export default function AccountOrderDetailPage({ params }: { params: { id: string } }) {
  const queryClient = useQueryClient();

  const orderId = useMemo(() => {
    const parsed = Number(params.id);
    return Number.isFinite(parsed) ? parsed : null;
  }, [params.id]);

  const {
    data: order,
    isLoading,
    isError,
    error,
  } = useQuery<OrderDetail>({
    queryKey: ['account-order-detail', orderId],
    enabled: typeof orderId === 'number',
    queryFn: async () => {
      const res = await api.get<OrderDetail>(`/customer/orders/${orderId}`);
      return res.data;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!orderId) return;
      const res = await api.post<OrderDetail>(`/customer/orders/${orderId}/cancel`);
      return res.data;
    },
    onSuccess: async () => {
      toast.success('İptal talebi alındı.');
      await queryClient.invalidateQueries({ queryKey: ['account-order-detail', orderId] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err: unknown) => {
      toast.error(resolveApiErrorMessage(err, 'Sipariş iptal edilemedi.'));
    },
  });

  const returnMutation = useMutation({
    mutationFn: async () => {
      if (!orderId) return;
      const res = await api.post<OrderDetail>(`/customer/orders/${orderId}/return`);
      return res.data;
    },
    onSuccess: async () => {
      toast.success('İade talebi alındı.');
      await queryClient.invalidateQueries({ queryKey: ['account-order-detail', orderId] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err: unknown) => {
      toast.error(resolveApiErrorMessage(err, 'İade talebi oluşturulamadı.'));
    },
  });

  if (orderId === null) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-6 md:px-6 md:py-10">
        <h1 className="text-2xl font-semibold text-[var(--primary-800)] md:text-3xl">Sipariş detayı</h1>
        <section className="space-y-3 rounded-[var(--radius-2xl)] border border-[var(--error-600)]/20 bg-[var(--error-100)] px-4 py-6 md:px-6">
          <p className="text-sm text-[var(--error-600)] md:text-base">Geçersiz sipariş numarası.</p>
          <Link
            href="/account/orders"
            className="text-sm text-[var(--primary-800)] underline-offset-2 hover:underline"
          >
            Siparişlerime dön
          </Link>
        </section>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col px-4 py-6 md:px-6 md:py-10">
        <Spinner fullscreen />
      </div>
    );
  }

  if (isError || !order) {
    const message = resolveApiErrorMessage(error, 'Sipariş detayı yüklenirken bir hata oluştu.');

    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-6 md:px-6 md:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-[var(--primary-800)] md:text-3xl">Sipariş detayı</h1>
          <Link
            href="/account/orders"
            className="text-sm font-semibold text-[var(--primary-800)] underline-offset-2 hover:underline"
          >
            Geri
          </Link>
        </div>
        <section className="space-y-3 rounded-[var(--radius-2xl)] border border-[var(--error-600)]/20 bg-[var(--error-100)] px-4 py-6 md:px-6">
          <p className="text-sm text-[var(--error-600)] md:text-base">{message}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--primary-800)] md:text-3xl">Sipariş #{order.id}</h1>
          <p className="mt-1 text-xs text-[var(--neutral-600)] md:text-sm">
            {formatDate(order.createdAt)} • Durum: {order.statusKey}
          </p>
        </div>
        <Link
          href="/account/orders"
          className="text-sm font-semibold text-[var(--primary-800)] underline-offset-2 hover:underline"
        >
          Geri
        </Link>
      </div>

      <section className="rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white px-4 py-6 shadow-[var(--shadow-md)] md:px-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">Toplam</p>
            <p className="mt-1 text-lg font-semibold text-[var(--primary-800)]">
              {formatPrice(order.totalAmountCents / 100)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">Kaynak</p>
            <p className="mt-1 text-sm text-[var(--neutral-700)]">{order.source}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">Müşteri</p>
            <p className="mt-1 text-sm text-[var(--neutral-700)]">ID: {order.customerId}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">Oluşturan</p>
            <p className="mt-1 text-sm text-[var(--neutral-700)]">Kullanıcı: {order.createdByUserId}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending || returnMutation.isPending}
            className="inline-flex h-11 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            İptal et
          </button>
          <button
            type="button"
            onClick={() => returnMutation.mutate()}
            disabled={cancelMutation.isPending || returnMutation.isPending}
            className="inline-flex h-11 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-800)] px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            İade talebi
          </button>
        </div>
      </section>

      <section className="rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white px-4 py-6 shadow-[var(--shadow-md)] md:px-6">
        <h2 className="text-lg font-semibold text-[var(--primary-800)]">Ürünler</h2>

        {order.items.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--neutral-600)]">Ürün satırı yok.</p>
        ) : (
          <div className="mt-4 divide-y divide-[var(--neutral-200)]">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--primary-800)]">Ürün #{item.productId}</p>
                  <p className="mt-1 text-xs text-[var(--neutral-600)]">Adet: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[var(--primary-800)]">
                    {formatPrice(item.totalAmountCents / 100)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--neutral-600)]">
                    Birim: {formatPrice(item.unitPriceCents / 100)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
