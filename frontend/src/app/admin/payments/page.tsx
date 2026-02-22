'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowUpRight, Banknote, CreditCard, RefreshCcw, ShieldCheck } from 'lucide-react';

import Spinner from '@/components/common/Spinner';
import api from '@/services/api';

type WebhookEventRow = {
  id: number;
  provider: string;
  eventId: string;
  eventType?: string | null;
  status: string;
  receivedAt: string;
  processedAt?: string | null;
  error?: string | null;
};

type ProcessResponse = {
  ok: true;
  total: number;
  processed: number;
  skipped: number;
  failed: number;
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

export default function AdminPaymentsPage() {
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState('IYZICO');

  const eventsQuery = useQuery<WebhookEventRow[]>({
    queryKey: ['admin-payments-events', provider],
    queryFn: async () => {
      const res = await api.get<WebhookEventRow[]>(
        `/payments/admin/webhook-events?provider=${encodeURIComponent(provider.trim() || 'IYZICO')}`,
      );
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const processMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<ProcessResponse>(
        `/payments/admin/process-webhooks?provider=${encodeURIComponent(provider.trim() || 'IYZICO')}&limit=100`,
      );
      return res.data;
    },
    onSuccess: async (data) => {
      toast.success(
        `İşlendi: ${data.processed}, atlandı: ${data.skipped}, hata: ${data.failed}`,
      );
      await queryClient.invalidateQueries({ queryKey: ['admin-payments-events'] });
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, 'Webhook işleme sırasında hata oluştu.'));
    },
  });

  const stats = useMemo(() => {
    const events = eventsQuery.data ?? [];
    const received = events.filter((e) => String(e.status).toUpperCase() === 'RECEIVED').length;
    const processed = events.filter((e) => String(e.status).toUpperCase() === 'PROCESSED').length;
    const failed = events.filter((e) => String(e.status).toUpperCase() === 'FAILED').length;
    return {
      total: events.length,
      received,
      processed,
      failed,
    };
  }, [eventsQuery.data]);

  const latestEvents = (eventsQuery.data ?? []).slice(0, 8);

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-gradient-to-br from-[#F7F1E5] via-white to-[#ECF6F3] px-6 py-6 shadow-[0_20px_60px_rgba(26,60,52,0.08)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              Ödeme
            </p>
            <h1 className="mt-2 text-3xl font-serif text-[var(--primary-800)] md:text-4xl">
              Ödeme operasyonu
            </h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Webhook akışını izleyin, hata kayıtlarını takip edin ve manuel işleme tetikleyin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              value={provider}
              onChange={(e) => setProvider(e.target.value.toUpperCase())}
              className="h-11 w-36 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm font-semibold uppercase tracking-[0.15em] text-[var(--primary-800)]"
            />
            <button
              type="button"
              onClick={() => processMutation.mutate()}
              disabled={processMutation.isPending || eventsQuery.isLoading}
              className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary-800)] px-5 text-[11px] font-semibold uppercase tracking-[0.25em] text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              RECEIVED işle
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
            Toplam event
          </p>
          <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">{stats.total}</p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
            RECEIVED
          </p>
          <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">{stats.received}</p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
            PROCESSED
          </p>
          <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">{stats.processed}</p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
            FAILED
          </p>
          <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">{stats.failed}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
          <Banknote className="h-5 w-5 text-[var(--primary-800)]/70" />
          <h2 className="mt-4 text-2xl font-serif text-[var(--primary-800)]">Havale / EFT</h2>
          <p className="mt-2 text-sm text-[var(--neutral-600)]">
            Manuel ödeme yöntemi ve banka açıklama metinlerini ayarlayın.
          </p>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
          <CreditCard className="h-5 w-5 text-[var(--primary-800)]/70" />
          <h2 className="mt-4 text-2xl font-serif text-[var(--primary-800)]">iyzico</h2>
          <p className="mt-2 text-sm text-[var(--neutral-600)]">
            Checkout initialize/retrieve ve webhook izleme burada merkezi olarak yönetilir.
          </p>
        </div>

        <Link
          href="/admin/payments/webhooks"
          className="group rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6 transition hover:bg-[var(--neutral-50)]"
        >
          <ShieldCheck className="h-5 w-5 text-[var(--primary-800)]/70" />
          <h2 className="mt-4 text-2xl font-serif text-[var(--primary-800)]">Webhook event’leri</h2>
          <p className="mt-2 text-sm text-[var(--neutral-600)]">
            Event listesini filtreleyin, error detaylarını inceleyin ve tekrar işleyin.
          </p>
          <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)]">
            Detaya git <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      </section>

      <section className="rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-2xl font-serif text-[var(--primary-800)]">Son event kayıtları</h2>
          <Link
            href="/admin/payments/webhooks"
            className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)]/80 hover:text-[var(--primary-800)]"
          >
            Tam liste
          </Link>
        </div>

        {eventsQuery.isLoading ? (
          <div className="pt-6">
            <Spinner label="Event listesi yükleniyor..." />
          </div>
        ) : null}

        {eventsQuery.isError ? (
          <div className="mt-6 rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {resolveApiErrorMessage(eventsQuery.error, 'Webhook eventleri alınamadı.')}
          </div>
        ) : null}

        {!eventsQuery.isLoading && !eventsQuery.isError && latestEvents.length === 0 ? (
          <p className="mt-6 text-sm text-[var(--neutral-600)]">Kayıt bulunamadı.</p>
        ) : null}

        {!eventsQuery.isLoading && !eventsQuery.isError && latestEvents.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                <tr>
                  <th className="pb-3 pr-4">Provider</th>
                  <th className="pb-3 pr-4">Event</th>
                  <th className="pb-3 pr-4">Durum</th>
                  <th className="pb-3 pr-4">Alındı</th>
                  <th className="pb-3">Hata</th>
                </tr>
              </thead>
              <tbody>
                {latestEvents.map((event) => (
                  <tr key={event.id} className="border-t border-[var(--neutral-200)]">
                    <td className="py-3 pr-4 font-semibold text-[var(--primary-800)]">{event.provider}</td>
                    <td className="max-w-[280px] truncate py-3 pr-4 text-[var(--neutral-700)]">
                      {event.eventType || event.eventId}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                          event.status.toUpperCase() === 'PROCESSED'
                            ? 'bg-[#E6FBF2] text-[#0F5132]'
                            : event.status.toUpperCase() === 'FAILED'
                              ? 'bg-[#FDECEC] text-[#9B1C1C]'
                              : 'bg-[#FFF7E6] text-[#7A4B00]'
                        }`}
                      >
                        {event.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-[var(--neutral-600)]">
                      {new Date(event.receivedAt).toLocaleString('tr-TR')}
                    </td>
                    <td className="max-w-[300px] break-words py-3 text-[var(--neutral-600)]">
                      {event.error || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
