'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  BarChart3,
  ClipboardList,
  CreditCard,
  Package,
  RefreshCcw,
  TrendingUp,
  Wallet,
  AlertTriangle,
  ShoppingBag,
} from 'lucide-react';

import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { formatPrice } from '@/lib/format';

interface DashboardSummary {
  activeProducts: number; lowStockProducts: number;
  ordersTotal: number; ordersToday: number; revenueTodayCents: number;
}
interface DashboardReportsSummary {
  range: { from: string; to: string; days: number };
  ordersCount: number; revenueCents: number; averageOrderValueCents: number;
  topProducts: Array<{ productId: number; name: string; quantity: number; revenueCents: number }>;
}
interface OrderListResponse {
  data: Array<{ id: number; source: string; statusKey: string }>;
  meta: { total: number };
}
interface ReturnRequestSummary { id: number; }
interface PaginatedPayouts { data: Array<{ id: number }>; meta: { total: number }; }

const statusLabels: Record<string, string> = {
  CREATED: 'Oluşturuldu', NEW: 'Yeni', PAID: 'Ödendi',
  IN_PROGRESS: 'Hazırlanıyor', PREPARING: 'Hazırlanıyor',
  SHIPPED: 'Kargoda', DELIVERED: 'Teslim', COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal', RETURN_REQUESTED: 'İade Talebi',
  RETURNED: 'İade', RETURN_REJECTED: 'İade Ret',
  POS: 'POS', WEB: 'Web', MOBILE: 'Mobil', API: 'API',
};
const resolveLabel = (v: string) => statusLabels[v.toUpperCase()] ?? v;

const barColors = ['bg-[var(--primary-800)]', 'bg-amber-500', 'bg-violet-500', 'bg-blue-500', 'bg-red-400'];

