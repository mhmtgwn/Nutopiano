'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import Button from '@/components/common/Button';
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

export default function AdminPaymentWebhooksPage() {
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [events, setEvents] = useState<WebhookEventRow[]>([]);
  const [provider, setProvider] = useState('IYZICO');
  const [status, setStatus] = useState<string>('RECEIVED');

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (provider.trim()) p.set('provider', provider.trim());
    if (status.trim()) p.set('status', status.trim());
    return p.toString();
  }, [provider, status]);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await api.get<WebhookEventRow[]>(
        `/payments/admin/webhook-events${queryString ? `?${queryString}` : ''}`,
      );
      setEvents(Array.isArray(resp.data) ? resp.data : []);
    } catch (error) {
      const message = resolveApiErrorMessage(
        error,
        'Webhook event listesi alınamadı.',
      );
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const processReceived = useCallback(async () => {
    try {
      setProcessing(true);
      const resp = await api.post<ProcessResponse>(
        `/payments/admin/process-webhooks?provider=${encodeURIComponent(provider.trim() || 'IYZICO')}&limit=100`,
      );
      const data = resp.data;
      toast.success(
        `İşlendi: ${data.processed}, atlandı: ${data.skipped}, hata: ${data.failed}`,
      );
      await fetchEvents();
    } catch (error) {
      const message = resolveApiErrorMessage(
        error,
        'Webhook process sırasında hata oluştu.',
      );
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  }, [provider, fetchEvents]);

  return (
    <div className="space-y-6">
      <section className="border-b border-[var(--neutral-200)] pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              Ödeme / Webhook
            </p>
            <h1 className="mt-2 text-3xl font-serif text-[var(--primary-800)] md:text-4xl">
              Webhook event’leri
            </h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Provider event’lerini listele ve RECEIVED event’leri manuel işletebil.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              className="rounded-full px-5"
              disabled={loading}
              isLoading={loading}
              onClick={fetchEvents}
            >
              Yenile
            </Button>
            <Button
              className="rounded-full px-5"
              disabled={processing}
              isLoading={processing}
              onClick={processReceived}
            >
              RECEIVED işleme
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
            Provider
          </p>
          <input
            value={provider}
            onChange={(e) => setProvider(e.target.value.toUpperCase())}
            className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-3 py-2 text-sm text-[var(--primary-800)]"
            placeholder="IYZICO"
          />
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
            Status
          </p>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-3 py-2 text-sm text-[var(--primary-800)]"
          >
            <option value="RECEIVED">RECEIVED</option>
            <option value="PROCESSED">PROCESSED</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
            Toplam
          </p>
          <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
            {events.length}
          </p>
        </div>
      </section>

      <section className="rounded-[var(--radius-3xl)] border border-[var(--neutral-200)] bg-white/95 px-6 py-6 shadow-[var(--shadow-2xl)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
              <tr className="border-b border-[var(--neutral-200)]">
                <th className="py-3 pr-4">Provider</th>
                <th className="py-3 pr-4">Event ID</th>
                <th className="py-3 pr-4">Type</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Received</th>
                <th className="py-3 pr-4">Processed</th>
                <th className="py-3 pr-4">Error</th>
              </tr>
            </thead>
            <tbody className="text-[var(--primary-800)]">
              {events.map((ev) => (
                <tr
                  key={ev.id}
                  className="border-b border-[var(--neutral-100)] last:border-none"
                >
                  <td className="py-3 pr-4 font-semibold">{ev.provider}</td>
                  <td className="py-3 pr-4 max-w-[220px] break-all">{ev.eventId}</td>
                  <td className="py-3 pr-4 max-w-[220px] break-all">{ev.eventType ?? '-'}</td>
                  <td className="py-3 pr-4">{ev.status}</td>
                  <td className="py-3 pr-4">{new Date(ev.receivedAt).toLocaleString()}</td>
                  <td className="py-3 pr-4">
                    {ev.processedAt ? new Date(ev.processedAt).toLocaleString() : '-'}
                  </td>
                  <td className="py-3 pr-4 max-w-[320px] break-words text-[var(--error-600)]">
                    {ev.error ?? ''}
                  </td>
                </tr>
              ))}

              {events.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-sm text-[var(--neutral-500)]"
                  >
                    Kayıt bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
