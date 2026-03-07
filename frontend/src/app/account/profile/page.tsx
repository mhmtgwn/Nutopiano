'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Home,
  LayoutDashboard,
  Shield,
  type LucideProps,
} from 'lucide-react';

import Button from '@/components/common/Button';
import StatusBadge from '@/components/common/StatusBadge';
import {
  createPanelAccessManifest,
  getBackofficePanelEntries,
} from '@/lib/panel-access';
import { fetchProfileResponse } from '@/lib/profile-api';
import {
  isUserSessionIncomplete,
  mapProfileToUser,
} from '@/lib/profile-session';
import { useAppDispatch, useAppSelector } from '@/store';
import { setAuthError, setCredentials } from '@/store/userSlice';
import api from '@/services/api';
import { getPanelLabelByRole } from '@/lib/role-routing';
import type { FeatureStatusCode } from '@/types/profile';

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
  if (Array.isArray(message)) {
    return message.map(String).join(', ');
  }
  if (typeof message === 'string') return message;
  return fallback;
};

const featureStatusVariant = (
  status?: FeatureStatusCode,
): 'success' | 'warning' | 'error' | 'neutral' => {
  if (status === 'ACTIVE') return 'success';
  if (status === 'PLANNED') return 'warning';
  if (status === 'BLOCKED') return 'error';
  return 'neutral';
};

type TabType = 'profile' | 'security' | 'admin';
type MenuItem = {
  tab: TabType;
  label: string;
  icon: ComponentType<LucideProps>;
};

