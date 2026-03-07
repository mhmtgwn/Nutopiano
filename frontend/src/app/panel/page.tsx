'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, LayoutDashboard } from 'lucide-react';

import Spinner from '@/components/common/Spinner';
import { createPanelAccessManifest, getPanelSwitcherEntries } from '@/lib/panel-access';
import { fetchProfileResponse } from '@/lib/profile-api';
import {
  isUserSessionIncomplete,
  mapProfileToUser,
  mapUserToProfile,
} from '@/lib/profile-session';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout, setAuthError, setCredentials } from '@/store/userSlice';
import { getPanelLabelByRole } from '@/lib/role-routing';
import type { ProfileResponse } from '@/types/profile';

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

export default function PanelGatewayPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.user);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const hasRequestedFreshProfileRef = useRef(false);
  const manifest = useMemo(
    () => createPanelAccessManifest(profile ?? user ?? undefined),
    [profile, user],
  );

  useEffect(() => {
    const activeUser = user && !isUserSessionIncomplete(user) ? user : null;

    if (activeUser) {
      setProfile(mapUserToProfile(activeUser));
      return;
    }

    if (hasRequestedFreshProfileRef.current) return;

    hasRequestedFreshProfileRef.current = true;
    let isCancelled = false;

    const fetchProfile = async () => {
      try {
        setIsLoadingProfile(true);

        const nextUser = mapProfileToUser(await fetchProfileResponse());

        if (isCancelled) return;

        dispatch(
          setCredentials({
            user: nextUser,
            token: null,
          }),
        );

        setProfile(mapUserToProfile(nextUser));
      } catch (error: unknown) {
        const message = resolveApiErrorMessage(error, 'Yetkilendirme basarisiz.');
        dispatch(setAuthError(message));
        dispatch(logout());
        router.replace('/login?next=/panel');
      } finally {
        if (!isCancelled) {
          setIsLoadingProfile(false);
        }
      }
    };

    void fetchProfile();
    return () => {
      isCancelled = true;
    };
  }, [dispatch, router, user]);

  useEffect(() => {
    if (!profile) return;
    if (manifest.visiblePanels.length !== 1) return;
    const target = manifest.visiblePanels[0]?.href;
    if (target) {
      router.replace(target);
    }
  }, [manifest.visiblePanels, profile, router]);

  const isLoading = isLoadingProfile;
  const panelEntries = getPanelSwitcherEntries(manifest);

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
            Panel Switcher
          </p>
          <h1 className="mt-2 text-3xl font-serif text-[var(--primary-800)] md:text-4xl">
            {profile.name ?? 'Nutopiano Kullanici'}
          </h1>
          <p className="mt-2 text-sm text-[var(--neutral-600)]">
            Rol: <span className="font-semibold">{getPanelLabelByRole(profile.role)}</span>
            {profile.effectiveRole ? ` | Effective: ${profile.effectiveRole}` : ''}
          </p>
          <p className="mt-3 max-w-2xl text-sm text-[var(--neutral-600)]">
            Erisilebilir panel sayisi {manifest.visiblePanels.length}. Tek panel varsa otomatik
            yonlendirme yapilir, birden fazla panel varsa buradan secim yapabilirsiniz.
          </p>
        </section>

        {manifest.visiblePanels.length === 0 ? (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
            Bu hesap icin aktif panel erisimi bulunmuyor.
          </section>
        ) : null}

        {manifest.visiblePanels.length > 1 ? (
          <section className="mt-6 grid gap-4 md:grid-cols-2">
            {panelEntries.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-2xl border border-[var(--neutral-200)] bg-white px-5 py-5 transition hover:border-[var(--primary-300)] hover:bg-[var(--neutral-50)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                        Panel
                      </p>
                      <h2 className="mt-2 text-lg font-semibold text-[var(--primary-800)]">
                        {item.label}
                      </h2>
                      <p className="mt-2 text-sm text-[var(--neutral-600)]">
                        {item.description}
                      </p>
                    </div>
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--neutral-100)] text-[var(--primary-800)]">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <p className="mt-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary-700)]">
                    Ac <ArrowRight className="h-3.5 w-3.5" />
                  </p>
                </Link>
              );
            })}
          </section>
        ) : null}

        {manifest.primaryPanel ? (
          <section className="mt-6 rounded-2xl border border-[var(--neutral-200)] bg-white px-5 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--neutral-100)] text-[var(--primary-800)]">
                  <LayoutDashboard className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--primary-800)]">
                    Ana Panel
                  </p>
                  <p className="text-sm text-[var(--neutral-600)]">
                    {manifest.primaryPanel.label}
                  </p>
                </div>
              </div>
              <Link
                href={manifest.primaryPanel.href}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--neutral-200)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary-800)] hover:bg-[var(--neutral-50)]"
              >
                Panele Git <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
