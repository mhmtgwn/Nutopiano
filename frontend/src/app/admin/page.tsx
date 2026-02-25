'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
import RiskScoreBadge from '@/components/common/RiskScoreBadge';
import api from '@/services/api';
import { formatPrice } from '@/lib/format';
import { getPanelLabelByRole } from '@/lib/role-routing';
import { useAppSelector } from '@/store';

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

interface OutboxMetrics {
  totalCount: number;
  processedCount: number;
  pendingCount: number;
  retryCount: number;
  failedCount: number;
  deadLetterCount: number;
}

interface AuditLogRow {
  id: number;
  actionType: string;
}

interface PaginatedAuditLogs {
  data: AuditLogRow[];
}

type QuickLink = {
  label: string;
  href: string;
};

type SetupCta = {
  label: string;
  href: string;
};

const buildQuickLinks = (basePath: string, isSuperAdmin: boolean): QuickLink[] => {
  if (isSuperAdmin) {
    return [
      { label: 'Kullanıcı yönetimi', href: `${basePath}/users` },
      { label: 'Satıcı operasyonu', href: `${basePath}/sellers` },
      { label: 'Başvuru havuzu', href: `${basePath}/sellers/applications` },
      { label: 'Plan yönetimi', href: `${basePath}/plans` },
      { label: 'Finans raporları', href: `${basePath}/finance` },
      { label: 'SMTP & SMS', href: `${basePath}/smtp` },
    ];
  }

  return [
    { label: 'Sipariş takibi', href: `${basePath}/orders` },
    { label: 'Ürün yönetimi', href: `${basePath}/products` },
    { label: 'Müşteri paneli', href: `${basePath}/customers` },
    { label: 'Ödeme operasyonu', href: `${basePath}/payments` },
    { label: 'Finans raporları', href: `${basePath}/finance` },
    { label: 'Hizmet operasyonu', href: `${basePath}/services` },
  ];
};

const buildSetupCtas = (basePath: string, isSuperAdmin: boolean): SetupCta[] => {
  if (isSuperAdmin) {
    return [
      { label: 'Kullanıcı ekle', href: `${basePath}/users` },
      { label: 'Satıcıları yönet', href: `${basePath}/sellers` },
      { label: 'Planları hazırla', href: `${basePath}/plans` },
    ];
  }

  return [
    { label: 'İlk ürünü ekle', href: `${basePath}/products` },
    { label: 'Kategori oluştur', href: `${basePath}/categories` },
    { label: 'Siparişleri izle', href: `${basePath}/orders` },
  ];
};

