'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Package,
  PackageCheck,
  RefreshCw,
  Truck,
  X,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

import ConflictResolutionModal from '@/components/common/ConflictResolutionModal';
import Spinner from '@/components/common/Spinner';
import { isConflictError, resolveApiErrorMessage } from '@/lib/api-errors';
import api from '@/services/api';
import { formatDate, formatPrice } from '@/utils/helpers';

/* ─── Types ──────────────────────────────────────────────── */
interface OrderRow {
  id: number; customerId: number; totalAmountCents: number;
  statusKey: string; source: string; createdByUserId: number; createdAt: string;
}
interface OrderItemRow {
  id: number; productId: number; productName?: string;
  quantity: number; unitPriceCents: number; totalAmountCents: number;
}
interface OrderDetail {
  id: number; customerId: number; totalAmountCents: number;
  statusKey: string; source: string; createdByUserId: number; createdAt: string;
  notes?: string; items: OrderItemRow[];
}
interface PaymentRow {
  id: number; amountCents: number; method: string; reference?: string; createdAt: string;
}
interface OrderStatusRow {
  id: number; key: string; label: string; orderIndex: number; isFinal: boolean; isDefault: boolean;
}
interface PaginationMeta { total: number; page: number; pageSize: number; totalPages: number; }
interface PaginatedOrders { data: OrderRow[]; meta: PaginationMeta; }

/* ─── Helpers ────────────────────────────────────────────── */
function getStatusStyle(key: string) {
  const k = key.trim().toUpperCase();
  if (k.includes('NEW')) return { bg: 'bg-blue-50', text: 'text-blue-700', icon: Clock };
  if (k.includes('PAID')) return { bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle2 };
  if (k.includes('PREP')) return { bg: 'bg-amber-50', text: 'text-amber-700', icon: PackageCheck };
  if (k.includes('SHIP')) return { bg: 'bg-violet-50', text: 'text-violet-700', icon: Truck };
  if (k.includes('DELIV') || k.includes('COMP')) return { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle2 };
  if (k.includes('CANCEL')) return { bg: 'bg-red-50', text: 'text-red-700', icon: XCircle };
  if (k.includes('PROCESS')) return { bg: 'bg-purple-50', text: 'text-purple-700', icon: Activity };
  return { bg: 'bg-gray-50', text: 'text-gray-600', icon: Clock };
}