export default function ProfilePage() {
  const { user } = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user && !isUserSessionIncomplete(user)) return;

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
      } catch (error: unknown) {
        const message = resolveApiErrorMessage(error, 'Profil bilgileri alinamadi.');
        dispatch(setAuthError(message));
        toast.error(message);
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
  }, [user, dispatch]);

  useEffect(() => {
    if (!user) return;
    const parts = (user.name ?? '').trim().split(/\s+/).filter(Boolean);
    setFirstName(parts[0] ?? '');
    setLastName(parts.slice(1).join(' '));
    setPhone(user.phone ?? '');
    setEmail(user.email ?? '');
  }, [user]);

  const isLoading = isLoadingProfile;
  const hasStableUser = Boolean(user && !isUserSessionIncomplete(user));

  if (isLoading && !hasStableUser) {
    return (
      <div className="p-2">
        <p className="text-sm text-[#6b7280]">Profil bilgileri yukleniyor...</p>
      </div>
    );
  }

  if (!hasStableUser || !user) {
    return null;
  }

  const manifest = createPanelAccessManifest(user);
  const hasBackofficePanel = manifest.hasBackofficePanels;
  const panelEntries = getBackofficePanelEntries(manifest);

  const handleSaveProfile = async () => {
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ').trim();

    try {
      setIsSavingProfile(true);

      await api.patch('/auth/profile', {
        name: fullName || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });

      const nextUser = mapProfileToUser(await fetchProfileResponse());

      dispatch(
        setCredentials({
          user: nextUser,
          token: null,
        }),
      );

      toast.success('Profil guncellendi.');
    } catch (error: unknown) {
      const message = resolveApiErrorMessage(error, 'Profil guncellenemedi.');
      dispatch(setAuthError(message));
      toast.error(message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    const trimmedCurrent = currentPassword.trim();
    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedCurrent) {
      toast.error('Mevcut sifrenizi girin.');
      return;
    }

    if (!trimmedNew) {
      toast.error('Yeni sifrenizi girin.');
      return;
    }

    if (!trimmedConfirm) {
      toast.error('Yeni sifrenizi dogrulayin.');
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      toast.error('Yeni sifre ve dogrulama sifresi eslesmiyor.');
      return;
    }

    if (trimmedNew.length < 6) {
      toast.error('Yeni sifre en az 6 karakter olmali.');
      return;
    }

    try {
      setIsChangingPassword(true);
      await api.post('/auth/change-password', {
        currentPassword: trimmedCurrent,
        newPassword: trimmedNew,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Sifre guncellendi.');
    } catch (error: unknown) {
      const message = resolveApiErrorMessage(error, 'Sifre guncellenemedi.');
      dispatch(setAuthError(message));
      toast.error(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const menuItems: MenuItem[] = [
    { tab: 'profile', label: 'Hesap Bilgileri', icon: Home },
    { tab: 'security', label: 'Guvenlik', icon: Shield },
    ...(hasBackofficePanel
      ? [
          {
            tab: 'admin' as const,
            label: getPanelLabelByRole(user.role),
            icon: LayoutDashboard,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-[#111827]">Hesap Bilgileri</h1>

      <div className="space-y-5">
        <div className="flex flex-wrap gap-2 border-b border-[#e5e7eb] pb-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = item.tab === activeTab;
            return (
              <button
                key={`tab-${item.tab}`}
                type="button"
                onClick={() => setActiveTab(item.tab)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                  active
                    ? 'bg-[#f3f4f6] text-[#111827]'
                    : 'text-[#4b5563] hover:bg-[#f9fafb] hover:text-[#111827]'
                } sm:w-auto`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        <section className="min-w-0">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm font-medium text-[#374151]">
                  <span>Ad</span>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-11 w-full rounded-md border border-[#d1d5db] bg-white px-3 text-sm text-[#111827] outline-none transition focus:border-[#111827]"
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-[#374151]">
                  <span>Soyad</span>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-11 w-full rounded-md border border-[#d1d5db] bg-white px-3 text-sm text-[#111827] outline-none transition focus:border-[#111827]"
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-[#374151] md:col-span-2">
                  <span>E-posta</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 w-full rounded-md border border-[#d1d5db] bg-white px-3 text-sm text-[#111827] outline-none transition focus:border-[#111827]"
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-[#374151] md:col-span-2">
                  <span>Telefon</span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-11 w-full rounded-md border border-[#d1d5db] bg-white px-3 text-sm text-[#111827] outline-none transition focus:border-[#111827]"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 text-sm">
                  <span className="text-[#6b7280]">Rol</span>
                  <p className="flex h-11 items-center rounded-md border border-[#e5e7eb] bg-[#f9fafb] px-3 text-[#111827]">
                    {user.role}
                  </p>
                </div>
                <div className="space-y-1 text-sm">
                  <span className="text-[#6b7280]">Business ID</span>
                  <p className="flex h-11 items-center rounded-md border border-[#e5e7eb] bg-[#f9fafb] px-3 text-[#111827]">
                    {user.businessId ?? '-'}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7280]">
                  Erisim Baglami
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="space-y-1 text-sm">
                    <span className="text-[#6b7280]">Effective Rol</span>
                    <p className="font-medium text-[#111827]">
                      {user.effectiveRole ?? user.role}
                    </p>
                  </div>
                  <div className="space-y-1 text-sm">
                    <span className="text-[#6b7280]">Panel Home</span>
                    <p className="font-medium text-[#111827]">
                      {manifest.panelHome}
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7280]">
                    Izinler ({user.permissions?.length ?? 0})
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(user.permissions ?? []).length > 0 ? (
                      (user.permissions ?? []).slice(0, 32).map((permission) => (
                        <span
                          key={permission}
                          className="rounded-full border border-[#d1d5db] bg-white px-2.5 py-1 text-[11px] font-medium text-[#374151]"
                        >
                          {permission}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-[#6b7280]">Aktif izin bulunmuyor.</p>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7280]">
                    Ozellik Durumlari
                  </p>
                  <div className="mt-2 space-y-2">
                    {(user.featureStatuses ?? []).length > 0 ? (
                      (user.featureStatuses ?? []).map((item) => (
                        <div
                          key={item.key}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#e5e7eb] bg-white px-3 py-2"
                        >
                          <p className="text-sm font-medium text-[#111827]">{item.key}</p>
                          <div className="flex items-center gap-2">
                            {item.note ? (
                              <span className="text-xs text-[#6b7280]">{item.note}</span>
                            ) : null}
                            <StatusBadge variant={featureStatusVariant(item.status)}>
                              {item.status}
                            </StatusBadge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[#6b7280]">Durum bilgisi bulunmuyor.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-[#e5e7eb] pt-4">
                <Button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  isLoading={isSavingProfile}
                  className="h-11 min-w-[160px]"
                >
                  Guncelle
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-3">
              <label className="space-y-1 text-sm font-medium text-[#374151]">
                <span>Mevcut Sifre</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-11 w-full rounded-md border border-[#d1d5db] bg-white px-3 text-sm text-[#111827] outline-none transition focus:border-[#111827]"
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-[#374151]">
                <span>Yeni Sifre</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-11 w-full rounded-md border border-[#d1d5db] bg-white px-3 text-sm text-[#111827] outline-none transition focus:border-[#111827]"
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-[#374151]">
                <span>Yeni Sifre (Dogrula)</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11 w-full rounded-md border border-[#d1d5db] bg-white px-3 text-sm text-[#111827] outline-none transition focus:border-[#111827]"
                />
              </label>
              <Button
                type="button"
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                isLoading={isChangingPassword}
                className="mt-2 h-11 min-w-[160px]"
              >
                Sifreyi Guncelle
              </Button>
            </div>
          )}

          {activeTab === 'admin' && hasBackofficePanel && (
            <div className="space-y-3">
              <p className="text-sm text-[#6b7280]">
                Erisebildiginiz operasyon panelleri asagida listelenir.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {panelEntries.map((entry) => {
                  const Icon = entry.icon;
                  return (
                    <button
                      key={entry.href}
                      type="button"
                      onClick={() => router.push(entry.href)}
                      className="flex items-start gap-3 rounded-xl border border-[#e5e7eb] bg-white px-4 py-4 text-left transition hover:border-[#d1d5db] hover:bg-[#f9fafb]"
                    >
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#111827]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-[#111827]">
                          {entry.label}
                        </span>
                        <span className="mt-1 block text-xs text-[#6b7280]">
                          {entry.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {manifest.hasMultiplePanels ? (
                <Button
                  type="button"
                  onClick={() => router.push('/panel')}
                  className="h-11 min-w-[160px]"
                >
                  Panel Secici
                </Button>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
