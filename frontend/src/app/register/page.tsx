'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import Button from '@/components/common/Button';
import api from '@/services/api';
import { useAppDispatch, useAppSelector } from '@/store';
import { setAuthError, setCredentials, startAuth } from '@/store/userSlice';
import { setAuthToken } from '@/utils/helpers';

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

interface RegisterResponse {
  accessToken: string;
}

interface ProfileResponse {
  userId: string;
  name?: string;
  phone?: string;
  email?: string;
  role: string;
  businessId?: string | null;
}

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const dispatch = useAppDispatch();
  const router = useRouter();
  const status = useAppSelector((state) => state.user.status);
  const isSubmitting = status === 'authenticating';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedName) {
      toast.error('Lütfen ad soyad girin.');
      return;
    }

    if (!trimmedPhone) {
      toast.error('Lütfen telefon numarası girin.');
      return;
    }

    if (!trimmedEmail) {
      toast.error('Lütfen email girin.');
      return;
    }

    if (!trimmedPassword) {
      toast.error('Lütfen şifre girin.');
      return;
    }

    try {
      dispatch(startAuth());

      const registerResponse = await api.post<RegisterResponse>('/auth/register', {
        name: trimmedName,
        phone: trimmedPhone,
        email: trimmedEmail,
        password: trimmedPassword,
      });

      const token = registerResponse.data.accessToken;
      setAuthToken(token);

      const profileResponse = await api.get<ProfileResponse>('/auth/profile');
      const profile = profileResponse.data;

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

      toast.success('Kayıt başarılı.');
      router.push('/products');
    } catch (error: unknown) {
      const message = resolveApiErrorMessage(error, 'Kayıt olurken bir hata oluştu.');
      dispatch(setAuthError(message));
      setAuthToken(null);
      toast.error(message);
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-[var(--primary-800)] md:text-3xl">
          Hesap Oluştur
        </h1>
        <p className="text-xs text-[var(--neutral-600)] md:text-sm">
          Müşteri hesabınızı oluşturun ve alışverişe başlayın.
        </p>
      </header>

      <section className="max-w-md rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white px-4 py-5 shadow-[var(--shadow-md)] md:px-5 md:py-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="name"
              className="text-xs font-medium text-[var(--primary-800)] md:text-sm"
            >
              Ad Soyad
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)] shadow-sm outline-none focus-visible:border-[var(--primary-800)] focus-visible:ring-1 focus-visible:ring-[var(--primary-800)]"
              placeholder="Ad Soyad"
            />
          </div>

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
          </div>

          <div className="space-y-1">
            <label
              htmlFor="email"
              className="text-xs font-medium text-[var(--primary-800)] md:text-sm"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)] shadow-sm outline-none focus-visible:border-[var(--primary-800)] focus-visible:ring-1 focus-visible:ring-[var(--primary-800)]"
              placeholder="ornek@domain.com"
            />
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

          <Button type="submit" className="w-full" disabled={isSubmitting} isLoading={isSubmitting}>
            Kayıt Ol
          </Button>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="font-medium text-[var(--primary-800)] underline-offset-4 hover:underline"
            >
              Zaten hesabım var
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
