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
  Wallet,
} from 'lucide-react';

import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { formatPrice } from '@/lib/format';

interface DashboardSummary {
  activeProducts: number;
  lowStockProducts: number;
  ordersTotal: number;
  ordersToday: number;
  revenueTodayCents: number;
}

interface DashboardReportsSummary {
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

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface OrderListResponse {
  data: Array<{
    id: number;
    source: string;
    statusKey: string;
  }>;
  meta: PaginationMeta;
}

interface ReturnRequestSummary {
  id: number;
}

interface PaginatedPayouts {
  data: Array<{
    id: number;
  }>;
  meta: PaginationMeta;
}

const resolveLabel = (value: string) => {
  const key = String(value ?? '').trim().toUpperCase();
  const labels: Record<string, string> = {
    POS: 'POS',
    WEB: 'Web',
    MOBILE: 'Mobil',
    API: 'API',
    CREATED: 'Oluşturuldu',
    NEW: 'Yeni',
    PAID: 'Ödendi',
    IN_PROGRESS: 'Hazırlanıyor',
    PREPARING: 'Hazırlanıyor',
    SHIPPED: 'Kargoda',
    DELIVERED: 'Teslim',
    COMPLETED: 'Tamamlandı',
    CANCELLED: 'İptal',
    RETURN_REQUESTED: 'İade talebi',
    RETURNED: 'İade',
    RETURN_REJECTED: 'İade red',
  };

  return labels[key] ?? value;
};

export default function AdminReportsPage() {
  const summaryQuery = useQuery<DashboardSummary>({
    queryKey: ['admin-reports-summary-kpi'],
    queryFn: async () => {
      const res = await api.get<DashboardSummary>('/dashboard/summary');
      return res.data;
    },
  });

  const reportsQuery = useQuery<DashboardReportsSummary>({
    queryKey: ['admin-reports-period-summary'],
    queryFn: async () => {
      const res = await api.get<DashboardReportsSummary>('/dashboard/reports/summary');
      return res.data;
    },
  });

  const ordersSampleQuery = useQuery<OrderListResponse>({
    queryKey: ['admin-reports-orders-sample'],
    queryFn: async () => {
      const res = await api.get<OrderListResponse>('/platform/orders?page=1&pageSize=80');
      return res.data;
    },
  });

  const pendingReturnsQuery = useQuery<ReturnRequestSummary[]>({
    queryKey: ['admin-reports-pending-returns'],
    queryFn: async () => {
      const res = await api.get<ReturnRequestSummary[]>('/platform/return-requests?status=PENDING');
      return res.data;
    },
  });

  const pendingPayoutsQuery = useQuery<PaginatedPayouts>({
    queryKey: ['admin-reports-pending-payouts'],
    queryFn: async () => {
      const res = await api.get<PaginatedPayouts>(
        '/platform/finance/payouts?status=pending&page=1&pageSize=20',
      );
      return res.data;
    },
  });

  const isPrimaryLoading = summaryQuery.isLoading || reportsQuery.isLoading;
  const isPrimaryError = summaryQuery.isError || reportsQuery.isError;

  const sourceDistribution = useMemo(() => {
    const orders = ordersSampleQuery.data?.data ?? [];
    const counts = orders.reduce<Record<string, number>>((acc, order) => {
      const key = String(order.source ?? 'UNKNOWN').toUpperCase();
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  }, [ordersSampleQuery.data?.data]);

  const statusDistribution = useMemo(() => {
    const orders = ordersSampleQuery.data?.data ?? [];
    const counts = orders.reduce<Record<string, number>>((acc, order) => {
      const key = String(order.statusKey ?? 'UNKNOWN').toUpperCase();
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  }, [ordersSampleQuery.data?.data]);

  const reports = reportsQuery.data;
  const summary = summaryQuery.data;
  const ordersSampleCount = ordersSampleQuery.data?.data.length ?? 0;
  const pendingReturnsCount = pendingReturnsQuery.data?.length ?? 0;
  const pendingPayoutCount = pendingPayoutsQuery.data?.meta.total ?? 0;

  const rangeLabel = reports
    ? `${new Date(reports.range.from).toLocaleDateString('tr-TR')} - ${new Date(
        reports.range.to,
      ).toLocaleDateString('tr-TR')}`
    : '-';

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-gradient-to-br from-[#F7F1E5] via-white to-[#ECF6F3] px-6 py-6 shadow-[0_20px_60px_rgba(26,60,52,0.08)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              Raporlar
            </p>
            <h1 className="mt-2 text-3xl font-serif text-[var(--primary-800)] md:text-4xl">
              Operasyon raporları
            </h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Satış, ürün ve operasyon metriklerini tek ekranda izleyin.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--primary-800)]/20 bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)]">
            Dönem: {rangeLabel}
          </div>
        </div>
      </section>

      {isPrimaryLoading ? (
        <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-10">
          <Spinner label="Rapor verileri yükleniyor..." />
        </section>
      ) : null}

      {isPrimaryError ? (
        <section className="rounded-[var(--radius-xl)] border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          Rapor verileri alınamadı. Oturumu yenileyip tekrar deneyin.
        </section>
      ) : null}

      {!isPrimaryLoading && !isPrimaryError && reports && summary ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                30 gün ciro
              </p>
              <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
                {formatPrice(reports.revenueCents / 100)}
              </p>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                30 gün sipariş
              </p>
              <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">{reports.ordersCount}</p>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Ortalama sepet
              </p>
              <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
                {formatPrice(reports.averageOrderValueCents / 100)}
              </p>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Bugün sipariş
              </p>
              <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">{summary.ordersToday}</p>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Bugün ciro
              </p>
              <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
                {formatPrice(summary.revenueTodayCents / 100)}
              </p>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Düşük stok
              </p>
              <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
                {summary.lowStockProducts}
              </p>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                    Satış
                  </p>
                  <h2 className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
                    En çok satan ürünler
                  </h2>
                </div>
                <BarChart3 className="h-5 w-5 text-[var(--primary-800)]/70" />
              </div>

              {reports.topProducts.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--neutral-600)]">Bu dönemde ürün satışı yok.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-[10px] uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                      <tr>
                        <th className="pb-3 pr-4">Ürün</th>
                        <th className="pb-3 pr-4">Adet</th>
                        <th className="pb-3">Ciro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.topProducts.slice(0, 10).map((product) => (
                        <tr key={product.productId} className="border-t border-[var(--neutral-200)]">
                          <td className="py-3 pr-4 font-semibold text-[var(--primary-800)]">
                            {product.name}
                          </td>
                          <td className="py-3 pr-4 text-[var(--neutral-600)]">{product.quantity}</td>
                          <td className="py-3 text-[var(--primary-800)]">
                            {formatPrice(product.revenueCents / 100)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                    Kaynak Dağılımı
                  </p>
                  <ClipboardList className="h-5 w-5 text-[var(--primary-800)]/70" />
                </div>
                <p className="mt-2 text-xs text-[var(--neutral-500)]">
                  Son {ordersSampleCount} sipariş örneklemi
                </p>
                <div className="mt-4 space-y-3">
                  {sourceDistribution.length === 0 ? (
                    <p className="text-sm text-[var(--neutral-600)]">Veri yok.</p>
                  ) : (
                    sourceDistribution.map((entry) => {
                      const percent =
                        ordersSampleCount > 0
                          ? Math.round((entry.count / ordersSampleCount) * 100)
                          : 0;
                      return (
                        <div key={entry.key}>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[var(--primary-800)]">
                              {resolveLabel(entry.key)}
                            </span>
                            <span className="text-[var(--neutral-600)]">
                              {entry.count} ({percent}%)
                            </span>
                          </div>
                          <div className="mt-1 h-2 rounded-full bg-[var(--neutral-100)]">
                            <div
                              className="h-2 rounded-full bg-[var(--primary-800)]"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                    Durum Dağılımı
                  </p>
                  <Package className="h-5 w-5 text-[var(--primary-800)]/70" />
                </div>
                <div className="mt-4 space-y-2">
                  {statusDistribution.length === 0 ? (
                    <p className="text-sm text-[var(--neutral-600)]">Veri yok.</p>
                  ) : (
                    statusDistribution.slice(0, 6).map((entry) => (
                      <div
                        key={entry.key}
                        className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-2 text-xs"
                      >
                        <span className="font-semibold text-[var(--primary-800)]">
                          {resolveLabel(entry.key)}
                        </span>
                        <span className="text-[var(--neutral-600)]">{entry.count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
              <RefreshCcw className="h-5 w-5 text-[var(--primary-800)]/70" />
              <h3 className="mt-4 text-xl font-serif text-[var(--primary-800)]">Bekleyen iade</h3>
              <p className="mt-2 text-3xl font-serif text-[var(--primary-800)]">{pendingReturnsCount}</p>
              <Link
                href="/admin/orders"
                className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)]"
              >
                Siparişlere git <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
              <Wallet className="h-5 w-5 text-[var(--primary-800)]/70" />
              <h3 className="mt-4 text-xl font-serif text-[var(--primary-800)]">Bekleyen payout</h3>
              <p className="mt-2 text-3xl font-serif text-[var(--primary-800)]">{pendingPayoutCount}</p>
              <Link
                href="/admin/finance/payouts"
                className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)]"
              >
                Payout ekranı <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
              <CreditCard className="h-5 w-5 text-[var(--primary-800)]/70" />
              <h3 className="mt-4 text-xl font-serif text-[var(--primary-800)]">Ödeme debug</h3>
              <p className="mt-2 text-sm text-[var(--neutral-600)]">
                Webhook event akışı ve manuel işleme sonuçlarını inceleyin.
              </p>
              <Link
                href="/admin/payments/webhooks"
                className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)]"
              >
                Webhook listesi <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
