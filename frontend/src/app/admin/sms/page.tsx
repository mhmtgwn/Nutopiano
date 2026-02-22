'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Bell, MessageCircle, Send, ShieldCheck } from 'lucide-react';

import api from '@/services/api';

type SmsConfig = {
  enabled: boolean;
  provider: string;
  apiUrl: string;
  apiKey: string;
  sender: string;
  orderCreatedEnabled: boolean;
  orderShippedEnabled: boolean;
  orderCreatedTemplate: string;
  orderShippedTemplate: string;
};

type SettingResponse = {
  id: number;
  key: string;
  value: unknown;
};

const DEFAULT_CONFIG: SmsConfig = {
  enabled: false,
  provider: '',
  apiUrl: '',
  apiKey: '',
  sender: 'NUTOPIANO',
  orderCreatedEnabled: true,
  orderShippedEnabled: true,
  orderCreatedTemplate: 'Siparişiniz alındı. Sipariş no: {{orderId}}',
  orderShippedTemplate: 'Siparişiniz kargoya verildi. Takip no: {{trackingNumber}}',
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
  if (Array.isArray(message)) return message.map(String).join(', ');
  if (typeof message === 'string') return message;
  return fallback;
};

const normalizeConfig = (value: unknown): SmsConfig => {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_CONFIG };
  }
  const row = value as Record<string, unknown>;

  return {
    enabled: Boolean(row.enabled),
    provider: typeof row.provider === 'string' ? row.provider : '',
    apiUrl: typeof row.apiUrl === 'string' ? row.apiUrl : '',
    apiKey: typeof row.apiKey === 'string' ? row.apiKey : '',
    sender: typeof row.sender === 'string' ? row.sender : 'NUTOPIANO',
    orderCreatedEnabled: Boolean(
      row.orderCreatedEnabled !== undefined ? row.orderCreatedEnabled : true,
    ),
    orderShippedEnabled: Boolean(
      row.orderShippedEnabled !== undefined ? row.orderShippedEnabled : true,
    ),
    orderCreatedTemplate:
      typeof row.orderCreatedTemplate === 'string'
        ? row.orderCreatedTemplate
        : DEFAULT_CONFIG.orderCreatedTemplate,
    orderShippedTemplate:
      typeof row.orderShippedTemplate === 'string'
        ? row.orderShippedTemplate
        : DEFAULT_CONFIG.orderShippedTemplate,
  };
};

