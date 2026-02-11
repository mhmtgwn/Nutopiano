'use client';

import { FormEvent, useState } from 'react';
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error('Lütfen email girin.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/auth/forgot-password', { email: trimmedEmail });
      toast.success('Eğer bu email kayıtlıysa şifre sıfırlama bağlantısı gönderildi.');
      router.push('/login');
    } catch (error: unknown) {
      toast.error(resolveApiErrorMessage(error, 'İşlem başarısız.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-[var(--primary-800)] md:text-3xl">
          Şifremi Unuttum
        </h1>
        <p className="text-xs text-[var(--neutral-600)] md:text-sm">
          Email adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
        </p>
      </header>

      <section className="max-w-md rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white px-4 py-5 shadow-[var(--shadow-md)] md:px-5 md:py-6">
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <Button type="submit" className="w-full" disabled={isSubmitting} isLoading={isSubmitting}>
            Gönder
          </Button>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="font-medium text-[var(--primary-800)] underline-offset-4 hover:underline"
            >
              Giriş sayfasına dön
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