export default function AdminOverviewPage() {
  const pathname = usePathname();
  const user = useAppSelector((state) => state.user.user);
  const basePath = pathname.startsWith('/platform') ? '/platform' : '/admin';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const panelLabel = getPanelLabelByRole(user?.role);
  const quickLinks = useMemo(
    () => buildQuickLinks(basePath, isSuperAdmin),
    [basePath, isSuperAdmin],
  );
  const setupCtas = useMemo(
    () => buildSetupCtas(basePath, isSuperAdmin),
    [basePath, isSuperAdmin],
  );
  const reportHref = `${basePath}/reports`;
  const ordersHref = `${basePath}/orders`;
  const heroTitle = isSuperAdmin ? 'Platform Dashboard' : 'Admin Dashboard';
  const heroDescription = isSuperAdmin
    ? 'Platform genelinde satıcı, plan, kullanıcı ve sipariş operasyonunu tek merkezden izleyin.'
    : 'İşletme tarafında sipariş, stok, müşteri ve iade operasyonunu canlı metriklerle izleyin.';

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

  const outboxMetricsQuery = useQuery<OutboxMetrics>({
    queryKey: ['admin-dashboard-outbox-metrics'],
    queryFn: async () => {
      const res = await api.get<OutboxMetrics>('/platform/outbox/metrics');
      return res.data;
    },
  });

  const auditRiskQuery = useQuery<PaginatedAuditLogs>({
    queryKey: ['admin-dashboard-risk-audit'],
    queryFn: async () => {
      const res = await api.get<PaginatedAuditLogs>('/platform/audit/logs?page=1&pageSize=20');
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
        value: summary ? formatPrice(summary.revenueTodayCents) : '-',
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
        value: reports ? formatPrice(reports.revenueCents) : '-',
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
  const summary = summaryQuery.data;
  const showSetupGuide = Boolean(
    summary && summary.ordersTotal === 0 && summary.activeProducts === 0,
  );

  const riskScore = useMemo(() => {
    const metrics = outboxMetricsQuery.data;
    const auditRows = auditRiskQuery.data?.data ?? [];
    if (!metrics) return 0;

    const total = Math.max(metrics.totalCount, 1);
    const failedRatio =
      ((metrics.failedCount + metrics.deadLetterCount) / total) * 100;
    const retryRatio = (metrics.retryCount / total) * 100;
    const overrideCount = auditRows.filter((row) => {
      const action = String(row.actionType ?? '').toUpperCase();
      return action.includes('FORCE') || action.includes('OVERRIDE');
    }).length;

    const score = failedRatio * 0.6 + retryRatio * 0.2 + overrideCount * 2;
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [auditRiskQuery.data?.data, outboxMetricsQuery.data]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-[var(--primary-800)]/15 bg-gradient-to-br from-[#0F2420] via-[#1A3C34] to-[#245244] px-6 py-7 shadow-[0_20px_50px_rgba(15,36,32,0.25)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50">
              {panelLabel}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">
              {heroTitle}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/65">
              {heroDescription}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RiskScoreBadge score={riskScore} label="Risk" />
            <Link
              href={`${basePath}/risk-control`}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/90 transition hover:bg-white/15 backdrop-blur-sm"
            >
              Risk Hub <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              href={reportHref}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/90 transition hover:bg-white/15 backdrop-blur-sm"
            >
              Raporlar <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
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
          {showSetupGuide ? (
            <section className="rounded-[var(--radius-xl)] border border-[#CFAE74] bg-[#FFF9EE] px-6 py-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7A5A24]">
                İlk Kurulum
              </p>
              <h2 className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
                Dashboard için başlangıç adımları
              </h2>
              <p className="mt-2 text-sm text-[var(--neutral-700)]">
                Henüz sipariş ve ürün verisi oluşmamış. Aşağıdaki adımlarla paneli aktive edin.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {setupCtas.map((cta) => (
                  <Link
                    key={cta.href}
                    href={cta.href}
                    className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[#D9C08F] bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] hover:bg-[#FFFCF4]"
                  >
                    {cta.label}
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((item, index) => {
              const Icon = item.icon;
              const accentColors = [
                'border-l-blue-500',
                'border-l-emerald-500',
                'border-l-violet-500',
                'border-l-amber-500',
                'border-l-red-500',
                'border-l-cyan-500',
                'border-l-orange-500',
                'border-l-teal-500',
              ];
              const accentColor = accentColors[index % accentColors.length];
              return (
                <div
                  key={item.title}
                  className={`rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-sm border-l-4 ${accentColor} hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-center justify-between">
                    <div className="h-9 w-9 rounded-lg bg-gray-50 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-gray-500" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                      {item.note}
                    </span>
                  </div>
                  <p className="mt-3 text-2xl font-bold text-gray-800 tracking-tight">{item.value}</p>
                  <p className="mt-1 text-[12px] font-medium text-gray-500">{item.title}</p>
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
                  href={ordersHref}
                  className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)]/80 hover:text-[var(--primary-800)]"
                >
                  Tümünü aç
                </Link>
              </div>

              {latestOrders.length === 0 ? (
                <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-4">
                  <p className="text-sm text-[var(--neutral-600)]">Henüz sipariş kaydı yok.</p>
                  <Link
                    href={isSuperAdmin ? `${basePath}/sellers` : `${basePath}/products`}
                    className="mt-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] hover:underline"
                  >
                    {isSuperAdmin ? 'Satıcıları kontrol et' : 'Ürünleri hazırlamaya başla'}
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
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
                            {formatPrice(order.totalAmountCents)}
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
                  <div className="mt-3 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-4">
                    <p className="text-sm text-[var(--neutral-600)]">Veri bulunamadı.</p>
                    <Link
                      href={isSuperAdmin ? `${basePath}/sellers` : `${basePath}/products`}
                      className="mt-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] hover:underline"
                    >
                      {isSuperAdmin ? 'Satıcı aktivitelerini aç' : 'Ürün kataloğunu düzenle'}
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
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
