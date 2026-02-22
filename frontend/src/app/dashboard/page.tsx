/* eslint-disable react/no-unescaped-entities */
'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { formatPrice } from '@/lib/format';

interface SellerDashboardSummary {
  activeProducts: number;
  lowStockProducts: number;
  ordersTotal: number;
  ordersToday: number;
  revenueTodayCents: number;
}

interface SellerReportsSummary {
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

export default function SellerDashboardPage() {
  const summaryQuery = useQuery<SellerDashboardSummary>({
    queryKey: ['seller-dashboard-summary'],
    queryFn: async () => {
      const res = await api.get<SellerDashboardSummary>('/dashboard/summary');
      return res.data;
    },
  });

  const reportsQuery = useQuery<SellerReportsSummary>({
    queryKey: ['seller-dashboard-reports-summary'],
    queryFn: async () => {
      const res = await api.get<SellerReportsSummary>('/dashboard/reports/summary');
      return res.data;
    },
  });

  const isLoading = summaryQuery.isLoading || reportsQuery.isLoading;
  const isError = summaryQuery.isError || reportsQuery.isError;

  const data = summaryQuery.data;
  const reports = reportsQuery.data;
  const topProducts = reports?.topProducts ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
          Satıcı
        </p>
        <h1 className="mt-2 text-2xl font-serif text-[var(--primary-800)]">Genel bakış</h1>
        <p className="mt-2 text-sm text-[var(--neutral-600)]">
          Mağazanızın bugünkü performansı ve son 30 günlük satış trendi.
        </p>
      </div>

      <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        {isLoading && <Spinner fullscreen label="Yükleniyor..." />}

        {isError && !isLoading && (
          <div className="rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Özet bilgiler yüklenemedi. Yetki veya bağlantı problemi olabilir.
          </div>
        )}

        {!isLoading && !isError && data && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                Bugün Sipariş
              </div>
              <div className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
                {data.ordersToday}
              </div>
            </div>

            <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                Bugün Ciro
              </div>
              <div className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
                {formatPrice(data.revenueTodayCents / 100)}
              </div>
            </div>

            <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                Toplam Sipariş
              </div>
              <div className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
                {data.ordersTotal}
              </div>
            </div>

            <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                Aktif Ürün
              </div>
              <div className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
                {data.activeProducts}
              </div>
            </div>

            <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                Düşük Stok
              </div>
              <div className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
                {data.lowStockProducts}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
          <h2 className="text-xl font-serif text-[var(--primary-800)]">Hızlı işlemler</h2>
          <div className="mt-4 grid gap-3">
            <Link
              href="/dashboard/products"
              className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)]"
            >
              Ürünleri yönet
            </Link>
            <Link
              href="/dashboard/orders"
              className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)]"
            >
              Siparişleri görüntüle
            </Link>
            <Link
              href="/dashboard/finance"
              className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)]"
            >
              Finans
            </Link>
            <Link
              href="/dashboard/reports"
              className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)]"
            >
              Raporlar
            </Link>
          </div>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
          <h2 className="text-xl font-serif text-[var(--primary-800)]">Satış özeti</h2>
          {!reports ? (
            <p className="mt-3 text-sm text-[var(--neutral-600)]">Rapor verisi bulunamadı.</p>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                  30 gün ciro
                </p>
                <p className="mt-1 text-lg font-serif text-[var(--primary-800)]">
                  {formatPrice(reports.revenueCents / 100)}
                </p>
              </div>

              <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                  Ortalama sipariş
                </p>
                <p className="mt-1 text-lg font-serif text-[var(--primary-800)]">
                  {formatPrice(reports.averageOrderValueCents / 100)}
                </p>
              </div>

              {topProducts.length > 0 ? (
                <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                    En çok satan
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--primary-800)]">
                    {topProducts[0].name}
                  </p>
                  <p className="mt-1 text-xs text-[var(--neutral-600)]">
                    {topProducts[0].quantity} adet
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