export default function AdminReportsPage() {
  const summaryQ = useQuery<DashboardSummary>({
    queryKey: ['admin-reports-summary-kpi'],
    queryFn: async () => (await api.get<DashboardSummary>('/dashboard/summary')).data,
  });
  const reportsQ = useQuery<DashboardReportsSummary>({
    queryKey: ['admin-reports-period-summary'],
    queryFn: async () => (await api.get<DashboardReportsSummary>('/dashboard/reports/summary')).data,
  });
  const ordersQ = useQuery<OrderListResponse>({
    queryKey: ['admin-reports-orders-sample'],
    queryFn: async () => (await api.get<OrderListResponse>('/platform/orders?page=1&pageSize=80')).data,
  });
  const returnsQ = useQuery<ReturnRequestSummary[]>({
    queryKey: ['admin-reports-pending-returns'],
    queryFn: async () => (await api.get<ReturnRequestSummary[]>('/platform/return-requests?status=PENDING')).data,
  });
  const payoutsQ = useQuery<PaginatedPayouts>({
    queryKey: ['admin-reports-pending-payouts'],
    queryFn: async () => (await api.get<PaginatedPayouts>('/platform/finance/payouts?status=pending&page=1&pageSize=20')).data,
  });

  const isLoading = summaryQ.isLoading || reportsQ.isLoading;
  const isError = summaryQ.isError || reportsQ.isError;
  const reports = reportsQ.data;
  const summary = summaryQ.data;
  const ordersSample = ordersQ.data?.data ?? [];
  const pendingReturns = returnsQ.data?.length ?? 0;
  const pendingPayouts = payoutsQ.data?.meta?.total ?? 0;

  const rangeLabel = reports
    ? `${new Date(reports.range.from).toLocaleDateString('tr-TR')} – ${new Date(reports.range.to).toLocaleDateString('tr-TR')}`
    : '—';

  const sourceDistribution = useMemo(() => {
    const counts = ordersSample.reduce<Record<string, number>>((acc, o) => {
      const k = (o.source ?? 'UNKNOWN').toUpperCase(); acc[k] = (acc[k] ?? 0) + 1; return acc;
    }, {});
    return Object.entries(counts).map(([k, c]) => ({ key: k, count: c })).sort((a, b) => b.count - a.count);
  }, [ordersSample]);

  const statusDistribution = useMemo(() => {
    const counts = ordersSample.reduce<Record<string, number>>((acc, o) => {
      const k = (o.statusKey ?? 'UNKNOWN').toUpperCase(); acc[k] = (acc[k] ?? 0) + 1; return acc;
    }, {});
    return Object.entries(counts).map(([k, c]) => ({ key: k, count: c })).sort((a, b) => b.count - a.count);
  }, [ordersSample]);

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">Operasyon Raporları</h1>
          <p className="mt-1 text-sm text-[var(--neutral-600)]">Satış, ürün ve operasyon metriklerini izleyin.</p>
        </div>
        <span className="text-xs font-medium text-[var(--neutral-500)]">📅 {rangeLabel}</span>
      </div>

      {isLoading && <Spinner label="Rapor verileri yükleniyor..." />}
      {isError && (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" /> Rapor verileri alınamadı.
        </div>
      )}

      {!isLoading && !isError && reports && summary && (
        <>
          {/* ── KPIs ── */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: '30 Gün Ciro', value: formatPrice(reports.revenueCents), icon: TrendingUp },
              { label: '30 Gün Sipariş', value: String(reports.ordersCount), icon: ShoppingBag },
              { label: 'Ort. Sepet', value: formatPrice(reports.averageOrderValueCents), icon: BarChart3 },
              { label: 'Bugün Sipariş', value: String(summary.ordersToday), icon: ClipboardList },
              { label: 'Bugün Ciro', value: formatPrice(summary.revenueTodayCents), icon: CreditCard },
              { label: 'Düşük Stok', value: String(summary.lowStockProducts), icon: Package },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">{label}</p>
                <div className="mt-1 flex items-end gap-2">
                  <span className="text-xl font-semibold text-[var(--primary-800)]">{value}</span>
                  <Icon className="mb-0.5 h-4 w-4 text-[var(--neutral-400)]" />
                </div>
              </div>
            ))}
          </div>

          {/* ── Divider ── */}
          <div className="border-t border-[var(--neutral-200)]" />

          {/* ── Top Products + Distributions ── */}
          <div className="grid gap-10 xl:grid-cols-[1fr_320px]">

            {/* Top Products Table */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)] mb-4">
                En Çok Satan Ürünler — Son 30 Gün
              </p>
              {reports.topProducts.length === 0 ? (
                <p className="text-sm text-[var(--neutral-500)]">Bu dönemde ürün satışı yok.</p>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--neutral-200)]">
                      {['Sıra', 'Ürün', 'Adet', 'Ciro'].map((h) => (
                        <th key={h} className={`pb-3 pr-6 text-left text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)] ${h === 'Ciro' ? 'text-right' : ''}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--neutral-100)]">
                    {reports.topProducts.slice(0, 10).map((p, i) => (
                      <tr key={p.productId} className="hover:bg-[var(--neutral-50)] transition-colors">
                        <td className="py-3 pr-6 text-[13px] font-bold text-[var(--neutral-400)]">{i + 1}</td>
                        <td className="py-3 pr-6 font-medium text-[var(--primary-800)]">{p.name}</td>
                        <td className="py-3 pr-6 text-[var(--neutral-600)]">{p.quantity}</td>
                        <td className="py-3 text-right font-semibold text-[var(--primary-800)]">{formatPrice(p.revenueCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              {/* Source Distribution */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)] mb-4">
                  Kaynak Dağılımı
                  <span className="ml-2 normal-case tracking-normal font-normal text-[var(--neutral-400)]">({ordersSample.length} örnek)</span>
                </p>
                {sourceDistribution.length === 0
                  ? <p className="text-sm text-[var(--neutral-500)]">Veri yok.</p>
                  : (
                    <div className="space-y-3">
                      {sourceDistribution.map((entry, i) => {
                        const pct = ordersSample.length > 0 ? Math.round((entry.count / ordersSample.length) * 100) : 0;
                        return (
                          <div key={entry.key}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-medium text-[var(--neutral-700)]">{resolveLabel(entry.key)}</span>
                              <span className="text-[var(--neutral-500)]">{entry.count} ({pct}%)</span>
                            </div>
                            <div className="h-1 rounded-full bg-[var(--neutral-100)]">
                              <div className={`h-full rounded-full ${barColors[i % barColors.length]}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                }
              </div>

              {/* Status Distribution */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)] mb-4">Durum Dağılımı</p>
                {statusDistribution.length === 0
                  ? <p className="text-sm text-[var(--neutral-500)]">Veri yok.</p>
                  : (
                    <div className="divide-y divide-[var(--neutral-100)]">
                      {statusDistribution.slice(0, 7).map((entry) => (
                        <div key={entry.key} className="flex items-center justify-between py-2 text-sm">
                          <span className="text-[var(--neutral-700)]">{resolveLabel(entry.key)}</span>
                          <span className="font-semibold text-[var(--primary-800)]">{entry.count}</span>
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="border-t border-[var(--neutral-200)]" />

          {/* ── Operation Links ── */}
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: RefreshCcw, label: 'Bekleyen İade', value: pendingReturns, href: '/admin/orders', link: 'Siparişlere Git' },
              { icon: Wallet, label: 'Bekleyen Payout', value: pendingPayouts, href: '/admin/finance/payouts', link: 'Payout Ekranı' },
              { icon: CreditCard, label: 'Ödeme Debug', value: null, href: '/admin/payments/webhooks', link: 'Webhook Listesi' },
            ].map(({ icon: Icon, label, value, href, link }) => (
              <div key={label}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4 text-[var(--neutral-500)]" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">{label}</p>
                </div>
                {value !== null && (
                  <p className="text-3xl font-semibold text-[var(--primary-800)] mb-2">{value}</p>
                )}
                <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary-800)] hover:underline underline-offset-2">
                  {link} <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