function StatusBadge({ status }: { status: string }) {
  const { bg, text, icon: Icon } = getStatusStyle(status);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${bg} ${text}`}>
      <Icon className="h-3 w-3" />{status}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const map: Record<string, string> = { POS: 'POS', MOBILE: 'Mobil', WEB: 'Web', MANUAL: 'Manuel', ONLINE: 'Online' };
  return <span className="rounded text-[11px] font-medium text-gray-500">{map[source] ?? source}</span>;
}

/* ─── Page ───────────────────────────────────────────────── */
export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [source, setSource] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [conflictDetail, setConflictDetail] = useState<string | null>(null);

  const { data: ordersPayload, isLoading, isError } = useQuery<PaginatedOrders>({
    queryKey: ['admin-orders', { page, pageSize, source }],
    queryFn: async () => (await api.get<PaginatedOrders>('/platform/orders', {
      params: { source: source || undefined, page, pageSize },
    })).data,
  });

  const { data: statuses, isLoading: isStatusesLoading, isError: isStatusesError } = useQuery<OrderStatusRow[]>({
    queryKey: ['admin-order-statuses'],
    queryFn: async () => (await api.get<OrderStatusRow[]>('/order-status')).data,
  });

  const { data: orderDetail, isLoading: isDetailLoading, isError: isDetailError } = useQuery<OrderDetail>({
    queryKey: ['admin-order-detail', selectedOrderId],
    enabled: typeof selectedOrderId === 'number',
    queryFn: async () => (await api.get<OrderDetail>(`/orders/${selectedOrderId}`)).data,
  });

  const { data: payments, isLoading: isPaymentsLoading, isError: isPaymentsError } = useQuery<PaymentRow[]>({
    queryKey: ['admin-order-payments', selectedOrderId],
    enabled: typeof selectedOrderId === 'number',
    queryFn: async () => (await api.get<PaymentRow[]>(`/orders/${selectedOrderId}/payments`)).data,
  });

  const orders = ordersPayload?.data ?? [];
  const meta = ordersPayload?.meta;

  const kpis = useMemo(() => {
    const byStatus = orders.reduce<Record<string, number>>((acc, o) => {
      const k = o.statusKey.toUpperCase();
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});
    return {
      total: meta?.total ?? orders.length,
      newCount: Object.entries(byStatus).filter(([k]) => k.includes('NEW')).reduce((s, [, v]) => s + v, 0),
      preparingCount: Object.entries(byStatus).filter(([k]) => k.includes('PREP')).reduce((s, [, v]) => s + v, 0),
      deliveredCount: Object.entries(byStatus).filter(([k]) => k.includes('DELIV') || k.includes('COMP')).reduce((s, [, v]) => s + v, 0),
    };
  }, [orders, meta?.total]);

  const updateStatus = useMutation({
    mutationFn: async (nextStatusKey: string) => {
      if (!selectedOrderId) return;
      await api.patch(`/orders/${selectedOrderId}`, { statusKey: nextStatusKey });
    },
    onError: (err: unknown) => {
      if (isConflictError(err)) {
        setConflictDetail(resolveApiErrorMessage(err, 'Sipariş başka bir kullanıcı tarafından güncellendi.'));
        return;
      }
      toast.error(resolveApiErrorMessage(err, 'Durum güncellenemedi.'));
    },
    onSuccess: async () => {
      toast.success('Sipariş durumu güncellendi.');
      await queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      if (selectedOrderId) await queryClient.invalidateQueries({ queryKey: ['admin-order-detail', selectedOrderId] });
    },
  });

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div>
        <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">Sipariş Yönetimi</h1>
        <p className="mt-1 text-sm text-[var(--neutral-600)]">Tüm siparişleri izleyin, durumlarını güncelleyin.</p>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {[
          { label: 'Toplam', value: kpis.total, icon: ClipboardList },
          { label: 'Yeni', value: kpis.newCount, icon: Clock },
          { label: 'Hazırlık', value: kpis.preparingCount, icon: PackageCheck },
          { label: 'Teslim', value: kpis.deliveredCount, icon: CheckCircle2 },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">{label}</p>
            <div className="mt-1 flex items-end gap-2">
              <span className="text-2xl font-semibold text-[var(--primary-800)]">{value}</span>
              <Icon className="mb-1 h-4 w-4 text-[var(--neutral-400)]" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-4 border-b border-[var(--neutral-200)] pb-3">
        <p className="text-sm font-medium text-[var(--neutral-700)]">
          {meta?.total ? `${meta.total} sipariş` : ''}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--neutral-500)]">Kaynak:</span>
          <select
            value={source}
            onChange={(e) => { setSource(e.target.value); setPage(1); }}
            className="h-8 rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-2.5 text-xs text-[var(--neutral-700)] outline-none focus:border-[var(--primary-800)]/40"
          >
            <option value="">Tümü</option>
            <option value="POS">POS</option>
            <option value="MOBILE">Mobil</option>
            <option value="WEB">Web</option>
          </select>
        </div>
      </div>

      {/* ── States ── */}
      {isLoading && <Spinner label="Siparişler yükleniyor..." />}
      {isError && !isLoading && (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" /> Siparişler yüklenemedi.
        </div>
      )}

      {/* ── Table ── */}
      {!isLoading && !isError && orders.length === 0 && (
        <p className="py-10 text-center text-sm text-[var(--neutral-500)]">Sipariş bulunamadı.</p>
      )}

      {!isLoading && !isError && orders.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--neutral-200)]">
                {['Sipariş', 'Müşteri', 'Tutar', 'Durum', 'Kaynak', 'Tarih'].map((h) => (
                  <th key={h} className={`pb-3 pr-6 text-left text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)] ${h === 'Tutar' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--neutral-100)]">
              {orders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className="cursor-pointer transition-colors hover:bg-[var(--neutral-50)]"
                >
                  <td className="py-3 pr-6 font-semibold text-[var(--primary-800)]">#{order.id}</td>
                  <td className="py-3 pr-6 text-[var(--neutral-600)]">#{order.customerId}</td>
                  <td className="py-3 pr-6 text-right font-semibold text-[var(--primary-800)]">{formatPrice(order.totalAmountCents)}</td>
                  <td className="py-3 pr-6"><StatusBadge status={order.statusKey} /></td>
                  <td className="py-3 pr-6"><SourceBadge source={order.source} /></td>
                  <td className="py-3 text-[var(--neutral-500)]">
                    {new Date(order.createdAt).toLocaleString('tr-TR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--neutral-200)] pt-4">
          <p className="text-xs text-[var(--neutral-500)]">Sayfa {meta.page} / {meta.totalPages}</p>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={meta.page <= 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white text-[var(--neutral-700)] hover:bg-[var(--neutral-50)] disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={meta.page >= meta.totalPages}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white text-[var(--neutral-700)] hover:bg-[var(--neutral-50)] disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Order Detail Drawer ── */}
      {selectedOrderId !== null && (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label="Kapat" onClick={() => setSelectedOrderId(null)}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <aside className="absolute right-0 top-0 h-full w-full max-w-lg flex flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--neutral-200)]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">Sipariş Detayı</p>
                <h3 className="mt-0.5 text-lg font-semibold text-[var(--primary-800)]">#{selectedOrderId}</h3>
              </div>
              <button type="button" onClick={() => setSelectedOrderId(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--neutral-200)] text-[var(--neutral-600)] hover:bg-[var(--neutral-50)]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {(isDetailLoading || isPaymentsLoading) && <Spinner label="Yükleniyor..." />}
              {(isDetailError || isPaymentsError) && (
                <p className="text-sm text-red-600">Detay yüklenemedi.</p>
              )}

              {!isDetailLoading && !isDetailError && orderDetail && (
                <>
                  {/* Summary */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)] mb-3">Özet</p>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                      {[
                        { l: 'Müşteri', v: `#${orderDetail.customerId}` },
                        { l: 'Tarih', v: formatDate(orderDetail.createdAt) },
                        { l: 'Toplam', v: formatPrice(orderDetail.totalAmountCents) },
                        { l: 'Kaynak', v: orderDetail.source },
                      ].map(({ l, v }) => (
                        <div key={l}>
                          <p className="text-[11px] text-[var(--neutral-500)]">{l}</p>
                          <p className="mt-0.5 font-semibold text-[var(--primary-800)]">{v}</p>
                        </div>
                      ))}
                    </div>
                    {orderDetail.notes && (
                      <div className="mt-4 pt-4 border-t border-[var(--neutral-200)]">
                        <p className="text-[11px] text-[var(--neutral-500)]">Not</p>
                        <p className="mt-1 text-sm text-[var(--neutral-700)]">{orderDetail.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)] mb-3">Durum Güncelle</p>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={orderDetail.statusKey} />
                      <select
                        value={orderDetail.statusKey}
                        onChange={(e) => updateStatus.mutate(e.target.value)}
                        disabled={updateStatus.isPending || isStatusesLoading || isStatusesError || !statuses?.length}
                        className="h-9 flex-1 rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)] outline-none focus:border-[var(--primary-800)]/40 disabled:opacity-60"
                      >
                        {(statuses ?? []).slice().sort((a, b) => a.orderIndex - b.orderIndex).map((s) => (
                          <option key={s.id} value={s.key}>{s.label}</option>
                        ))}
                      </select>
                      {updateStatus.isPending && <RefreshCw className="h-4 w-4 animate-spin text-[var(--neutral-400)]" />}
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)] mb-3">
                      Ürünler ({orderDetail.items.length})
                    </p>
                    <div className="divide-y divide-[var(--neutral-100)]">
                      {orderDetail.items.length === 0 ? (
                        <p className="text-sm text-[var(--neutral-500)]">Ürün satırı yok.</p>
                      ) : orderDetail.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-2.5">
                          <div className="flex items-center gap-3">
                            <div className="h-7 w-7 rounded-[var(--radius-sm)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] flex items-center justify-center flex-shrink-0">
                              <Package className="h-3.5 w-3.5 text-[var(--neutral-400)]" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[var(--primary-800)]">
                                {item.productName ?? `Ürün #${item.productId}`}
                              </p>
                              <p className="text-[11px] text-[var(--neutral-500)]">
                                {item.quantity} × {formatPrice(item.unitPriceCents)}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-[var(--primary-800)]">{formatPrice(item.totalAmountCents)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payments */}
                  {!isPaymentsLoading && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)] mb-3">Ödemeler</p>
                      {!payments || payments.length === 0 ? (
                        <p className="text-sm text-[var(--neutral-500)]">Ödeme kaydı yok.</p>
                      ) : (
                        <div className="divide-y divide-[var(--neutral-100)]">
                          {payments.map((p) => (
                            <div key={p.id} className="flex items-center justify-between py-2.5">
                              <div>
                                <p className="text-sm font-semibold text-[var(--primary-800)]">{p.method}</p>
                                <p className="text-[11px] text-[var(--neutral-500)]">{formatDate(p.createdAt)}</p>
                              </div>
                              <p className="text-sm font-semibold text-[var(--primary-800)]">{formatPrice(p.amountCents)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      )}

      <ConflictResolutionModal
        isOpen={Boolean(conflictDetail)}
        detail={conflictDetail ?? undefined}
        onClose={() => setConflictDetail(null)}
        onRefresh={() => {
          setConflictDetail(null);
          void queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
          if (selectedOrderId) {
            void queryClient.invalidateQueries({ queryKey: ['admin-order-detail', selectedOrderId] });
            void queryClient.invalidateQueries({ queryKey: ['admin-order-payments', selectedOrderId] });
          }
        }}
      />
    </div>
  );
}
