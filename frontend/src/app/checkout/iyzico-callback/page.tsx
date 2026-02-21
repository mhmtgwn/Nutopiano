'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

import Button from '@/components/common/Button';
import api from '@/services/api';

type IyzicoRetrieveResponse = {
  status?: string;
  paymentStatus?: string;
  paymentId?: string;
  paidPrice?: number | string;
  errorMessage?: string;
  errorCode?: string;
  errorGroup?: string;
};

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

export default function IyzicoCallbackPage() {
  const searchParams = useSearchParams();
  const token = useMemo(() => (searchParams.get('token') ?? '').trim(), [searchParams]);
  const conversationId = useMemo(
    () => (searchParams.get('conversationId') ?? searchParams.get('conversation_id') ?? '').trim(),
    [searchParams],
  );

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IyzicoRetrieveResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setErrorMessage('Ödeme token bilgisi bulunamadı.');
        return;
      }

      try {
        setLoading(true);
        setErrorMessage(null);

        const resp = await api.post<IyzicoRetrieveResponse>('/payments/iyzico/retrieve', {
          token,
          conversationId: conversationId || undefined,
        });

        const data = resp.data ?? {};
        setResult(data);

        const paymentStatus = String(data.paymentStatus ?? '').toUpperCase();
        if (paymentStatus === 'SUCCESS') {
          toast.success('Ödeme başarılı.');
        } else if (paymentStatus) {
          toast.error('Ödeme tamamlanamadı.');
        }
      } catch (err) {
        const message = resolveApiErrorMessage(err, 'Ödeme sonucu alınamadı.');
        setErrorMessage(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [token, conversationId]);

  const normalizedStatus = String(result?.paymentStatus ?? '').toUpperCase();
  const isSuccess = normalizedStatus === 'SUCCESS';

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[var(--neutral-50)]">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 md:px-6 md:py-14">
        <header className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
            Ödeme sonucu
          </p>
          <h1 className="text-4xl font-serif text-[var(--primary-800)] md:text-5xl">
            iyzico ödeme
          </h1>
          <p className="text-sm text-[var(--neutral-600)] md:text-base">
            Ödeme sonucunuzu doğruluyoruz.
          </p>
        </header>

        <section className="space-y-4 rounded-[var(--radius-3xl)] border border-[var(--neutral-200)] bg-white/95 px-6 py-7 shadow-[var(--shadow-2xl)]">
          {errorMessage ? (
            <div className="rounded-[var(--radius-md)] border border-[var(--error-600)]/20 bg-[var(--error-100)] px-4 py-3 text-sm text-[var(--error-600)]">
              {errorMessage}
            </div>
          ) : null}

          {!errorMessage && loading ? (
            <div className="rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-3 text-sm text-[var(--neutral-600)]">
              Ödeme sonucu kontrol ediliyor...
            </div>
          ) : null}

          {!errorMessage && !loading && result ? (
            <div className="space-y-3">
              <div
                className={`rounded-[var(--radius-md)] border px-4 py-3 text-sm ${
                  isSuccess
                    ? 'border-[var(--success-300)] bg-[var(--success-50)] text-[var(--success-700)]'
                    : 'border-[var(--warning-300)] bg-[var(--warning-50)] text-[var(--warning-700)]'
                }`}
              >
                {isSuccess ? 'Ödeme başarılı.' : 'Ödeme tamamlanamadı.'}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                    Payment ID
                  </p>
                  <p className="mt-1 break-all text-sm font-semibold text-[var(--primary-800)]">
                    {result.paymentId ?? '-'}
                  </p>
                </div>
                <div className="rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                    Durum
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--primary-800)]">
                    {result.paymentStatus ?? '-'}
                  </p>
                </div>
              </div>

              {result.errorMessage ? (
                <div className="rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-3 text-sm text-[var(--neutral-700)]">
                  {result.errorMessage}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href="/account/orders">
              <Button className="rounded-full px-6">Siparişlerime git</Button>
            </Link>
            <Link href="/shop" className="text-sm text-[var(--primary-800)]/70 hover:text-[var(--primary-800)]">
              Alışverişe devam et
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
