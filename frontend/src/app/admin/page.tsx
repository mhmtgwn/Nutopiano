'use client';

import type { ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  CreditCard,
  Package,
  ShoppingBag,
  XCircle,
} from 'lucide-react';

import Spinner from '@/components/common/Spinner';
import { formatPrice } from '@/lib/format';
import api from '@/services/api';
import { useAppSelector } from '@/store';

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

interface ReturnRequest {
  id: number;
  orderId: number;
  status: string;
  requestedAt: string;
}

interface OutboxMetrics {
  totalCount: number;
  failedCount: number;
  deadLetterCount: number;
  retryCount: number;
  pendingCount: number;
}

interface AuditLogRow {
  id: number;
  actionType: string;
}

type StatusMeta = {
  label: string;
  className: string;
  icon: ComponentType<{ className?: string }>;
};

const statusMeta: Record<string, StatusMeta> = {
  PENDING: { label: 'Bekliyor', className: 'bg-amber-100 text-amber-700', icon: Clock },
  CONFIRMED: { label: 'Onaylandı', className: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  CANCELLED: { label: 'İptal', className: 'bg-red-100 text-red-700', icon: XCircle },
  COMPLETED: { label: 'Tamamlandı', className: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  PROCESSING: { label: 'İşleniyor', className: 'bg-violet-100 text-violet-700', icon: Activity },
};

function StatusBadge({ status }: { status: string }) {
  const normalized = String(status ?? '').toUpperCase();
  const meta = statusMeta[normalized] ?? {
    label: status || 'Bilinmiyor',
    className: 'bg-gray-100 text-gray-700',
    icon: Clock,
  };

  const Icon = meta.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${meta.className}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const labels: Record<string, string> = {
    POS: 'POS',
    ONLINE: 'Online',
    MANUAL: 'Manuel',
  };

  return (
    <span className="inline-flex items-center rounded-md border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-2 py-1 text-[11px] font-medium text-[var(--neutral-700)]">
      {labels[source] ?? source}
    </span>
  );
}

function formatOrderDate(value: string): string {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '-';
  return dt.toLocaleString('tr-TR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface KpiItemProps {
  title: string;
  value: string;
  note: string;
  icon: ComponentType<{ className?: string }>;
}

function KpiItem({ title, value, note, icon: Icon }: KpiItemProps) {
  return (
    <div className="border-b border-[var(--neutral-200)] pb-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--neutral-500)]">{title}</p>
      <div className="mt-1 flex items-end gap-2">
        <p className="text-2xl font-semibold text-[var(--primary-800)]">{value}</p>
        <Icon className="mb-1 h-4 w-4 text-[var(--neutral-500)]" />
      </div>
      <p className="mt-1 text-xs text-[var(--neutral-600)]">{note}</p>
    </div>
  );
}

export default function AdminOverviewPage() {
  const pathname = usePathname();
  const user = useAppSelector((s) => s.user.user);
  const basePath = pathname.startsWith('/platform') ? '/platform' : '/admin';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

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
  const orders = useMemo(() => ordersQ.data?.data ?? [], [ordersQ.data?.data]);
  const topProducts = reports?.topProducts ?? [];
  const customerTotal = customersQ.data?.meta?.total ?? 0;
  const pendingReturns = returnsQ.data?.length ?? 0;

  const riskScore = useMemo(() => {
    const metrics = outboxQ.data;
    if (!metrics) return 0;

    const total = Math.max(metrics.totalCount, 1);
    const failedRate = ((metrics.failedCount + metrics.deadLetterCount) / total) * 100;
    const retryRate = (metrics.retryCount / total) * 100;
    const overrideActions = (auditQ.data?.data ?? []).filter((log) => {
      const action = String(log.actionType ?? '').toUpperCase();
      return action.includes('FORCE') || action.includes('OVERRIDE');
    }).length;

    return Math.min(100, Math.round(failedRate * 0.6 + retryRate * 0.2 + overrideActions * 2));
  }, [outboxQ.data, auditQ.data]);

  const statusStats = useMemo(() => {
    const counts = orders.reduce<Record<string, number>>((acc, order) => {
      const key = String(order.statusKey ?? 'UNKNOWN').toUpperCase();
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const total = Math.max(orders.length, 1);

    return Object.entries(counts)
      .map(([key, count]) => ({
        key,
        label: statusMeta[key]?.label ?? key,
        count,
        percent: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [orders]);

  const kpis: KpiItemProps[] = useMemo(() => [
    {
      title: 'Bugün Sipariş',
      value: summary ? String(summary.ordersToday) : '—',
      note: 'Son 24 saat',
      icon: ClipboardList,
    },
    {
      title: 'Bugün Ciro',
      value: summary ? formatPrice(summary.revenueTodayCents) : '—',
      note: 'Tahsil edilen toplam',
      icon: CreditCard,
    },
    {
      title: 'Toplam Sipariş',
      value: summary ? String(summary.ordersTotal) : '—',
      note: 'Tüm dönem',
      icon: ShoppingBag,
    },
    {
      title: 'Aktif Ürün',
      value: summary ? String(summary.activeProducts) : '—',
      note: 'Yayındaki ürün',
      icon: Package,
    },
    {
      title: 'Kayıtlı Müşteri',
      value: String(customerTotal),
      note: 'Toplam müşteri havuzu',
      icon: ClipboardList,
    },
  ], [summary, customerTotal]);

  const quickLinks = useMemo(() => (isSuperAdmin ? [
    { label: 'Siparişler', href: `${basePath}/orders` },
    { label: 'Ürün & Kategori', href: `${basePath}/products` },
    { label: 'Satıcılar', href: `${basePath}/sellers` },
    { label: 'Kullanıcılar', href: `${basePath}/users` },
    { label: 'Finans', href: `${basePath}/finance` },
    { label: 'Ayarlar', href: `${basePath}/settings` },
  ] : [
    { label: 'Siparişler', href: `${basePath}/orders` },
    { label: 'Ürünler', href: `${basePath}/products` },
    { label: 'Müşteriler', href: `${basePath}/customers` },
    { label: 'Ödemeler', href: `${basePath}/payments` },
    { label: 'Raporlar', href: `${basePath}/reports` },
    { label: 'Ayarlar', href: `${basePath}/settings` },
  ]), [basePath, isSuperAdmin]);

  return (
    <div className="space-y-8">
      <section className="border-b border-[var(--neutral-200)] pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">Yönetim Paneli</p>
            <h1 className="mt-1 text-4xl text-[var(--primary-800)]">Hoş geldin, {user?.name?.split(' ')[0] ?? 'Yönetici'}</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--neutral-600)]">
              Operasyon, sipariş ve finans verilerini sade ekranda anlık takip et.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--neutral-200)] px-3 py-1.5 font-semibold text-[var(--primary-800)]">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Sistem Canlı
            </span>
            <Link href={`${basePath}/reports`} className="inline-flex items-center gap-1 font-semibold text-[var(--primary-800)] hover:underline">
              Raporlar
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {isLoading && <Spinner label="Dashboard verileri yükleniyor..." />}

      {isError && (
        <div className="flex items-center gap-2 border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Dashboard verileri yüklenemedi. Lütfen tekrar deneyin.
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
            {kpis.map((item) => (
              <KpiItem key={item.title} title={item.title} value={item.value} note={item.note} icon={item.icon} />
            ))}
          </section>

          <section className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl text-[var(--primary-800)]">Yeni Siparişler</h2>
                <Link href={`${basePath}/orders`} className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary-800)] hover:underline">
                  Tümünü Gör
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>

              {orders.length === 0 ? (
                <p className="py-8 text-sm text-[var(--neutral-600)]">Henüz sipariş verisi bulunmuyor.</p>
              ) : (
                <div className="overflow-x-auto border-y border-[var(--neutral-200)]">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--neutral-200)]">
                        <th className="py-3 pr-4 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">Sipariş</th>
                        <th className="py-3 pr-4 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">Durum</th>
                        <th className="py-3 pr-4 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">Kaynak</th>
                        <th className="py-3 pr-4 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">Tutar</th>
                        <th className="py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">Tarih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--neutral-100)]">
                      {orders.map((order) => (
                        <tr key={order.id} className="hover:bg-[var(--neutral-50)]">
                          <td className="py-3 pr-4">
                            <Link href={`${basePath}/orders/${order.id}`} className="font-semibold text-[var(--primary-800)] hover:underline">
                              #{order.id}
                            </Link>
                          </td>
                          <td className="py-3 pr-4">
                            <StatusBadge status={order.statusKey} />
                          </td>
                          <td className="py-3 pr-4">
                            <SourceBadge source={order.source} />
                          </td>
                          <td className="py-3 pr-4 text-right font-semibold text-[var(--primary-800)]">{formatPrice(order.totalAmountCents)}</td>
                          <td className="py-3 text-right text-xs text-[var(--neutral-600)]">{formatOrderDate(order.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <aside className="space-y-8 border-t border-[var(--neutral-200)] pt-6 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
              <div>
                <h3 className="text-2xl text-[var(--primary-800)]">Öne Çıkan Ürünler</h3>
                <div className="mt-3 divide-y divide-[var(--neutral-100)] border-y border-[var(--neutral-200)]">
                  {topProducts.length === 0 ? (
                    <p className="py-4 text-sm text-[var(--neutral-600)]">Henüz ürün performans verisi yok.</p>
                  ) : (
                    topProducts.slice(0, 4).map((product, index) => (
                      <div key={product.productId} className="flex items-center justify-between gap-2 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--primary-800)]">{index + 1}. {product.name}</p>
                          <p className="text-xs text-[var(--neutral-600)]">{product.quantity} adet</p>
                        </div>
                        <span className="text-sm font-semibold text-[var(--primary-800)]">{formatPrice(product.revenueCents)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-2xl text-[var(--primary-800)]">Sipariş Dağılımı</h3>
                <div className="mt-3 space-y-2.5">
                  {statusStats.length === 0 ? (
                    <p className="text-sm text-[var(--neutral-600)]">Durum verisi bulunmuyor.</p>
                  ) : (
                    statusStats.map((row) => (
                      <div key={row.key}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-medium text-[var(--neutral-700)]">{row.label}</span>
                          <span className="font-semibold text-[var(--primary-800)]">{row.count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[var(--neutral-100)]">
                          <div className="h-full rounded-full bg-[var(--primary-700)]" style={{ width: `${row.percent}%` }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-2xl text-[var(--primary-800)]">Sistem Sağlığı</h3>
                <div className="mt-3 divide-y divide-[var(--neutral-100)] border-y border-[var(--neutral-200)]">
                  {[
                    { label: 'Toplam Outbox', value: outboxQ.data?.totalCount ?? '—' },
                    { label: 'Bekleyen', value: outboxQ.data?.pendingCount ?? '—' },
                    { label: 'Başarısız', value: outboxQ.data?.failedCount ?? '—' },
                    { label: 'Dead Letter', value: outboxQ.data?.deadLetterCount ?? '—' },
                    { label: 'Bekleyen İade', value: pendingReturns },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-[var(--neutral-600)]">{row.label}</span>
                      <span className="font-semibold text-[var(--primary-800)]">{row.value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--neutral-600)]">Risk Skoru</span>
                    <span className={`font-semibold ${riskScore > 50 ? 'text-red-600' : riskScore > 20 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {riskScore}/100
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--neutral-100)]">
                    <div
                      className={`h-full rounded-full ${riskScore > 50 ? 'bg-red-500' : riskScore > 20 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${riskScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </aside>
          </section>

          <section className="border-t border-[var(--neutral-200)] pt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-3xl text-[var(--primary-800)]">Kısa Yollar</h2>
              <span className="text-xs text-[var(--neutral-600)]">Rapor aralığı: {reports?.range?.days ?? 30} gün</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between border border-transparent px-3 py-2 text-sm font-medium text-[var(--primary-800)] transition hover:border-[var(--neutral-200)] hover:bg-[var(--neutral-50)]"
                >
                  {link.label}
                  <ArrowUpRight className="h-4 w-4 text-[var(--neutral-500)]" />
                </Link>
              ))}
            </div>

            {summary && summary.lowStockProducts > 0 && (
              <div className="mt-4 border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {summary.lowStockProducts} ürün düşük stok seviyesinde.
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