export default function AdminSmsPage() {
  const queryClient = useQueryClient();

  const configQuery = useQuery<SmsConfig>({
    queryKey: ['admin-sms-config'],
    queryFn: async () => {
      try {
        const res = await api.get<SettingResponse>('/settings/sms.config');
        return normalizeConfig(res.data?.value);
      } catch {
        return { ...DEFAULT_CONFIG };
      }
    },
  });

  const [form, setForm] = useState<SmsConfig>(DEFAULT_CONFIG);

  const liveForm =
    configQuery.data &&
    form.provider === '' &&
    form.apiUrl === '' &&
    form.apiKey === '' &&
    form.sender === 'NUTOPIANO'
      ? configQuery.data
      : form;

  const updateMutation = useMutation({
    mutationFn: async (nextConfig: SmsConfig) => {
      await api.post('/settings/sms.config', { value: nextConfig });
    },
    onSuccess: async () => {
      toast.success('SMS ayarları kaydedildi.');
      await queryClient.invalidateQueries({ queryKey: ['admin-sms-config'] });
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, 'SMS ayarları kaydedilemedi.'));
    },
  });

  const isReady = useMemo(() => {
    return Boolean(
      liveForm.provider.trim() &&
        liveForm.apiUrl.trim() &&
        liveForm.apiKey.trim() &&
        liveForm.sender.trim(),
    );
  }, [liveForm]);

  const syncFromServer = () => {
    if (configQuery.data) {
      setForm(configQuery.data);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-gradient-to-br from-[#F7F1E5] via-white to-[#ECF6F3] px-6 py-6 shadow-[0_20px_60px_rgba(26,60,52,0.08)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              SMS
            </p>
            <h1 className="mt-2 text-3xl font-serif text-[var(--primary-800)] md:text-4xl">
              SMS yönetimi
            </h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Sağlayıcı bilgisi, gönderici başlığı ve otomatik SMS tetiklerini yönetin.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--primary-800)]/20 bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)]">
            <ShieldCheck className="h-4 w-4" />
            {isReady ? 'Konfigürasyon hazır' : 'Eksik alan var'}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-5">
          <MessageCircle className="h-5 w-5 text-[var(--primary-800)]/70" />
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
            Sağlayıcı
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--primary-800)]">{liveForm.provider || '-'}</p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-5">
          <Send className="h-5 w-5 text-[var(--primary-800)]/70" />
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
            Gönderici
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--primary-800)]">{liveForm.sender || '-'}</p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-5">
          <Bell className="h-5 w-5 text-[var(--primary-800)]/70" />
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
            Durum
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--primary-800)]">
            {liveForm.enabled ? 'Aktif' : 'Pasif'}
          </p>
        </div>
      </section>

      <section className="rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <h2 className="text-2xl font-serif text-[var(--primary-800)]">SMS ayarları</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-3 text-sm text-[var(--primary-800)] md:col-span-2">
            <input
              type="checkbox"
              checked={liveForm.enabled}
              onChange={(e) => setForm((prev) => ({ ...liveForm, enabled: e.target.checked }))}
            />
            SMS aktif
          </label>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              Sağlayıcı
            </label>
            <input
              value={liveForm.provider}
              onChange={(e) => setForm((prev) => ({ ...liveForm, provider: e.target.value }))}
              className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
              placeholder="Netgsm / Twilio / ... "
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              API URL
            </label>
            <input
              value={liveForm.apiUrl}
              onChange={(e) => setForm((prev) => ({ ...liveForm, apiUrl: e.target.value }))}
              className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
              placeholder="https://api.provider.com/sms"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              API key
            </label>
            <input
              type="password"
              value={liveForm.apiKey}
              onChange={(e) => setForm((prev) => ({ ...liveForm, apiKey: e.target.value }))}
              className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              Gönderici başlığı
            </label>
            <input
              value={liveForm.sender}
              onChange={(e) => setForm((prev) => ({ ...liveForm, sender: e.target.value.toUpperCase() }))}
              className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
              placeholder="NUTOPIANO"
            />
          </div>

          <label className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-3 text-sm text-[var(--primary-800)]">
            <input
              type="checkbox"
              checked={liveForm.orderCreatedEnabled}
              onChange={(e) =>
                setForm((prev) => ({ ...liveForm, orderCreatedEnabled: e.target.checked }))
              }
            />
            Sipariş oluşturuldu SMS tetiği
          </label>

          <label className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-3 text-sm text-[var(--primary-800)]">
            <input
              type="checkbox"
              checked={liveForm.orderShippedEnabled}
              onChange={(e) =>
                setForm((prev) => ({ ...liveForm, orderShippedEnabled: e.target.checked }))
              }
            />
            Sipariş kargoda SMS tetiği
          </label>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              Sipariş oluşturuldu şablonu
            </label>
            <textarea
              value={liveForm.orderCreatedTemplate}
              onChange={(e) =>
                setForm((prev) => ({ ...liveForm, orderCreatedTemplate: e.target.value }))
              }
              rows={3}
              className="mt-2 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 py-2 text-sm text-[var(--primary-800)]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              Sipariş kargoda şablonu
            </label>
            <textarea
              value={liveForm.orderShippedTemplate}
              onChange={(e) =>
                setForm((prev) => ({ ...liveForm, orderShippedTemplate: e.target.value }))
              }
              rows={3}
              className="mt-2 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 py-2 text-sm text-[var(--primary-800)]"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => updateMutation.mutate(liveForm)}
            disabled={updateMutation.isPending || configQuery.isLoading}
            className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary-800)] px-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          <button
            type="button"
            onClick={syncFromServer}
            disabled={configQuery.isLoading}
            className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white px-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Sunucudan yenile
          </button>
        </div>
      </section>
    </div>
  );
}
