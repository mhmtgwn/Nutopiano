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
  Activity,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  Zap,
} from 'lucide-react';

import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { formatPrice } from '@/lib/format';
import { useAppSelector } from '@/store';

/* ─── Types ─────────────────────────────────────────────── */

interface DashboardSummary {
  activeProducts: number;
  lowStockProducts: number;
  ordersTotal: number;
  ordersToday: number;
  revenueTodayCents: number;
}

interface DashboardReportsSummary {
  range: { from: string; to: string; days: number };
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

interface CustomerListResponse {
  data: Array<{ id: number; name: string; phone: string }>;
  meta: { total: number };
}

interface OrderListResponse {
  data: Array<{
    id: number;
    customerId: number;
    totalAmountCents: number;
    statusKey: string;
    source: string;
    createdAt: string;
  }>;
  meta: { total: number };
}

interface ReturnRequest { id: number; orderId: number; status: string; requestedAt: string; }
interface OutboxMetrics { totalCount: number; failedCount: number; deadLetterCount: number; retryCount: number; pendingCount: number; }
interface AuditLogRow { id: number; actionType: string; }

/* ─── Helpers ─────────────────────────────────────────────── */

const statusMeta: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  PENDING: { label: 'Bekliyor', color: 'bg-amber-100 text-amber-700', icon: Clock },
  CONFIRMED: { label: 'Onaylandı', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  CANCELLED: { label: 'İptal', color: 'bg-red-100 text-red-700', icon: XCircle },
  COMPLETED: { label: 'Tamamlandı', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  PROCESSING: { label: 'İşleniyor', color: 'bg-violet-100 text-violet-700', icon: Activity },
};

function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta[status?.toUpperCase()] ?? { label: status, color: 'bg-gray-100 text-gray-600', icon: Clock };
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.color}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const map: Record<string, string> = { POS: 'POS', ONLINE: 'Online', MANUAL: 'Manuel' };
  return (
    <span className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600">
      {map[source] ?? source}
    </span>
  );
}

/* ─── KPI Card ─────────────────────────────────────────────── */

interface StatCardProps {
  title: string;
  value: string;
  note: string;
  icon: React.ComponentType<{ className?: string }>;
  accentClass: string; // Tailwind border-l color class
  trend?: 'up' | 'down' | 'neutral';
}

