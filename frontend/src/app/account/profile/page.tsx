'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import Button from '@/components/common/Button';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout, setAuthError, setCredentials, startAuth } from '@/store/userSlice';
import api from '@/services/api';

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

interface ProfileResponse {
  userId: string;
  name?: string;
  phone?: string;
  email?: string;
  role: string;
  businessId?: string | null;
}

type TabType = 'profile' | 'security' | 'admin';

export default function ProfilePage() {
  const { user, status } = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user) return;

    const fetchProfile = async () => {
      try {
        setIsLoadingProfile(true);
        dispatch(startAuth());

        const response = await api.get<ProfileResponse>('/auth/profile');
        const profile = response.data;

        dispatch(
          setCredentials({
            user: {
              id: profile.userId,
              name: profile.name,
              phone: profile.phone,
              email: profile.email,
              role: profile.role,
              businessId: profile.businessId,
            },
            token: null,
          }),
        );
      } catch (error: unknown) {
        const message = resolveApiErrorMessage(error, 'Profil bilgileri alınamadı.');

        dispatch(setAuthError(message));
        toast.error(message);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [user, dispatch]);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? '');
    setPhone(user.phone ?? '');
    setEmail(user.email ?? '');
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

  if (isLoading && !user) {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-[var(--neutral-50)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
          <header className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
              Hesap
            </p>
            <h1 className="text-3xl font-serif leading-tight text-[var(--primary-800)] md:text-4xl">
              Profil
            </h1>
            <p className="text-sm text-[var(--neutral-600)]">
              Profil bilgileriniz yükleniyor...
            </p>
          </header>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isAdmin = user.role === 'ADMIN';

  const handleSaveProfile = async () => {
    try {
      setIsSavingProfile(true);
      dispatch(startAuth());

      const response = await api.patch<ProfileResponse>('/auth/profile', {
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });

      const profile = response.data;

      dispatch(
        setCredentials({
          user: {
            id: profile.userId,
            name: profile.name,
            phone: profile.phone,
            email: profile.email,
            role: profile.role,
            businessId: profile.businessId,
          },
          token: null,
        }),
      );

      toast.success('Profil güncellendi.');
    } catch (error: unknown) {
      const message = resolveApiErrorMessage(error, 'Profil güncellenemedi.');
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
      toast.error('Mevcut şifrenizi girin.');
      return;
    }

    if (!trimmedNew) {
      toast.error('Yeni şifrenizi girin.');
      return;
    }

    if (!trimmedConfirm) {
      toast.error('Yeni şifrenizi onaylayın.');
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      toast.error('Yeni şifre ve doğrulama şifresi eşleşmemektedir.');
      return;
    }

    if (trimmedNew.length < 6) {
      toast.error('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }

    try {
      setIsChangingPassword(true);
      dispatch(startAuth());
      await api.post('/auth/change-password', {
        currentPassword: trimmedCurrent,
        newPassword: trimmedNew,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Şifre güncellendi.');
    } catch (error: unknown) {
      const message = resolveApiErrorMessage(error, 'Şifre güncellenemedi.');
      dispatch(setAuthError(message));
      toast.error(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-7 px-4 py-8 md:px-6 md:py-10">
        {/* Header */}
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
              Hesap
            </p>
            <h1 className="mt-2 text-3xl font-serif text-[var(--primary-800)] md:text-4xl">
              Profilim
            </h1>
          </div>
          <Button 
            type="button" 
            variant="secondary" 
            onClick={handleLogout}
          >
            Çıkış yap
          </Button>
        </header>

        {/* Tabs */}
        <div className="border-b border-[var(--neutral-200)]">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-3 text-sm font-semibold transition-colors ${
                activeTab === 'profile'
                  ? 'border-b-2 border-[var(--primary-800)] text-[var(--primary-800)]'
                  : 'text-[var(--neutral-500)] hover:text-[var(--neutral-700)]'
              }`}
            >
              Profil
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`pb-3 text-sm font-semibold transition-colors ${
                activeTab === 'security'
                  ? 'border-b-2 border-[var(--primary-800)] text-[var(--primary-800)]'
                  : 'text-[var(--neutral-500)] hover:text-[var(--neutral-700)]'
              }`}
            >
              Güvenlik
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`pb-3 text-sm font-semibold transition-colors ${
                  activeTab === 'admin'
                    ? 'border-b-2 border-[var(--primary-800)] text-[var(--primary-800)]'
                    : 'text-[var(--neutral-500)] hover:text-[var(--neutral-700)]'
                }`}
              >
                Yönetim
              </button>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <section className="border-t border-[var(--neutral-200)] pt-6">
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                    Bilgileri Görüntüle
                  </p>
                  <p className="mt-2 text-lg font-serif text-[var(--primary-800)]">
                    Hesap Bilgilerim
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                      Ad Soyad
                    </p>
                    <p className="mt-2 text-sm font-medium text-[var(--primary-800)]">
                      {user.name ?? '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                      Telefon
                    </p>
                    <p className="mt-2 text-sm font-medium text-[var(--primary-800)]">
                      {user.phone ?? '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                      Email
                    </p>
                    <p className="mt-2 text-sm font-medium text-[var(--primary-800)]">
                      {user.email ?? '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                      Rol
                    </p>
                    <p className="mt-2 text-sm font-medium text-[var(--primary-800)]">
                      {user.role}
                    </p>
                  </div>
                </div>
              </section>

              <section className="border-t border-[var(--neutral-200)] pt-6">
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                    Düzenle
                  </p>
                  <p className="mt-2 text-lg font-serif text-[var(--primary-800)]">
                    Bilgilerimi Güncelle
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label htmlFor="profileName" className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                      Ad Soyad
                    </label>
                    <input
                      id="profileName"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 text-sm font-medium text-[var(--primary-800)] shadow-[var(--shadow-sm)] outline-none transition focus-visible:border-[var(--primary-800)] focus-visible:ring-1 focus-visible:ring-[var(--primary-800)]"
                      placeholder="Ad Soyad"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="profilePhone" className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                      Telefon
                    </label>
                    <input
                      id="profilePhone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 text-sm font-medium text-[var(--primary-800)] shadow-[var(--shadow-sm)] outline-none transition focus-visible:border-[var(--primary-800)] focus-visible:ring-1 focus-visible:ring-[var(--primary-800)]"
                      placeholder="5XXXXXXXXX"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="profileEmail" className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                      Email
                    </label>
                    <input
                      id="profileEmail"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 text-sm font-medium text-[var(--primary-800)] shadow-[var(--shadow-sm)] outline-none transition focus-visible:border-[var(--primary-800)] focus-visible:ring-1 focus-visible:ring-[var(--primary-800)]"
                      placeholder="ornek@domain.com"
                    />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    isLoading={isSavingProfile}
                  >
                    Kaydet
                  </Button>
                </div>
              </section>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <section className="border-t border-[var(--neutral-200)] pt-6">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                  Güvenlik
                </p>
                <p className="mt-2 text-lg font-serif text-[var(--primary-800)]">
                  Şifre Değiştir
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-2">
                  <label htmlFor="currentPassword" className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                    Mevcut Şifre
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 text-sm font-medium text-[var(--primary-800)] shadow-[var(--shadow-sm)] outline-none transition focus-visible:border-[var(--primary-800)] focus-visible:ring-1 focus-visible:ring-[var(--primary-800)]"
                    placeholder="••••••"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="newPassword" className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                    Yeni Şifre
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 text-sm font-medium text-[var(--primary-800)] shadow-[var(--shadow-sm)] outline-none transition focus-visible:border-[var(--primary-800)] focus-visible:ring-1 focus-visible:ring-[var(--primary-800)]"
                    placeholder="••••••"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                    Yeni Şifre (Doğrula)
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 text-sm font-medium text-[var(--primary-800)] shadow-[var(--shadow-sm)] outline-none transition focus-visible:border-[var(--primary-800)] focus-visible:ring-1 focus-visible:ring-[var(--primary-800)]"
                    placeholder="••••••"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  isLoading={isChangingPassword}
                >
                  Şifreyi Güncelle
                </Button>
              </div>
            </section>
          )}

          {/* Admin Tab */}
          {activeTab === 'admin' && isAdmin && (
            <section className="border-t border-[var(--neutral-200)] pt-6">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                  Yönetim
                </p>
                <p className="mt-2 text-lg font-serif text-[var(--primary-800)]">
                  Admin Paneli
                </p>
                <p className="mt-2 text-sm text-[var(--neutral-600)]">
                  Ürünleri, kategorileri ve siparişleri yönetmek için panele geçin.
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button 
                  type="button" 
                  onClick={() => router.push('/admin')}
                >
                  Admin Paneline Git
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
