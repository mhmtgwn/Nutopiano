'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import Button from '@/components/common/Button';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout, setAuthError, setCredentials, startAuth } from '@/store/userSlice';
import api from '@/services/api';
import { getAuthToken, setAuthToken } from '@/utils/helpers';

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

export default function ProfilePage() {
  const { user, status } = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (user) return;

    const token = getAuthToken();
    if (!token) return;

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
            token,
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

  const handleLogout = () => {
    setAuthToken(null);
    dispatch(logout());
    toast.success('Çıkış yapıldı.');
    router.push('/');
  };

  const hasToken = !!getAuthToken();
  const isLoading = isLoadingProfile || status === 'authenticating';

  if (!hasToken && !user) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:px-6 md:py-10">
        <h1 className="text-2xl font-semibold text-[#1A3C34] md:text-3xl">
          Profil
        </h1>
        <section className="space-y-3 rounded-2xl border border-[#E5E5E0] bg-white px-4 py-6 md:px-6">
          <p className="text-sm text-[#5C5C5C] md:text-base">
            Profil bilgilerinizi görüntülemek için önce giriş yapmanız gerekir.
          </p>
          <Button
            onClick={() => router.push('/login')}
            className="w-fit"
            variant="primary"
          >
            Giriş yap
          </Button>
        </section>
      </div>
    );
  }

  if (isLoading && !user) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:px-6 md:py-10">
        <h1 className="text-2xl font-semibold text-[#1A3C34] md:text-3xl">
          Profil
        </h1>
        <section className="space-y-2 rounded-2xl border border-[#E5E5E0] bg-white px-4 py-6 md:px-6">
          <p className="text-sm text-[#5C5C5C] md:text-base">
            Profil bilgileriniz yükleniyor...
          </p>
        </section>
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

      const token = getAuthToken();
      if (token) {
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
            token,
          }),
        );
      }

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

    if (!trimmedCurrent) {
      toast.error('Mevcut şifrenizi girin.');
      return;
    }

    if (!trimmedNew) {
      toast.error('Yeni şifrenizi girin.');
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
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10">
      <header className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A3C34] md:text-3xl">
            Profilim
          </h1>
          <p className="text-xs text-[#5C5C5C] md:text-sm">
            Hesap bilgilerinizi görüntüleyin ve oturumunuzu yönetin.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={handleLogout}
          className="self-start md:self-auto"
        >
          Çıkış yap
        </Button>
      </header>

      <section className="space-y-4 rounded-2xl border border-[#E5E5E0] bg-white px-4 py-5 md:px-5 md:py-6">
        <div className="space-y-1 text-sm text-[#1A3C34]">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#C5A059]">
            Kullanıcı Bilgileri
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[11px] text-[#8A8A8A] md:text-xs">Kullanıcı ID</p>
              <p className="text-sm font-medium md:text-base">{user.id}</p>
            </div>
            <div>
              <p className="text-[11px] text-[#8A8A8A] md:text-xs">Ad Soyad</p>
              <p className="text-sm font-medium md:text-base">{user.name ?? '-'}</p>
            </div>
            <div>
              <p className="text-[11px] text-[#8A8A8A] md:text-xs">Telefon</p>
              <p className="text-sm font-medium md:text-base">
                {user.phone ?? '-'}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#8A8A8A] md:text-xs">Email</p>
              <p className="text-sm font-medium md:text-base">{user.email ?? '-'}</p>
            </div>
            <div>
              <p className="text-[11px] text-[#8A8A8A] md:text-xs">Rol</p>
              <p className="text-sm font-medium md:text-base">{user.role}</p>
            </div>
            <div>
              <p className="text-[11px] text-[#8A8A8A] md:text-xs">İşletme ID</p>
              <p className="text-sm font-medium md:text-base">
                {user.businessId ?? '-'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-[#E5E5E0] bg-white px-4 py-5 md:px-5 md:py-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#C5A059]">
            Profil Düzenle
          </p>
          <h2 className="mt-2 text-lg font-semibold text-[#1A3C34]">
            Bilgilerim
          </h2>
          <p className="mt-1 text-sm text-[#5C5C5C]">
            Ad soyad, telefon ve email bilgilerinizi güncelleyin.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="profileName" className="text-xs font-medium text-[#1A3C34] md:text-sm">
              Ad Soyad
            </label>
            <input
              id="profileName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-md border border-[#E5E5E0] bg-white px-3 text-sm text-[#1A3C34] shadow-sm outline-none focus-visible:border-[#1A3C34] focus-visible:ring-1 focus-visible:ring-[#1A3C34]"
              placeholder="Ad Soyad"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="profilePhone" className="text-xs font-medium text-[#1A3C34] md:text-sm">
              Telefon
            </label>
            <input
              id="profilePhone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10 w-full rounded-md border border-[#E5E5E0] bg-white px-3 text-sm text-[#1A3C34] shadow-sm outline-none focus-visible:border-[#1A3C34] focus-visible:ring-1 focus-visible:ring-[#1A3C34]"
              placeholder="5XXXXXXXXX"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="profileEmail" className="text-xs font-medium text-[#1A3C34] md:text-sm">
              Email
            </label>
            <input
              id="profileEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-md border border-[#E5E5E0] bg-white px-3 text-sm text-[#1A3C34] shadow-sm outline-none focus-visible:border-[#1A3C34] focus-visible:ring-1 focus-visible:ring-[#1A3C34]"
              placeholder="ornek@domain.com"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={handleSaveProfile}
            className="w-full md:w-fit"
            disabled={isSavingProfile}
            isLoading={isSavingProfile}
          >
            Kaydet
          </Button>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-[#E5E5E0] bg-white px-4 py-5 md:px-5 md:py-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#C5A059]">
            Güvenlik
          </p>
          <h2 className="mt-2 text-lg font-semibold text-[#1A3C34]">
            Şifre Değiştir
          </h2>
          <p className="mt-1 text-sm text-[#5C5C5C]">
            Mevcut şifrenizle doğrulayın ve yeni şifrenizi belirleyin.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="currentPassword" className="text-xs font-medium text-[#1A3C34] md:text-sm">
              Mevcut Şifre
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="h-10 w-full rounded-md border border-[#E5E5E0] bg-white px-3 text-sm text-[#1A3C34] shadow-sm outline-none focus-visible:border-[#1A3C34] focus-visible:ring-1 focus-visible:ring-[#1A3C34]"
              placeholder="••••••"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="newPassword" className="text-xs font-medium text-[#1A3C34] md:text-sm">
              Yeni Şifre
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-10 w-full rounded-md border border-[#E5E5E0] bg-white px-3 text-sm text-[#1A3C34] shadow-sm outline-none focus-visible:border-[#1A3C34] focus-visible:ring-1 focus-visible:ring-[#1A3C34]"
              placeholder="••••••"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={handleChangePassword}
            className="w-full md:w-fit"
            disabled={isChangingPassword}
            isLoading={isChangingPassword}
          >
            Şifreyi Güncelle
          </Button>
        </div>
      </section>

      {isAdmin && (
        <section className="rounded-2xl border border-[#E5E5E0] bg-white px-4 py-5 md:px-5 md:py-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#C5A059]">
                Yönetim
              </p>
              <h2 className="mt-2 text-lg font-semibold text-[#1A3C34]">
                Admin paneli
              </h2>
              <p className="mt-1 text-sm text-[#5C5C5C]">
                Ürünleri, kategorileri ve siparişleri yönetmek için panele geçin.
              </p>
            </div>
            <Button type="button" onClick={() => router.push('/admin')} className="w-fit">
              Admin Paneline Git
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
