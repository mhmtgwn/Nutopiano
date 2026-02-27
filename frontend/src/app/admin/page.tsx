'use client';

import type { ComponentType } from 'react';
import Link from 'next/link';
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
  ShoppingBag,
  Users,
  XCircle,
} from 'lucide-react';

import Spinner from '@/components/common/Spinner';
import { formatPrice } from '@/lib/format';
import api from '@/services/api';

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

interface SellerCustomersResponse {
  data: Array<{ id: number; name: string; phone: string }>;
  meta: { total: number };
}

interface OrderListResponse {
  data: Array<{
    id: number;
    totalAmountCents: number;
    statusKey: string;
    source: string;
    createdAt: string;
  }>;
  meta: { total: number };
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
  const labels: Record<string, string> = { POS: 'POS', ONLINE: 'Online', MANUAL: 'Manuel' };
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

interface KpiRowProps {
  title: string;
  value: string;
  note: string;
}

function KpiRow({ title, value, note }: KpiRowProps) {
  return (
    <div className="border-b border-[var(--neutral-200)] pb-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--neutral-500)]">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-[var(--primary-800)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--neutral-600)]">{note}</p>
    </div>
  );
}

export default function AdminOverviewPage() {
  const summaryQ = useQuery<DashboardSummary>({
    queryKey: ['seller-panel-summary'],
    queryFn: async () => (await api.get<DashboardSummary>('/dashboard/summary')).data,
  });

  const reportsQ = useQuery<DashboardReportsSummary>({
    queryKey: ['seller-panel-reports'],
    queryFn: async () => (await api.get<DashboardReportsSummary>('/dashboard/reports/summary')).data,
  });

  const customersQ = useQuery<SellerCustomersResponse>({
    queryKey: ['seller-panel-customers'],
    queryFn: async () => (await api.get<SellerCustomersResponse>('/seller/customers?page=1&pageSize=1')).data,
  });

  const ordersQ = useQuery<OrderListResponse>({
    queryKey: ['seller-panel-orders'],
    queryFn: async () => (await api.get<OrderListResponse>('/orders?page=1&pageSize=8')).data,
  });

  const isLoading = summaryQ.isLoading || reportsQ.isLoading || ordersQ.isLoading || customersQ.isLoading;
  const isError = summaryQ.isError || reportsQ.isError || ordersQ.isError || customersQ.isError;

  const summary = summaryQ.data;
  const reports = reportsQ.data;
  const orders = useMemo(() => ordersQ.data?.data ?? [], [ordersQ.data?.data]);
  const topProducts = reports?.topProducts ?? [];
  const customerTotal = customersQ.data?.meta?.total ?? 0;

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

  const kpis: KpiRowProps[] = useMemo(() => [
    {
      title: 'Bugün Sipariş',
      value: summary ? String(summary.ordersToday) : '—',
      note: 'Kendi mağaza siparişleri',
    },
    {
      title: 'Bugün Ciro',
      value: summary ? formatPrice(summary.revenueTodayCents) : '—',
      note: 'Kendi mağaza tahsilatı',
    },
    {
      title: 'Toplam Sipariş',
      value: summary ? String(summary.ordersTotal) : '—',
      note: 'Tüm dönem satış',
    },
    {
      title: 'Toplam Müşteri',
      value: String(customerTotal),
      note: 'Sadece kendi müşteri havuzun',
    },
    {
      title: '30 Gün Ciro',
      value: reports ? formatPrice(reports.revenueCents) : '—',
      note: `${reports?.ordersCount ?? 0} sipariş`,
    },
  ], [summary, customerTotal, reports]);

  return (
    <div className="space-y-8">
      {isLoading && <Spinner label="Panel verileri yükleniyor..." />}

      {isError && (
        <div className="flex items-center gap-2 border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Panel verileri yüklenemedi. Lütfen tekrar deneyin.
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
            {kpis.map((item) => (
              <KpiRow key={item.title} title={item.title} value={item.value} note={item.note} />
            ))}
          </section>

          <section className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl text-[var(--primary-800)]">Son Satışlar</h2>
                <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary-800)] hover:underline">
                  Tümünü Gör
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>

              {orders.length === 0 ? (
                <p className="py-8 text-sm text-[var(--neutral-600)]">Henüz satış verisi bulunmuyor.</p>
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
                            <Link href={`/admin/orders`} className="font-semibold text-[var(--primary-800)] hover:underline">
                              #{order.id}
                            </Link>
                          </td>
                          <td className="py-3 pr-4"><StatusBadge status={order.statusKey} /></td>
                          <td className="py-3 pr-4"><SourceBadge source={order.source} /></td>
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
                <h3 className="text-2xl text-[var(--primary-800)]">Kısa Yollar</h3>
                <div className="mt-3 grid gap-2">
                  {[
                    { label: 'Satışlar', href: '/admin/orders', icon: ShoppingBag },
                    { label: 'Müşteriler', href: '/admin/customers', icon: Users },
                    { label: 'Raporlar', href: '/admin/reports', icon: ClipboardList },
                    { label: 'Satıcı Ayarları', href: '/admin/settings', icon: CreditCard },
                  ].map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center justify-between border border-transparent px-3 py-2 text-sm font-medium text-[var(--primary-800)] transition hover:border-[var(--neutral-200)] hover:bg-[var(--neutral-50)]"
                    >
                      <span className="inline-flex items-center gap-2">
                        <link.icon className="h-4 w-4 text-[var(--neutral-500)]" />
                        {link.label}
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-[var(--neutral-500)]" />
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </section>
        </>
      )}
    </div>
  );
}
