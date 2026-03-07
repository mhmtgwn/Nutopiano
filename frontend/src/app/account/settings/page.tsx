'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import Button from '@/components/common/Button';
import {
  isUserSessionIncomplete,
  mapProfileToUser,
  resolveUserPanelHome,
} from '@/lib/profile-session';
import { resolveApiErrorMessage } from '@/lib/api-errors';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout, setAuthError, setCredentials, startAuth } from '@/store/userSlice';
import api from '@/services/api';
import { getPanelLabelByRole } from '@/lib/role-routing';
import type { ProfileResponse } from '@/types/profile';

interface CustomerPreferencesResponse {
  allowSms: boolean;
  allowEmail: boolean;
  allowMarketing: boolean;
  kvkkConsent: boolean;
  kvkkConsentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AccountSettingsPage() {
  const { user, status } = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CustomerPreferencesResponse | null>(null);

  useEffect(() => {
    if (user && !isUserSessionIncomplete(user)) return;

    let isCancelled = false;

    const fetchProfile = async () => {
      try {
        setIsLoadingProfile(true);
        dispatch(startAuth());

        const response = await api.get<ProfileResponse>('/auth/profile');
        const nextUser = mapProfileToUser(response.data);

        if (isCancelled) return;

        dispatch(
          setCredentials({
            user: nextUser,
            token: null,
          }),
        );
      } catch (error: unknown) {
        const message = resolveApiErrorMessage(error, 'Profil bilgileri alınamadı.');
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
    if (user.role !== 'CUSTOMER') return;

    const fetchPreferences = async () => {
      try {
        setIsLoadingPreferences(true);
        const response = await api.get<CustomerPreferencesResponse>('/customer/preferences');
        setPreferences(response.data);
      } catch (error: unknown) {
        const message = resolveApiErrorMessage(error, 'Tercihler alınamadı.');
        toast.error(message);
      } finally {
        setIsLoadingPreferences(false);
      }
    };

    fetchPreferences();
  }, [user]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      dispatch(logout());
      toast.success('Çıkış yapıldı.');
      router.push('/');
    }
  };

  const isLoading = isLoadingProfile || status === 'authenticating';
  const hasStableUser = Boolean(user && !isUserSessionIncomplete(user));

  if (isLoading && !hasStableUser) {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-transparent">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
          <header className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
              Hesap
            </p>
            <h1 className="text-3xl font-serif leading-tight text-[var(--primary-800)] md:text-4xl">
              Ayarlar
            </h1>
            <p className="text-sm text-[var(--neutral-600)]">
              Bilgileriniz yükleniyor...
            </p>
          </header>
        </div>
      </div>
    );
  }

  if (!hasStableUser || !user) {
    return null;
  }

  const isCustomer = user.role === 'CUSTOMER';
  const hasBackofficePanel = !isCustomer;

  const canEditPreferences = isCustomer;

  const handleSavePreferences = async () => {
    if (!preferences) return;

    try {
      setIsSavingPreferences(true);
      const response = await api.patch<CustomerPreferencesResponse>('/customer/preferences', {
        allowSms: Boolean(preferences.allowSms),
        allowEmail: Boolean(preferences.allowEmail),
        allowMarketing: Boolean(preferences.allowMarketing),
        kvkkConsent: Boolean(preferences.kvkkConsent),
      });
      setPreferences(response.data);
      toast.success('Tercihler kaydedildi.');
    } catch (error: unknown) {
      const message = resolveApiErrorMessage(error, 'Tercihler kaydedilemedi.');
      toast.error(message);
    } finally {
      setIsSavingPreferences(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] bg-transparent">
      <div className="mx-auto flex max-w-6xl flex-col gap-7 px-4 py-8 md:px-6 md:py-10">
        <header className="surface-panel flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
              Hesap
            </p>
            <h1 className="mt-2 text-3xl font-serif text-[var(--primary-800)] md:text-4xl">
              Ayarlar
            </h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Hesabınızı yönetin ve hızlı işlemlere erişin.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={handleLogout}>
            Çıkış yap
          </Button>
        </header>

        <section className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => router.push('/account/profile')}
            className="surface-panel-muted p-5 text-left transition hover:-translate-y-0.5"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">Profil</p>
            <p className="mt-2 text-lg font-serif text-[var(--primary-800)]">Bilgilerimi güncelle</p>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">Ad, telefon, e-posta ve şifre işlemleri.</p>
          </button>

          <button
            type="button"
            onClick={() => router.push('/account/orders')}
            className="surface-panel-muted p-5 text-left transition hover:-translate-y-0.5"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">Siparişler</p>
            <p className="mt-2 text-lg font-serif text-[var(--primary-800)]">Siparişlerimi görüntüle</p>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">Geçmiş siparişler ve detaylar.</p>
          </button>

          <button
            type="button"
            onClick={() => router.push('/account/addresses')}
            className="surface-panel-muted p-5 text-left transition hover:-translate-y-0.5"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">Adresler</p>
            <p className="mt-2 text-lg font-serif text-[var(--primary-800)]">Adres defterim</p>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">Kargo ve fatura adresleri.</p>
          </button>

          <button
            type="button"
            onClick={() => router.push('/account/reviews')}
            className="surface-panel-muted p-5 text-left transition hover:-translate-y-0.5"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">Yorumlar</p>
            <p className="mt-2 text-lg font-serif text-[var(--primary-800)]">Yorumlarımı yönet</p>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">Değerlendirme ve yorumlar.</p>
          </button>
        </section>

        <section className="surface-panel p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
            Tercihler
          </p>
          <p className="mt-2 text-lg font-serif text-[var(--primary-800)]">Bildirimler ve Onaylar</p>
          <p className="mt-2 text-sm text-[var(--neutral-600)]">
            Bildirim ayarlarınızı buradan yönetebilirsiniz.
          </p>

          {!canEditPreferences ? (
            <div className="mt-4 rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-4 text-sm text-[var(--neutral-700)]">
              Bu alan sadece müşteri hesabı (CUSTOMER) ile kullanılabilir.
            </div>
          ) : isLoadingPreferences && !preferences ? (
            <div className="mt-4 rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white p-4 text-sm text-[var(--neutral-700)]">
              Tercihler yükleniyor...
            </div>
          ) : preferences ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white p-4 shadow-[var(--shadow-sm)]">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={preferences.allowSms}
                  onChange={(e) =>
                    setPreferences((prev) =>
                      prev
                        ? {
                            ...prev,
                            allowSms: e.target.checked,
                          }
                        : prev,
                    )
                  }
                />
                <span>
                  <span className="block text-sm font-semibold text-[var(--primary-800)]">SMS Bildirimleri</span>
                  <span className="mt-1 block text-sm text-[var(--neutral-600)]">Sipariş ve kampanya SMS bildirimleri.</span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white p-4 shadow-[var(--shadow-sm)]">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={preferences.allowEmail}
                  onChange={(e) =>
                    setPreferences((prev) =>
                      prev
                        ? {
                            ...prev,
                            allowEmail: e.target.checked,
                          }
                        : prev,
                    )
                  }
                />
                <span>
                  <span className="block text-sm font-semibold text-[var(--primary-800)]">E-posta Bildirimleri</span>
                  <span className="mt-1 block text-sm text-[var(--neutral-600)]">Sipariş ve kampanya e-postaları.</span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white p-4 shadow-[var(--shadow-sm)]">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={preferences.allowMarketing}
                  onChange={(e) =>
                    setPreferences((prev) =>
                      prev
                        ? {
                            ...prev,
                            allowMarketing: e.target.checked,
                          }
                        : prev,
                    )
                  }
                />
                <span>
                  <span className="block text-sm font-semibold text-[var(--primary-800)]">Pazarlama İzni</span>
                  <span className="mt-1 block text-sm text-[var(--neutral-600)]">Kampanya ve duyuru içerikleri için izin.</span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white p-4 shadow-[var(--shadow-sm)]">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={preferences.kvkkConsent}
                  onChange={(e) =>
                    setPreferences((prev) =>
                      prev
                        ? {
                            ...prev,
                            kvkkConsent: e.target.checked,
                          }
                        : prev,
                    )
                  }
                />
                <span>
                  <span className="block text-sm font-semibold text-[var(--primary-800)]">KVKK Onayı</span>
                  <span className="mt-1 block text-sm text-[var(--neutral-600)]">KVKK metnini okudum ve onaylıyorum.</span>
                </span>
              </label>

              <div className="md:col-span-2 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  onClick={handleSavePreferences}
                  disabled={isSavingPreferences}
                  isLoading={isSavingPreferences}
                >
                  Kaydet
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white p-4 text-sm text-[var(--neutral-700)]">
              Tercihler yüklenemedi.
            </div>
          )}
        </section>

        {hasBackofficePanel && (
          <section className="surface-panel-muted p-5 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">Yönetim</p>
            <p className="mt-2 text-lg font-serif text-[var(--primary-800)]">{getPanelLabelByRole(user.role)}</p>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Rolünüze ait operasyon arayüzüne geçiş yapın.
            </p>
            <div className="mt-4">
              <Button type="button" onClick={() => router.push(resolveUserPanelHome(user))}>
                Panele Git
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
