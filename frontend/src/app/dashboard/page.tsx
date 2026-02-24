/* eslint-disable react/no-unescaped-entities */
'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight } from 'lucide-react';

import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { formatPrice } from '@/lib/format';
import { getPanelLabelByRole } from '@/lib/role-routing';
import { useAppSelector } from '@/store';

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

type QuickAction = {
  label: string;
  href: string;
};

type SetupAction = QuickAction;

export default function SellerDashboardPage() {
  const user = useAppSelector((state) => state.user.user);
  const isStaff = user?.role === 'USER';
  const panelLabel = getPanelLabelByRole(user?.role);
  const heroTag = isStaff ? 'Personel' : 'Satıcı';
  const heroDescription = isStaff
    ? 'İşletmenin günlük operasyon performansı ve son 30 günlük satış trendi.'
    : 'Mağazanızın bugünkü performansı ve son 30 günlük satış trendi.';

  const quickActions = useMemo<QuickAction[]>(() => {
    if (isStaff) {
      return [
        { label: 'Siparişleri görüntüle', href: '/dashboard/orders' },
        { label: 'Stok kontrolü', href: '/dashboard/inventory' },
        { label: 'Tahsilat takibi', href: '/dashboard/finance' },
        { label: 'POS ekranı', href: '/pos' },
        { label: 'Raporlar', href: '/dashboard/reports' },
      ];
    }

    return [
      { label: 'Ürünleri yönet', href: '/dashboard/products' },
      { label: 'Siparişleri görüntüle', href: '/dashboard/orders' },
      { label: 'Finans', href: '/dashboard/finance' },
      { label: 'Kampanyalar', href: '/dashboard/campaigns/coupons' },
      { label: 'Raporlar', href: '/dashboard/reports' },
      { label: 'Abonelik', href: '/dashboard/subscription' },
    ];
  }, [isStaff]);

  const setupActions = useMemo<SetupAction[]>(() => {
    if (isStaff) {
      return [
        { label: 'Sipariş ekranını aç', href: '/dashboard/orders' },
        { label: 'Stok listesini kontrol et', href: '/dashboard/inventory' },
        { label: 'POS ekranına geç', href: '/pos' },
      ];
    }

    return [
      { label: 'İlk ürünü ekle', href: '/dashboard/products' },
      { label: 'Kampanya oluştur', href: '/dashboard/campaigns/coupons' },
      { label: 'POS ekranına geç', href: '/pos' },
    ];
  }, [isStaff]);

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
  const showSetupGuide = Boolean(data && data.ordersTotal === 0 && data.activeProducts === 0);

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
          {heroTag}
        </p>
        <h1 className="mt-2 text-2xl font-serif text-[var(--primary-800)]">Genel bakış</h1>
        <p className="mt-2 text-sm text-[var(--neutral-600)]">
          {heroDescription}
        </p>
        <div className="mt-3 inline-flex rounded-full border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)]">
          {panelLabel}
        </div>
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
        {showSetupGuide ? (
          <section className="xl:col-span-2 rounded-[var(--radius-xl)] border border-[#CFAE74] bg-[#FFF9EE] px-6 py-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7A5A24]">
              İlk Kurulum
            </p>
            <h2 className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
              {isStaff ? 'Operasyon başlangıç adımları' : 'Satış başlangıç adımları'}
            </h2>
            <p className="mt-2 text-sm text-[var(--neutral-700)]">
              Henüz satış verisi oluşmamış. Aşağıdaki adımlarla paneli aktif kullanıma alın.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {setupActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[#D9C08F] bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] hover:bg-[#FFFCF4]"
                >
                  {action.label}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
          <h2 className="text-xl font-serif text-[var(--primary-800)]">Hızlı işlemler</h2>
          <div className="mt-4 grid gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)]"
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
          <h2 className="text-xl font-serif text-[var(--primary-800)]">
            {isStaff ? 'Operasyon özeti' : 'Satış özeti'}
          </h2>
          {!reports ? (
            <div className="mt-3 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-4">
              <p className="text-sm text-[var(--neutral-600)]">Rapor verisi bulunamadı.</p>
              <div className="mt-3 grid gap-2">
                {setupActions.slice(0, 2).map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] hover:underline"
                  >
                    {action.label}
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                ))}
              </div>
            </div>
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
                    {isStaff ? 'En hareketli ürün' : 'En çok satan'}
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

