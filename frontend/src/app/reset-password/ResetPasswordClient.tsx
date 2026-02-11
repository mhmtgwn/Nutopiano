'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import Button from '@/components/common/Button';
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

export default function ResetPasswordClient({ token }: { token: string }) {
  const router = useRouter();

  const normalizedToken = useMemo(() => token.trim(), [token]);

  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const trimmedPassword = password.trim();
    if (!normalizedToken) {
      toast.error('Token bulunamadı.');
      return;
    }

    if (!trimmedPassword) {
      toast.error('Lütfen yeni şifre girin.');
      return;
    }

    if (trimmedPassword !== password2.trim()) {
      toast.error('Şifreler eşleşmiyor.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/auth/reset-password', { token: normalizedToken, password: trimmedPassword });
      toast.success('Şifre güncellendi. Lütfen giriş yapın.');
      router.push('/login');
    } catch (error: unknown) {
      toast.error(resolveApiErrorMessage(error, 'Şifre güncellenemedi.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-[var(--primary-800)] md:text-3xl">
          Şifre Sıfırlama
        </h1>
        <p className="text-xs text-[var(--neutral-600)] md:text-sm">Yeni şifrenizi belirleyin.</p>
      </header>

      <section className="max-w-md rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white px-4 py-5 shadow-[var(--shadow-md)] md:px-5 md:py-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="password"
              className="text-xs font-medium text-[var(--primary-800)] md:text-sm"
            >
              Yeni Şifre
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

          <div className="space-y-1">
            <label
              htmlFor="password2"
              className="text-xs font-medium text-[var(--primary-800)] md:text-sm"
            >
              Yeni Şifre (Tekrar)
            </label>
            <input
              id="password2"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)] shadow-sm outline-none focus-visible:border-[var(--primary-800)] focus-visible:ring-1 focus-visible:ring-[var(--primary-800)]"
              placeholder="••••••"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting} isLoading={isSubmitting}>
            Şifreyi Güncelle
          </Button>
        </form>
      </section>
    </div>
  );
}
