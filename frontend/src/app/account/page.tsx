'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  ClipboardList,
  Heart,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Settings,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react';

import Spinner from '@/components/common/Spinner';
import { formatPrice } from '@/lib/format';
import { resolveProfilePanelHome } from '@/lib/profile-session';
import { getPanelLabelByRole, isPosRoleAllowed } from '@/lib/role-routing';
import api from '@/services/api';
import type { ProfileResponse } from '@/types/profile';

type OrderSummary = {
  id: number;
  totalAmountCents: number;
  statusKey: string;
  createdAt: string;
};

type PaginatedOrders = {
  data: OrderSummary[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

type FavoriteRow = {
  id: number;
  productId: number;
  createdAt: string;
};

type AddressRow = {
  id: number;
  title: string;
  isDefault: boolean;
};

type ReviewRow = {
  id: number;
  productId: number;
  rating: number;
};

type QuickLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const resolveApiErrorMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== 'object') return fallback;
  if (!('response' in error)) return fallback;
  const response = (error as { response?: unknown }).response;
  if (!response || typeof response !== 'object') return fallback;
  if (!('data' in response)) return fallback;
  const data = (response as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return fallback;
  if (!('message' in data)) return fallback;
  const message = (data as { message?: unknown }).message;
  if (Array.isArray(message)) return message.map(String).join(', ');
  if (typeof message === 'string') return message;
  return fallback;
};

export default function AccountHomePage() {
  const profileQuery = useQuery<ProfileResponse>({
    queryKey: ['account-home-profile'],
    queryFn: async () => {
      const res = await api.get<ProfileResponse>('/auth/profile');
      return res.data;
    },
  });

  const role = profileQuery.data?.role;
  const isCustomer = role === 'CUSTOMER';

  const ordersQuery = useQuery<PaginatedOrders>({
    queryKey: ['account-home-orders'],
    enabled: isCustomer,
    queryFn: async () => {
      const res = await api.get<PaginatedOrders>('/customer/orders', {
        params: { page: 1, pageSize: 5 },
      });
      return res.data;
    },
  });

  const favoritesQuery = useQuery<FavoriteRow[]>({
    queryKey: ['account-home-favorites'],
    enabled: isCustomer,
    queryFn: async () => {
      const res = await api.get<FavoriteRow[]>('/customer/favorites');
      return res.data;
    },
  });

  const addressesQuery = useQuery<AddressRow[]>({
    queryKey: ['account-home-addresses'],
    enabled: isCustomer,
    queryFn: async () => {
      const res = await api.get<AddressRow[]>('/customer/addresses');
      return res.data;
    },
  });

  const reviewsQuery = useQuery<ReviewRow[]>({
    queryKey: ['account-home-reviews'],
    enabled: isCustomer,
    queryFn: async () => {
      const res = await api.get<ReviewRow[]>('/customer/reviews');
      return res.data;
    },
  });

  if (profileQuery.isLoading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col px-4 py-6 md:px-6 md:py-10">
        <Spinner fullscreen />
      </div>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    const message = resolveApiErrorMessage(
      profileQuery.error,
      'Hesap özeti yüklenirken bir hata oluştu.',
    );

    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:px-6 md:py-10">
        <h1 className="text-2xl font-semibold text-[var(--primary-800)] md:text-3xl">
          Hesap Özeti
        </h1>
        <section className="space-y-3 rounded-[var(--radius-2xl)] border border-[var(--error-600)]/20 bg-[var(--error-100)] px-4 py-6 md:px-6">
          <p className="text-sm text-[var(--error-600)] md:text-base">{message}</p>
          <Link
            href="/login"
            className="text-sm text-[var(--primary-800)] underline-offset-2 hover:underline"
          >
            Giriş sayfasına git
          </Link>
        </section>
      </div>
    );
  }

  const profile = profileQuery.data;
  const panelHref = resolveProfilePanelHome(profile);
  const panelLabel = getPanelLabelByRole(profile.role);
  const orders = ordersQuery.data?.data ?? [];
  const latestOrder = orders[0];
  const orderTotal = ordersQuery.data?.meta?.total ?? 0;
  const favoriteTotal = favoritesQuery.data?.length ?? 0;
  const addressTotal = addressesQuery.data?.length ?? 0;
  const reviewTotal = reviewsQuery.data?.length ?? 0;
  const hasCustomerActivity =
    orderTotal > 0 || favoriteTotal > 0 || addressTotal > 0 || reviewTotal > 0;

  const quickLinks: QuickLink[] = isCustomer
    ? [
        { href: '/account/orders', label: 'Siparişlerim', icon: ShoppingBag },
        { href: '/account/addresses', label: 'Adres Defterim', icon: MapPin },
        { href: '/account/favorites', label: 'Favorilerim', icon: Heart },
        { href: '/account/reviews', label: 'Yorumlarım', icon: MessageSquare },
        { href: '/account/settings', label: 'Ayarlar', icon: Settings },
      ]
    : [
        { href: panelHref, label: panelLabel, icon: LayoutDashboard },
        { href: '/account/profile', label: 'Profil', icon: ClipboardList },
        { href: '/account/settings', label: 'Ayarlar', icon: Settings },
        ...(isPosRoleAllowed(profile.role)
          ? [{ href: '/pos', label: 'POS Ekranı', icon: ShoppingBag }]
          : []),
      ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10">
      <section className="overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--primary-800)]/10 bg-gradient-to-br from-[#F7F1E5] via-white to-[#ECF6F3] px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
          Hesap
        </p>
        <h1 className="mt-2 text-3xl font-serif text-[var(--primary-800)] md:text-4xl">
          {profile.name ?? 'Nutopiano Kullanıcısı'}
        </h1>
        <p className="mt-2 text-sm text-[var(--neutral-600)]">
          {isCustomer
            ? 'Sipariş ve üyelik bilgilerinize tek yerden erişin.'
            : `Rolünüz: ${panelLabel}. Operasyon araçlarına hızlı erişim.`}
        </p>
      </section>

      {isCustomer ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                Toplam Sipariş
              </p>
              <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">{orderTotal}</p>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                Favoriler
              </p>
              <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">{favoriteTotal}</p>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                Adresler
              </p>
              <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">{addressTotal}</p>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                Yorumlar
              </p>
              <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">{reviewTotal}</p>
            </div>
          </section>

          {!hasCustomerActivity ? (
            <section className="rounded-[var(--radius-xl)] border border-[#CFAE74] bg-[#FFF9EE] px-6 py-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7A5A24]">
                İlk Adımlar
              </p>
              <h2 className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
                Hesabınızı aktive edin
              </h2>
              <p className="mt-2 text-sm text-[var(--neutral-700)]">
                İlk siparişinizi oluşturmak için hızlı başlangıç adımlarını izleyin.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Link
                  href="/categories"
                  className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[#D9C08F] bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] hover:bg-[#FFFCF4]"
                >
                  Ürünleri keşfet
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/account/addresses"
                  className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[#D9C08F] bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] hover:bg-[#FFFCF4]"
                >
                  Adres ekle
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/account/profile"
                  className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[#D9C08F] bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] hover:bg-[#FFFCF4]"
                >
                  Profili tamamla
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </section>
          ) : null}

          <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                Son Sipariş
              </p>
              {ordersQuery.isLoading ? (
                <div className="mt-4">
                  <Spinner label="Siparişler yükleniyor..." />
                </div>
              ) : latestOrder ? (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-[var(--neutral-600)]">
                    Son sipariş numaranız{' '}
                    <span className="font-semibold text-[var(--primary-800)]">#{latestOrder.id}</span>.
                  </p>
                  <p className="text-sm text-[var(--neutral-600)]">
                    Durum: <span className="font-semibold text-[var(--primary-800)]">{latestOrder.statusKey}</span>
                  </p>
                  <p className="text-sm text-[var(--neutral-600)]">
                    Tutar: <span className="font-semibold text-[var(--primary-800)]">{formatPrice(latestOrder.totalAmountCents / 100)}</span>
                  </p>
                  <Link
                    href={`/account/orders/${latestOrder.id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--neutral-200)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] hover:bg-[var(--neutral-50)]"
                  >
                    Siparişe Git <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-4">
                  <p className="text-sm text-[var(--neutral-600)]">
                    Henüz siparişiniz yok. Alışverişe başlayabilirsiniz.
                  </p>
                  <Link
                    href="/categories"
                    className="mt-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] hover:underline"
                  >
                    Kataloğa git <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                Hızlı Erişim
              </p>
              <div className="mt-4 grid gap-3">
                {quickLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] hover:bg-[var(--neutral-50)]"
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
            Operasyon
          </p>
          <h2 className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
            {panelLabel} Kısayolları
          </h2>
          <p className="mt-2 text-sm text-[var(--neutral-600)]">
            Rolünüze ait panel araçlarına tek tıkla erişin.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] hover:bg-[var(--neutral-50)]"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
