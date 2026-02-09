'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ClipboardList, PackageCheck, Truck, X } from 'lucide-react';

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

interface OrderRow {
  id: number;
  customerId: number;
  totalAmountCents: number;
  statusKey: string;
  source: string;
  createdByUserId: number;
  createdAt: string;
}

interface OrderItemRow {
  id: number;
  productId: number;
  quantity: number;
  unitPriceCents: number;
  totalAmountCents: number;
}

interface OrderDetail {
  id: number;
  customerId: number;
  totalAmountCents: number;
  statusKey: string;
  source: string;
  createdByUserId: number;
  createdAt: string;
  notes?: string;
  items: OrderItemRow[];
}

interface PaymentRow {
  id: number;
  amountCents: number;
  method: string;
  reference?: string;
  createdAt: string;
}

interface OrderStatusRow {
  id: number;
  key: string;
  label: string;
  orderIndex: number;
  isFinal: boolean;
  isDefault: boolean;
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

const buildKpis = (orders: OrderRow[]) => {
  const total = orders.length;
  const byStatus = orders.reduce<Record<string, number>>((acc, order) => {
    acc[order.statusKey] = (acc[order.statusKey] ?? 0) + 1;
    return acc;
  }, {});

  return {
    total,
    newCount: byStatus.NEW ?? byStatus.New ?? byStatus.new ?? 0,
    preparingCount: byStatus.PREPARING ?? byStatus.Preparing ?? byStatus.preparing ?? 0,
    deliveredCount: byStatus.DELIVERED ?? byStatus.Delivered ?? byStatus.delivered ?? 0,
  };
};

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const {
    data: orders,
    isLoading,
    isError,
  } = useQuery<OrderRow[]>({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const res = await api.get<OrderRow[]>('/orders');
      return res.data;
    },
  });

  const {
    data: statuses,
    isLoading: isStatusesLoading,
    isError: isStatusesError,
  } = useQuery<OrderStatusRow[]>({
    queryKey: ['admin-order-statuses'],
    queryFn: async () => {
      const res = await api.get<OrderStatusRow[]>('/order-status');
      return res.data;
    },
  });

  const {
    data: orderDetail,
    isLoading: isDetailLoading,
    isError: isDetailError,
  } = useQuery<OrderDetail>({
    queryKey: ['admin-order-detail', selectedOrderId],
    enabled: typeof selectedOrderId === 'number',
    queryFn: async () => {
      const res = await api.get<OrderDetail>(`/orders/${selectedOrderId}`);
      return res.data;
    },
  });

  const {
    data: payments,
    isLoading: isPaymentsLoading,
    isError: isPaymentsError,
  } = useQuery<PaymentRow[]>({
    queryKey: ['admin-order-payments', selectedOrderId],
    enabled: typeof selectedOrderId === 'number',
    queryFn: async () => {
      const res = await api.get<PaymentRow[]>(`/orders/${selectedOrderId}/payments`);
      return res.data;
    },
  });

  const kpis = useMemo(() => buildKpis(orders ?? []), [orders]);

  const closeDrawer = () => setSelectedOrderId(null);

  const updateStatusMutation = useMutation({
    mutationFn: async (nextStatusKey: string) => {
      if (!selectedOrderId) return;
      await api.patch(`/orders/${selectedOrderId}`, { statusKey: nextStatusKey });
    },
    onMutate: async (nextStatusKey: string) => {
      if (!selectedOrderId) return;

      await queryClient.cancelQueries({ queryKey: ['admin-orders'] });
      await queryClient.cancelQueries({ queryKey: ['admin-order-detail', selectedOrderId] });

      const prevOrders = queryClient.getQueryData<OrderRow[]>(['admin-orders']);
      const prevDetail = queryClient.getQueryData<OrderDetail>([
        'admin-order-detail',
        selectedOrderId,
      ]);

      if (prevOrders) {
        queryClient.setQueryData<OrderRow[]>(['admin-orders'],
          prevOrders.map((order) =>
            order.id === selectedOrderId
              ? { ...order, statusKey: nextStatusKey }
              : order,
          ),
        );
      }

      if (prevDetail) {
        queryClient.setQueryData<OrderDetail>(['admin-order-detail', selectedOrderId], {
          ...prevDetail,
          statusKey: nextStatusKey,
        });
      }

      return { prevOrders, prevDetail };
    },
    onError: (error: unknown, _nextStatusKey, context) => {
      if (context?.prevOrders) {
        queryClient.setQueryData(['admin-orders'], context.prevOrders);
      }
      if (context?.prevDetail && selectedOrderId) {
        queryClient.setQueryData(['admin-order-detail', selectedOrderId], context.prevDetail);
      }

      toast.error(resolveApiErrorMessage(error, 'Sipariş durumu güncellenemedi.'));
    },
    onSuccess: async () => {
      toast.success('Sipariş durumu güncellendi.');
      await queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      if (selectedOrderId) {
        await queryClient.invalidateQueries({ queryKey: ['admin-order-detail', selectedOrderId] });
      }
    },
  });

  const statusCards = useMemo(
    () => [
      {
        title: 'Toplam sipariş',
        value: String(kpis.total),
        note: 'Panel',
        icon: ClipboardList,
      },
      {
        title: 'Yeni',
        value: String(kpis.newCount),
        note: 'Status',
        icon: ClipboardList,
      },
      {
        title: 'Hazırlık',
        value: String(kpis.preparingCount),
        note: 'Status',
        icon: PackageCheck,
      },
      {
        title: 'Teslim',
        value: String(kpis.deliveredCount),
        note: 'Status',
        icon: CheckCircle2,
      },
    ],
    [kpis],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-[#1A3C34]/10 bg-white/90 px-6 py-6 shadow-[0_30px_90px_rgba(26,60,52,0.12)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
              Sipariş
            </p>
            <h1 className="text-3xl font-serif text-[#1A3C34] md:text-4xl">
              Sipariş yönetimi
            </h1>
            <p className="text-sm text-[#5C5C5C]">
              Siparişleri takip edin, durumları görüntüleyin.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#1A3C34]/10 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#1A3C34]/70">
            <Truck className="h-4 w-4" />
            Canlı liste
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statusCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="rounded-[28px] border border-[#E0D7C6] bg-white/90 px-5 py-5 shadow-[0_20px_60px_rgba(26,60,52,0.08)]"
            >
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-[#C5A059]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#AC9C7A]">
                  {card.note}
                </span>
              </div>
              <p className="mt-4 text-2xl font-serif text-[#1A3C34]">{card.value}</p>
              <p className="mt-1 text-sm text-[#5C5C5C]">{card.title}</p>
            </div>
          );
        })}
      </section>

      <section className="rounded-[28px] border border-[#E0D7C6] bg-white/90 px-6 py-6 shadow-[0_20px_60px_rgba(26,60,52,0.08)]">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-serif text-[#1A3C34]">Siparişler</h2>
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#1A3C34]/60">
            Toplam: {orders?.length ?? 0}
          </span>
        </div>

        {isLoading && (
          <div className="pt-6">
            <Spinner fullscreen />
          </div>
        )}

        {isError && !isLoading && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Siparişler yüklenemedi. Token veya yetki problemi olabilir.
          </div>
        )}

        {!isLoading && !isError && (!orders || orders.length === 0) && (
          <div className="mt-6 rounded-2xl border border-[#E0D7C6] bg-white px-4 py-4 text-sm text-[#5C5C5C]">
            Sipariş bulunamadı.
          </div>
        )}

        {!isLoading && !isError && orders && orders.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-[#1A3C34]/10 bg-white">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.9fr)] gap-3 border-b border-[#E5E5E0] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#1A3C34]/60">
              <span>Sipariş</span>
              <span>Müşteri</span>
              <span>Tutar</span>
              <span>Durum</span>
              <span>Kaynak</span>
            </div>
            <div className="divide-y divide-[#F0F0EA]">
              {orders.map((order) => (
                <div
                  key={order.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedOrderId(order.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setSelectedOrderId(order.id);
                  }}
                  className="grid cursor-pointer grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.9fr)] gap-3 px-4 py-3 text-sm text-[#1A3C34] transition hover:bg-[#F7F4EF]"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold">#{order.id}</span>
                    <span className="text-xs text-[#5C5C5C]">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>
                  <div className="text-sm text-[#5C5C5C]">ID: {order.customerId}</div>
                  <div className="font-semibold">
                    {formatPrice(order.totalAmountCents / 100)}
                  </div>
                  <div>
                    <span className="inline-flex rounded-full bg-[#F3EEE3] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3E2723]">
                      {order.statusKey}
                    </span>
                  </div>
                  <div className="text-sm text-[#5C5C5C]">{order.source}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {selectedOrderId !== null && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Kapat"
            onClick={closeDrawer}
            className="absolute inset-0 bg-black/40"
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-y-auto bg-[#F7F4EF] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1A3C34]/10 bg-white px-6 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                  Sipariş detayı
                </p>
                <h3 className="mt-1 text-xl font-serif text-[#1A3C34]">#{selectedOrderId}</h3>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#1A3C34]/15 bg-white"
              >
                <X className="h-5 w-5 text-[#1A3C34]" />
              </button>
            </div>

            {(isDetailLoading || isPaymentsLoading) && (
              <div className="px-6 py-8">
                <Spinner fullscreen label="Yükleniyor..." />
              </div>
            )}

            {(isDetailError || isPaymentsError) && !(isDetailLoading || isPaymentsLoading) && (
              <div className="px-6 py-6 text-sm text-red-700">
                Sipariş detayı yüklenemedi.
              </div>
            )}

            {!isDetailLoading && !isDetailError && orderDetail && (
              <div className="space-y-4 px-6 py-6">
                <section className="rounded-2xl border border-[#E0D7C6] bg-white px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                    Özet
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] text-[#8A8A8A]">Müşteri</p>
                      <p className="text-sm font-semibold text-[#1A3C34]">ID: {orderDetail.customerId}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[#8A8A8A]">Tarih</p>
                      <p className="text-sm font-semibold text-[#1A3C34]">{formatDate(orderDetail.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[#8A8A8A]">Toplam</p>
                      <p className="text-sm font-semibold text-[#1A3C34]">{formatPrice(orderDetail.totalAmountCents / 100)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[#8A8A8A]">Kaynak</p>
                      <p className="text-sm font-semibold text-[#1A3C34]">{orderDetail.source}</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-[#E0D7C6] bg-white px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                        Durum
                      </p>
                      <span
                        className={`mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${statusBadgeClassName(
                          orderDetail.statusKey,
                        )}`}
                      >
                        {orderDetail.statusKey}
                      </span>
                    </div>

                    <div className="w-52">
                      <select
                        value={orderDetail.statusKey}
                        onChange={(e) => updateStatusMutation.mutate(e.target.value)}
                        disabled={
                          updateStatusMutation.isPending ||
                          isStatusesLoading ||
                          isStatusesError ||
                          !statuses ||
                          statuses.length === 0
                        }
                        className="h-10 w-full rounded-xl border border-[#E5E5E0] bg-white px-3 text-sm text-[#1A3C34] shadow-sm outline-none"
                      >
                        {(statuses ?? [])
                          .slice()
                          .sort((a, b) => a.orderIndex - b.orderIndex)
                          .map((s) => (
                            <option key={s.id} value={s.key}>
                              {s.label}
                            </option>
                          ))}
                      </select>
                      {isStatusesError && (
                        <p className="mt-2 text-[11px] text-red-700">Durum listesi yüklenemedi.</p>
                      )}
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-[#E0D7C6] bg-white px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                    Ürünler
                  </p>
                  <div className="mt-3 space-y-2">
                    {orderDetail.items.length === 0 ? (
                      <p className="text-sm text-[#5C5C5C]">Ürün satırı yok.</p>
                    ) : (
                      orderDetail.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-xl border border-[#1A3C34]/10 bg-white px-3 py-2 text-sm"
                        >
                          <div>
                            <p className="font-semibold text-[#1A3C34]">Ürün #{item.productId}</p>
                            <p className="text-xs text-[#5C5C5C]">Adet: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-[#1A3C34]">{formatPrice(item.totalAmountCents / 100)}</p>
                            <p className="text-xs text-[#5C5C5C]">Birim: {formatPrice(item.unitPriceCents / 100)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-[#E0D7C6] bg-white px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                    Ödemeler
                  </p>
                  <div className="mt-3 space-y-2">
                    {!payments || payments.length === 0 ? (
                      <p className="text-sm text-[#5C5C5C]">Ödeme kaydı yok.</p>
                    ) : (
                      payments.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-xl border border-[#1A3C34]/10 bg-white px-3 py-2 text-sm"
                        >
                          <div>
                            <p className="font-semibold text-[#1A3C34]">{p.method}</p>
                            <p className="text-xs text-[#5C5C5C]">{formatDate(p.createdAt)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-[#1A3C34]">{formatPrice(p.amountCents / 100)}</p>
                            {p.reference && (
                              <p className="text-xs text-[#5C5C5C]">Ref: {p.reference}</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