function StatCard({ title, value, note, icon: Icon, accentClass, trend }: StatCardProps) {
  return (
    <div className={`relative bg-white rounded-xl border border-gray-200 px-5 py-5 shadow-sm hover:shadow-md transition-shadow overflow-hidden border-l-4 ${accentClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 tracking-tight truncate">{value}</p>
          <p className="mt-1 text-[11px] text-gray-400">{note}</p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
          <Icon className="h-5 w-5 text-gray-500" />
        </div>
      </div>
    </div>
  );
}

/* ─── Section Header ─────────────────────────────────────────── */

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[12px] text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ─── Quick Link Card ─────────────────────────────────────────── */

function QuickLinkCard({ label, href, icon: Icon, description }: { label: string; href: string; icon: React.ComponentType<{ className?: string }>; description: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
    >
      <div className="h-10 w-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-100 transition-colors">
        <Icon className="h-5 w-5 text-gray-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-gray-800 leading-none">{label}</p>
        <p className="mt-1 text-[11px] text-gray-500 truncate">{description}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 text-gray-400 flex-shrink-0 group-hover:text-gray-600 transition-colors" />
    </Link>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */

export default function AdminOverviewPage() {
  const pathname = usePathname();
  const user = useAppSelector((s) => s.user.user);
  const basePath = pathname.startsWith('/platform') ? '/platform' : '/admin';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  /* Queries */
  const summaryQ = useQuery<DashboardSummary>({
    queryKey: ['admin-dash-summary'],
    queryFn: async () => (await api.get<DashboardSummary>('/dashboard/summary')).data,
  });

  const reportsQ = useQuery<DashboardReportsSummary>({
    queryKey: ['admin-dash-reports'],
    queryFn: async () => (await api.get<DashboardReportsSummary>('/dashboard/reports/summary')).data,
  });

  const customersQ = useQuery<CustomerListResponse>({
    queryKey: ['admin-dash-customers'],
    queryFn: async () => (await api.get<CustomerListResponse>('/customers?page=1&pageSize=1')).data,
  });

  const returnsQ = useQuery<ReturnRequest[]>({
    queryKey: ['admin-dash-returns'],
    queryFn: async () => (await api.get<ReturnRequest[]>('/platform/return-requests?status=PENDING')).data,
  });

  const ordersQ = useQuery<OrderListResponse>({
    queryKey: ['admin-dash-orders'],
    queryFn: async () => (await api.get<OrderListResponse>('/platform/orders?page=1&pageSize=8')).data,
  });

  const outboxQ = useQuery<OutboxMetrics>({
    queryKey: ['admin-dash-outbox'],
    queryFn: async () => (await api.get<OutboxMetrics>('/platform/outbox/metrics')).data,
  });

  const auditQ = useQuery<{ data: AuditLogRow[] }>({
    queryKey: ['admin-dash-audit'],
    queryFn: async () => (await api.get<{ data: AuditLogRow[] }>('/platform/audit/logs?page=1&pageSize=20')).data,
  });

  const isLoading = summaryQ.isLoading || reportsQ.isLoading || ordersQ.isLoading || customersQ.isLoading;
  const isError = summaryQ.isError || reportsQ.isError || ordersQ.isError || customersQ.isError;

  const summary = summaryQ.data;
  const reports = reportsQ.data;
  const orders = ordersQ.data?.data ?? [];
  const topProducts = reports?.topProducts ?? [];
  const customerTotal = customersQ.data?.meta?.total ?? 0;
  const pendingReturns = returnsQ.data?.length ?? 0;

  /* Risk Score */
  const riskScore = useMemo(() => {
    const m = outboxQ.data;
    if (!m) return 0;
    const total = Math.max(m.totalCount, 1);
    const failed = ((m.failedCount + m.deadLetterCount) / total) * 100;
    const retry = (m.retryCount / total) * 100;
    const overrides = (auditQ.data?.data ?? []).filter((r) => {
      const a = String(r.actionType ?? '').toUpperCase();
      return a.includes('FORCE') || a.includes('OVERRIDE');
    }).length;
    return Math.min(100, Math.round(failed * 0.6 + retry * 0.2 + overrides * 2));
  }, [outboxQ.data, auditQ.data]);

  /* KPI Cards */
  const statCards: StatCardProps[] = useMemo(() => [
    {
      title: 'Bugün Sipariş',
      value: summary ? String(summary.ordersToday) : '—',
      note: 'Son 24 saat',
      icon: ClipboardList,
      accentClass: 'border-l-blue-500',
    },
    {
      title: 'Bugün Ciro',
      value: summary ? formatPrice(summary.revenueTodayCents) : '—',
      note: 'Tahsil edilen',
      icon: CreditCard,
      accentClass: 'border-l-emerald-500',
    },
    {
      title: 'Toplam Sipariş',
      value: summary ? String(summary.ordersTotal) : '—',
      note: 'Tüm zamanlar',
      icon: ShoppingBag,
      accentClass: 'border-l-violet-500',
    },
    {
      title: '30 Gün Ciro',
      value: reports ? formatPrice(reports.revenueCents) : '—',
      note: `${reports?.ordersCount ?? 0} sipariş`,
      icon: TrendingUp,
      accentClass: 'border-l-cyan-500',
    },
    {
      title: 'Aktif Ürün',
      value: summary ? String(summary.activeProducts) : '—',
      note: 'Yayında',
      icon: Package,
      accentClass: 'border-l-amber-500',
    },
    {
      title: 'Düşük Stok',
      value: summary ? String(summary.lowStockProducts) : '—',
      note: '≤ 5 adet',
      icon: AlertTriangle,
      accentClass: summary?.lowStockProducts ? 'border-l-red-500' : 'border-l-gray-300',
    },
    {
      title: 'Kayıtlı Müşteri',
      value: String(customerTotal),
      note: 'Toplam havuz',
      icon: Users,
      accentClass: 'border-l-teal-500',
    },
    {
      title: 'Bekleyen İade',
      value: String(pendingReturns),
      note: 'Onay bekliyor',
      icon: RefreshCcw,
      accentClass: pendingReturns > 0 ? 'border-l-orange-500' : 'border-l-gray-300',
    },
  ], [summary, reports, customerTotal, pendingReturns]);

  /* Quick Links */
  const quickLinks = useMemo(() => (isSuperAdmin ? [
    { label: 'Kullanıcı Yönetimi', href: `${basePath}/users`, icon: Users, description: 'Admin ve satıcı hesaplarını yönet' },
    { label: 'Satıcı Operasyonu', href: `${basePath}/sellers`, icon: Zap, description: 'Satıcı onayları ve operasyon takibi' },
    { label: 'Başvuru Havuzu', href: `${basePath}/sellers/applications`, icon: Package, description: 'Bekleyen satıcı başvuruları' },
    { label: 'Plan Yönetimi', href: `${basePath}/plans`, icon: CreditCard, description: 'Abonelik planları ve limitler' },
    { label: 'Finans Raporları', href: `${basePath}/finance`, icon: TrendingUp, description: 'Gelir, payout ve iade verileri' },
    { label: 'Risk Kontrolü', href: `${basePath}/risk-control`, icon: AlertTriangle, description: 'Outbox, audit ve risk metrikleri' },
  ] : [
    { label: 'Sipariş Takibi', href: `${basePath}/orders`, icon: ClipboardList, description: 'Tüm siparişleri izle ve yönet' },
    { label: 'Ürün Yönetimi', href: `${basePath}/products`, icon: Package, description: 'Stok, fiyat ve ürün bilgileri' },
    { label: 'Müşteri Paneli', href: `${basePath}/customers`, icon: Users, description: 'Müşteri listesi ve bakiyeler' },
    { label: 'Ödeme Operasyonu', href: `${basePath}/payments`, icon: CreditCard, description: 'Ödeme kayıtları ve tahsilatlar' },
    { label: 'Finans Raporları', href: `${basePath}/finance`, icon: TrendingUp, description: 'Ciro ve iade raporları' },
    { label: 'İade Yönetimi', href: `${basePath}/finance/refunds`, icon: RefreshCcw, description: 'Bekleyen iade talepleri' },
  ]), [basePath, isSuperAdmin]);

  const isNewStore = Boolean(summary && summary.ordersTotal === 0 && summary.activeProducts === 0);

  /* Render */
  return (
    <div className="space-y-8">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Canlı
            </span>
            {riskScore > 30 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600">
                <AlertTriangle className="h-3 w-3" />
                Risk: {riskScore}
              </span>
            )}
          </div>
          <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">
            {isSuperAdmin ? 'Platform Dashboard' : 'Admin Dashboard'}
          </h1>
          <p className="mt-1 text-sm text-[var(--neutral-600)]">
            {isSuperAdmin
              ? 'Satıcı, kullanıcı ve operasyon akışını tek merkezden izle.'
              : 'Sipariş, stok, müşteri ve iade operasyonunu izle.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`${basePath}/reports`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--neutral-600)] hover:text-[var(--primary-800)] transition">
            <TrendingUp className="h-4 w-4" />Raporlar
          </Link>
          <Link href={`${basePath}/orders`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary-800)] hover:underline underline-offset-2">
            <ClipboardList className="h-4 w-4" />Siparisler
          </Link>
        </div>
      </div>

      {/* ── Loading / Error ── */}
      {isLoading && <Spinner label="Veriler yükleniyor..." />}

      {isError && (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Dashboard verileri yüklenemedi.
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {/* ── New Store Guide ── */}
          {isNewStore && (
            <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 px-5 py-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-amber-600" />
                <span className="text-[12px] font-bold uppercase tracking-wide text-amber-700">
                  Hızlı Başlangıç
                </span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Panel hazır, sıra sizde!</h2>
              <p className="text-sm text-gray-600 mb-4">
                Henüz sipariş ve ürün verisi yok. Aşağıdaki adımlarla başlayın.
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {(isSuperAdmin
                  ? [
                    { label: 'Kullanıcı Ekle', href: `${basePath}/users` },
                    { label: 'Satıcıları Yönet', href: `${basePath}/sellers` },
                    { label: 'Planları Hazırla', href: `${basePath}/plans` },
                  ]
                  : [
                    { label: 'İlk Ürünü Ekle', href: `${basePath}/products` },
                    { label: 'Kategori Oluştur', href: `${basePath}/categories` },
                    { label: 'Siparişleri İzle', href: `${basePath}/orders` },
                  ]
                ).map((cta) => (
                  <Link
                    key={cta.href}
                    href={cta.href}
                    className="flex items-center justify-between rounded-lg border border-amber-200 bg-white px-4 py-3 text-[13px] font-medium text-gray-800 hover:bg-amber-50 transition"
                  >
                    {cta.label}
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── KPI Stats ── */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
            {statCards.map((card) => (
              <div key={card.title}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">{card.title}</p>
                <div className="mt-1 flex items-end gap-2">
                  <span className="text-2xl font-semibold text-[var(--primary-800)]">{card.value}</span>
                  {card.icon && <card.icon className="mb-1 h-4 w-4 text-[var(--neutral-400)]" />}
                </div>
                {card.note && <p className="text-[11px] text-[var(--neutral-500)] mt-0.5">{card.note}</p>}
              </div>
            ))}
          </div>

          {/* ── Divider ── */}
          <div className="border-t border-[var(--neutral-200)]" />

          {/* ── Orders + Top Products ── */}
          <div className="grid gap-10 xl:grid-cols-[1fr_300px]">
            {/* Orders Table */}
            <div>
              <div className="flex items-center justify-between border-b border-[var(--neutral-200)] pb-3 mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">Son Siparişler</p>
                <Link href={`${basePath}/orders`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary-800)] hover:underline underline-offset-2">
                  Tümü <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {orders.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--neutral-500)]">Henüz sipariş kaydı yok.</p>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--neutral-200)]">
                      {['Sipariş', 'Durum', 'Kaynak', 'Tutar', 'Tarih'].map((h) => (
                        <th key={h} className={`pb-3 pr-6 text-left text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)] ${h === 'Tutar' || h === 'Tarih' ? 'text-right' : ''}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--neutral-100)]">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-[var(--neutral-50)] transition-colors">
                        <td className="py-3 pr-6 font-semibold text-[var(--primary-800)]">
                          <Link href={`${basePath}/orders/${order.id}`} className="hover:underline underline-offset-2">#{order.id}</Link>
                        </td>
                        <td className="py-3 pr-6"><StatusBadge status={order.statusKey} /></td>
                        <td className="py-3 pr-6"><SourceBadge source={order.source} /></td>
                        <td className="py-3 pr-6 text-right font-semibold text-[var(--primary-800)]">{formatPrice(order.totalAmountCents)}</td>
                        <td className="py-3 text-right text-[var(--neutral-500)] text-[12px]">
                          {new Date(order.createdAt).toLocaleString('tr-TR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              {/* Top Products */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)] mb-4">Top Ürünler</p>
                {topProducts.length === 0 ? (
                  <p className="text-sm text-[var(--neutral-500)]">Veri yok.</p>
                ) : (
                  <div className="divide-y divide-[var(--neutral-100)]">
                    {topProducts.slice(0, 5).map((p, i) => (
                      <div key={p.productId} className="flex items-center gap-3 py-2.5">
                        <span className="text-[13px] font-bold text-[var(--neutral-400)] w-4">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[var(--primary-800)] truncate">{p.name}</p>
                          <p className="text-[11px] text-[var(--neutral-500)]">{p.quantity} adet</p>
                        </div>
                        <span className="text-[13px] font-semibold text-[var(--primary-800)] flex-shrink-0">{formatPrice(p.revenueCents)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* System Health */}
              {outboxQ.data && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="h-3.5 w-3.5 text-[var(--neutral-500)]" />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">Sistem Sağlığı</p>
                  </div>
                  <div className="divide-y divide-[var(--neutral-100)]">
                    {[
                      { label: 'Toplam', value: outboxQ.data.totalCount },
                      { label: 'Bekleyen', value: outboxQ.data.pendingCount },
                      { label: 'Başarısız', value: outboxQ.data.failedCount },
                      { label: 'Ölü Mesaj', value: outboxQ.data.deadLetterCount },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between py-2 text-[12px]">
                        <span className="text-[var(--neutral-500)]">{row.label}</span>
                        <span className="font-semibold text-[var(--primary-800)]">{row.value}</span>
                      </div>
                    ))}
                  </div>
                  {riskScore > 0 && (
                    <div className="mt-3 pt-3 border-t border-[var(--neutral-200)]">
                      <div className="flex items-center justify-between text-[12px] mb-1.5">
                        <span className="text-[var(--neutral-500)]">Risk Skoru</span>
                        <span className={`font-bold ${riskScore > 50 ? 'text-red-600' : riskScore > 20 ? 'text-amber-600' : 'text-green-600'}`}>{riskScore}/100</span>
                      </div>
                      <div className="h-1 rounded-full bg-[var(--neutral-100)]">
                        <div className={`h-full rounded-full ${riskScore > 50 ? 'bg-red-500' : riskScore > 20 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${riskScore}%` }} />
                      </div>
                    </div>
                  )}
                  <Link href={`${basePath}/risk-control`}
                    className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--primary-800)] hover:underline underline-offset-2">
                    Risk Hub <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="border-t border-[var(--neutral-200)]" />

          {/* ── Quick Links ── */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)] mb-4">Hızlı Erişim</p>
            <div className="divide-y divide-[var(--neutral-100)]">
              {quickLinks.map((link) => (
                <Link key={link.href} href={link.href}
                  className="flex items-center justify-between py-3 text-sm hover:bg-[var(--neutral-50)] px-1 -mx-1 rounded transition-colors">
                  <div className="flex items-center gap-3">
                    <link.icon className="h-4 w-4 text-[var(--neutral-400)]" />
                    <div>
                      <p className="font-medium text-[var(--primary-800)]">{link.label}</p>
                      <p className="text-[11px] text-[var(--neutral-500)]">{link.description}</p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-[var(--neutral-400)]" />
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
