'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowUpRight,
  ClipboardList,
  CreditCard,
  Package,
  RefreshCcw,
  ShoppingBag,
  TrendingUp,
  Users,
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

interface CustomerListResponse {
  data: Array<{
    id: number;
    name: string;
    phone: string;
    balance: number;
  }>;
  meta: PaginationMeta;
}

interface OrderListResponse {
  data: Array<{
    id: number;
    customerId: number;
    totalAmountCents: number;
    statusKey: string;
    source: string;
    createdByUserId: number;
    createdAt: string;
  }>;
  meta: PaginationMeta;
}

interface ReturnRequestSummary {
  id: number;
  orderId: number;
  customerId: number;
  status: string;
  reason?: string | null;
  requestedAt: string;
}

const quickLinks = [
  { label: 'Sipariş takibi', href: '/admin/orders' },
  { label: 'Ürün yönetimi', href: '/admin/products' },
  { label: 'Müşteri paneli', href: '/admin/customers' },
  { label: 'Ödeme operasyonu', href: '/admin/payments' },
  { label: 'Finans raporları', href: '/admin/finance' },
  { label: 'SMTP & SMS', href: '/admin/smtp' },
];

export default function AdminOverviewPage() {
  const summaryQuery = useQuery<DashboardSummary>({
    queryKey: ['admin-dashboard-summary'],
    queryFn: async () => {
      const res = await api.get<DashboardSummary>('/dashboard/summary');
      return res.data;
    },
  });

  const reportsQuery = useQuery<DashboardReportsSummary>({
    queryKey: ['admin-dashboard-reports-summary'],
    queryFn: async () => {
      const res = await api.get<DashboardReportsSummary>('/dashboard/reports/summary');
      return res.data;
    },
  });

  const customersQuery = useQuery<CustomerListResponse>({
    queryKey: ['admin-dashboard-customers-total'],
    queryFn: async () => {
      const res = await api.get<CustomerListResponse>('/customers?page=1&pageSize=1');
      return res.data;
    },
  });

  const pendingReturnsQuery = useQuery<ReturnRequestSummary[]>({
    queryKey: ['admin-dashboard-pending-returns'],
    queryFn: async () => {
      const res = await api.get<ReturnRequestSummary[]>('/platform/return-requests?status=PENDING');
      return res.data;
    },
  });

  const latestOrdersQuery = useQuery<OrderListResponse>({
    queryKey: ['admin-dashboard-latest-orders'],
    queryFn: async () => {
      const res = await api.get<OrderListResponse>('/platform/orders?page=1&pageSize=6');
      return res.data;
    },
  });

  const isLoading =
    summaryQuery.isLoading ||
    reportsQuery.isLoading ||
    customersQuery.isLoading ||
    pendingReturnsQuery.isLoading ||
    latestOrdersQuery.isLoading;

  const isError =
    summaryQuery.isError ||
    reportsQuery.isError ||
    customersQuery.isError ||
    pendingReturnsQuery.isError ||
    latestOrdersQuery.isError;

  const statCards = useMemo(() => {
    const summary = summaryQuery.data;
    const reports = reportsQuery.data;
    const customerTotal = customersQuery.data?.meta?.total ?? 0;
    const pendingReturns = pendingReturnsQuery.data?.length ?? 0;

    return [
      {
        title: 'Bugün sipariş',
        value: summary ? String(summary.ordersToday) : '-',
        note: 'Son 24 saat',
        icon: ClipboardList,
      },
      {
        title: 'Bugün ciro',
        value: summary ? formatPrice(summary.revenueTodayCents / 100) : '-',
        note: 'Tahsilat',
        icon: CreditCard,
      },
      {
        title: 'Toplam sipariş',
        value: summary ? String(summary.ordersTotal) : '-',
        note: 'Tüm zamanlar',
        icon: ShoppingBag,
      },
      {
        title: 'Aktif ürün',
        value: summary ? String(summary.activeProducts) : '-',
        note: 'Yayında',
        icon: Package,
      },
      {
        title: 'Düşük stok',
        value: summary ? String(summary.lowStockProducts) : '-',
        note: '5 ve altı',
        icon: AlertTriangle,
      },
      {
        title: 'Müşteri havuzu',
        value: String(customerTotal),
        note: 'Kayıtlı müşteri',
        icon: Users,
      },
      {
        title: 'Bekleyen iade',
        value: String(pendingReturns),
        note: 'Onay bekliyor',
        icon: RefreshCcw,
      },
      {
        title: '30 gün ciro',
        value: reports ? formatPrice(reports.revenueCents / 100) : '-',
        note: 'Trend özeti',
        icon: TrendingUp,
      },
    ];
  }, [
    summaryQuery.data,
    reportsQuery.data,
    customersQuery.data?.meta?.total,
    pendingReturnsQuery.data,
  ]);

  const latestOrders = latestOrdersQuery.data?.data ?? [];
  const topProducts = reportsQuery.data?.topProducts ?? [];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--primary-800)]/10 bg-gradient-to-br from-[#F7F1E5] via-white to-[#ECF6F3] px-6 py-6 shadow-[0_24px_70px_rgba(26,60,52,0.1)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              Yönetim Merkezi
            </p>
            <h1 className="mt-2 text-3xl font-serif text-[var(--primary-800)] md:text-4xl">
              Admin Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--neutral-600)]">
              Sipariş, stok, müşteri ve iade operasyonunu canlı metriklerle tek yerden izleyin.
            </p>
          </div>
          <Link
            href="/admin/reports"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--primary-800)]/20 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)]"
          >
            Raporlar <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {isLoading ? (
        <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-10">
          <Spinner label="Dashboard yükleniyor..." />
        </section>
      ) : null}

      {isError ? (
        <section className="rounded-[var(--radius-xl)] border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          Dashboard verileri yüklenemedi. Oturumu yenileyip tekrar deneyin.
        </section>
      ) : null}

      {!isLoading && !isError ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5 shadow-[0_10px_30px_rgba(26,60,52,0.06)]"
                >
                  <div className="flex items-center justify-between">
                    <Icon className="h-5 w-5 text-[var(--primary-800)]/75" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                      {item.note}
                    </span>
                  </div>
                  <p className="mt-4 text-2xl font-serif text-[var(--primary-800)]">{item.value}</p>
                  <p className="mt-1 text-sm text-[var(--neutral-600)]">{item.title}</p>
                </div>
              );
            })}
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                    Canlı Akış
                  </p>
                  <h2 className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
                    Son siparişler
                  </h2>
                </div>
                <Link
                  href="/admin/orders"
                  className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)]/80 hover:text-[var(--primary-800)]"
                >
                  Tümünü aç
                </Link>
              </div>

              {latestOrders.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--neutral-600)]">Henüz sipariş kaydı yok.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-[10px] uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                      <tr>
                        <th className="pb-3 pr-4">Sipariş</th>
                        <th className="pb-3 pr-4">Durum</th>
                        <th className="pb-3 pr-4">Kaynak</th>
                        <th className="pb-3 pr-4">Tutar</th>
                        <th className="pb-3">Tarih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestOrders.map((order) => (
                        <tr key={order.id} className="border-t border-[var(--neutral-200)]">
                          <td className="py-3 pr-4 font-semibold text-[var(--primary-800)]">#{order.id}</td>
                          <td className="py-3 pr-4 text-[var(--neutral-600)]">{order.statusKey}</td>
                          <td className="py-3 pr-4 text-[var(--neutral-600)]">{order.source}</td>
                          <td className="py-3 pr-4 text-[var(--primary-800)]">
                            {formatPrice(order.totalAmountCents / 100)}
                          </td>
                          <td className="py-3 text-[var(--neutral-600)]">
                            {new Date(order.createdAt).toLocaleString('tr-TR')}
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
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                  Ürün Performansı
                </p>
                <h2 className="mt-2 text-2xl font-serif text-[var(--primary-800)]">Top ürünler</h2>
                {topProducts.length === 0 ? (
                  <p className="mt-3 text-sm text-[var(--neutral-600)]">Veri bulunamadı.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {topProducts.slice(0, 5).map((product) => (
                      <div
                        key={product.productId}
                        className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-3"
                      >
                        <p className="text-sm font-semibold text-[var(--primary-800)]">{product.name}</p>
                        <p className="mt-1 text-xs text-[var(--neutral-600)]">
                          {product.quantity} adet · {formatPrice(product.revenueCents / 100)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                  Hızlı Erişim
                </p>
                <h2 className="mt-2 text-2xl font-serif text-[var(--primary-800)]">Kısayollar</h2>
                <div className="mt-4 grid gap-3">
                  {quickLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)]"
                    >
                      {link.label}
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
