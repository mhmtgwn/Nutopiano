'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

import Button from '@/components/common/Button';
import { mapProfileToUser, resolveProfilePanelHome } from '@/lib/profile-session';
import { useAppDispatch, useAppSelector } from '@/store';
import { setAuthError, setCredentials, startAuth } from '@/store/userSlice';
import api from '@/services/api';
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
  if (Array.isArray(message)) {
    return message.map(String).join(', ');
  }
  if (typeof message === 'string') return message;
  return fallback;
};

const isSafeInternalPath = (value: string | null): value is string =>
  typeof value === 'string' &&
  value.startsWith('/') &&
  !value.startsWith('//');

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = useAppSelector((state) => state.user.status);

  const isSubmitting = status === 'authenticating';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const trimmedPhone = phone.trim();
    const trimmedPassword = password.trim();

    if (!trimmedPhone) {
      toast.error('Lütfen telefon numarası girin.');
      return;
    }

    if (!trimmedPassword) {
      toast.error('Lütfen şifrenizi girin.');
      return;
    }

    try {
      dispatch(startAuth());

      const loginResponse = await api.post<{ accessToken: string }>(
        '/auth/login',
        { phone: trimmedPhone, password: trimmedPassword },
      );

      const token = loginResponse.data.accessToken;

      const profileResponse = await api.get<ProfileResponse>('/auth/profile');
      const profile = profileResponse.data;

      dispatch(
        setCredentials({
          user: mapProfileToUser(profile),
          token,
        }),
      );

      toast.success('Giriş başarılı.');

      const nextPath = searchParams.get('next');
      const storedRedirect =
        typeof window !== 'undefined'
          ? localStorage.getItem('redirectAfterLogin')
          : null;

      const redirectPath = isSafeInternalPath(nextPath)
        ? nextPath
        : isSafeInternalPath(storedRedirect)
          ? storedRedirect
          : resolveProfilePanelHome(profile);

      if (storedRedirect) {
        localStorage.removeItem('redirectAfterLogin');
      }

      router.push(redirectPath);
    } catch (error: unknown) {
      const message = resolveApiErrorMessage(error, 'Giriş yapılırken bir hata oluştu.');

      dispatch(setAuthError(message));
      toast.error(message);
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-[var(--primary-800)] md:text-3xl">
          Giriş Yap
        </h1>
        <p className="text-xs text-[var(--neutral-600)] md:text-sm">
          Nutopiano hesabınızla giriş yaparak sipariş, profil ve panel
          bilgilerinize erişin.
        </p>
      </header>

      <section className="max-w-md rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white px-4 py-5 shadow-[var(--shadow-md)] md:px-5 md:py-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="phone"
              className="text-xs font-medium text-[var(--primary-800)] md:text-sm"
            >
              Telefon Numarası
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)] shadow-sm outline-none focus-visible:border-[var(--primary-800)] focus-visible:ring-1 focus-visible:ring-[var(--primary-800)]"
              placeholder="Örn: 5XXXXXXXXX"
            />
            <p className="text-[11px] text-[var(--neutral-500)] md:text-xs">
              Telefon numarası ve şifreniz ile güvenli şekilde giriş yapın.
            </p>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="password"
              className="text-xs font-medium text-[var(--primary-800)] md:text-sm"
            >
              Şifre
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)] shadow-sm outline-none focus-visible:border-[var(--primary-800)] focus-visible:ring-1 focus-visible:ring-[var(--primary-800)]"
              placeholder="••••••"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            isLoading={isSubmitting}
          >
            Giriş Yap
          </Button>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
            <button
              type="button"
              onClick={() => router.push('/forgot-password')}
              className="font-medium text-[var(--primary-800)] underline-offset-4 hover:underline"
            >
              Şifremi unuttum
            </button>
            <button
              type="button"
              onClick={() => router.push('/register')}
              className="font-medium text-[var(--primary-800)] underline-offset-4 hover:underline"
            >
              Hesap oluştur
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
