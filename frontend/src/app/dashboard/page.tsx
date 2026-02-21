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

export default function SellerDashboardPage() {
  const { data, isLoading, isError } = useQuery<SellerDashboardSummary>({
    queryKey: ['seller-dashboard-summary'],
    queryFn: async () => {
      const res = await api.get<SellerDashboardSummary>('/dashboard/summary');
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
          Satıcı
        </p>
        <h1 className="mt-2 text-2xl font-serif text-[var(--primary-800)]">Genel bakış</h1>
        <p className="mt-2 text-sm text-[var(--neutral-600)]">
          Mağazanızın bugünkü performansı ve hızlı kısayollar.
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
                {formatPrice(data.revenueTodayCents)}
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

      <div className="grid gap-4 md:grid-cols-2">
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
          </div>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
          <h2 className="text-xl font-serif text-[var(--primary-800)]">Notlar</h2>
          <p className="mt-3 text-sm text-[var(--neutral-600)]">
            Bu ekran M4 kapsamındaki satıcı paneli için temel KPI'ları gösterir. Sonraki adımda
            sipariş listesi, ürün yönetimi ve finans raporları ekranlarını gerçek verilerle
            dolduracağız.
          </p>
        </div>
      </div>
    </div>
  );
}
