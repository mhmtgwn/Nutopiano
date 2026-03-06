'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, LayoutDashboard } from 'lucide-react';

import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout, setAuthError, setCredentials, startAuth } from '@/store/userSlice';
import { getPanelLabelByRole, normalizeRole } from '@/lib/role-routing';
import type { PanelKey, ProfileResponse } from '@/types/profile';

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

const PANEL_META: Record<PanelKey, { title: string; href: string; note: string }> = {
  ADMIN: {
    title: 'Admin Paneli',
    href: '/admin',
    note: 'Platform ve business operasyonlarini yonetin.',
  },
  SELLER: {
    title: 'Satıcı Paneli',
    href: '/dashboard',
    note: 'Siparis, urun, musteri ve magaza akislarini yonetin.',
  },
  POS: {
    title: 'POS Paneli',
    href: '/pos',
    note: 'Kasa, vardiya ve satis islemlerini yonetin.',
  },
  CUSTOMER: {
    title: 'Musteri Paneli',
    href: '/account/orders',
    note: 'Siparis, profil ve adres akislarina erisin.',
  },
};

const fallbackAllowedPanels = (role?: string | null): PanelKey[] => {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return ['ADMIN', 'SELLER', 'POS', 'CUSTOMER'];
    case 'SELLER':
      return ['SELLER', 'POS'];
    case 'SELLER_STAFF':
      return [];
    case 'CUSTOMER':
      return ['CUSTOMER'];
    default:
      return [];
  }
};

const normalizeAllowedPanels = (
  allowedPanels: string[] | undefined,
  role?: string | null,
): PanelKey[] => {
  const direct = Array.isArray(allowedPanels)
    ? allowedPanels.filter((value): value is PanelKey =>
        value === 'ADMIN' || value === 'SELLER' || value === 'POS' || value === 'CUSTOMER',
      )
    : [];

  if (direct.length > 0) {
    return Array.from(new Set(direct));
  }

  return fallbackAllowedPanels(role);
};

export default function PanelGatewayPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, status } = useAppSelector((state) => state.user);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({
        userId: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        effectiveRole: user.effectiveRole,
        permissions: user.permissions,
        panelHome: user.panelHome,
        allowedPanels: user.allowedPanels,
        featureStatuses: user.featureStatuses,
        businessId: user.businessId,
      });
      return;
    }

    const fetchProfile = async () => {
      try {
        setIsLoadingProfile(true);
        dispatch(startAuth());

        const response = await api.get<ProfileResponse>('/auth/profile');
        const nextProfile = response.data;

        dispatch(
          setCredentials({
            user: {
              id: nextProfile.userId,
              name: nextProfile.name,
              phone: nextProfile.phone,
              email: nextProfile.email,
              role: nextProfile.role,
              effectiveRole: nextProfile.effectiveRole,
              permissions: nextProfile.permissions,
              panelHome: nextProfile.panelHome,
              allowedPanels: nextProfile.allowedPanels,
              featureStatuses: nextProfile.featureStatuses,
              businessId: nextProfile.businessId,
            },
            token: null,
          }),
        );

        setProfile(nextProfile);
      } catch (error: unknown) {
        const message = resolveApiErrorMessage(error, 'Yetkilendirme basarisiz.');
        dispatch(setAuthError(message));
        dispatch(logout());
        router.replace('/login?next=/panel');
      } finally {
        setIsLoadingProfile(false);
      }
    };

    void fetchProfile();
  }, [dispatch, router, user]);

  const isLoading = isLoadingProfile || status === 'authenticating';
  const allowedPanels = useMemo(
    () => normalizeAllowedPanels(profile?.allowedPanels, profile?.role),
    [profile?.allowedPanels, profile?.role],
  );

  if (isLoading && !profile) {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
          <Spinner fullscreen label="Panel erisimleri yukleniyor..." />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-[calc(100vh-140px)] bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
        <section className="rounded-2xl border border-[var(--neutral-200)] bg-gradient-to-br from-[#F7F1E5] via-white to-[#ECF6F3] px-6 py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
            Panel Kapisi
          </p>
          <h1 className="mt-2 text-3xl font-serif text-[var(--primary-800)] md:text-4xl">
            {profile.name ?? 'Nutopiano Kullanici'}
          </h1>
          <p className="mt-2 text-sm text-[var(--neutral-600)]">
            Rol: <span className="font-semibold">{getPanelLabelByRole(profile.role)}</span>
            {profile.effectiveRole ? ` | Effective: ${profile.effectiveRole}` : ''}
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {allowedPanels.map((panel) => {
            const item = PANEL_META[panel];
            return (
              <Link
                key={panel}
                href={item.href}
                className="group rounded-2xl border border-[var(--neutral-200)] bg-white px-5 py-5 transition hover:border-[var(--primary-300)] hover:bg-[var(--neutral-50)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                      {panel}
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-[var(--primary-800)]">
                      {item.title}
                    </h2>
                    <p className="mt-2 text-sm text-[var(--neutral-600)]">{item.note}</p>
                  </div>
                  <LayoutDashboard className="h-5 w-5 text-[var(--neutral-400)]" />
                </div>
                <p className="mt-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary-700)]">
                  Panele Git <ArrowRight className="h-3.5 w-3.5" />
                </p>
              </Link>
            );
          })}
        </section>

        {allowedPanels.length === 0 ? (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
            Bu hesap icin aktif panel erisimi bulunmuyor.
          </section>
        ) : null}
      </div>
    </div>
  );
}
