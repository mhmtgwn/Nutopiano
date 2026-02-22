'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Mail, Send, Server, ShieldCheck } from 'lucide-react';

import api from '@/services/api';

type SmtpConfig = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
};

type SettingResponse = {
  id: number;
  key: string;
  value: unknown;
};

const DEFAULT_CONFIG: SmtpConfig = {
  enabled: false,
  host: '',
  port: 587,
  secure: false,
  user: '',
  pass: '',
  fromName: 'Nutopiano',
  fromEmail: '',
  replyTo: '',
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

const normalizeConfig = (value: unknown): SmtpConfig => {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_CONFIG };
  }
  const row = value as Record<string, unknown>;

  return {
    enabled: Boolean(row.enabled),
    host: typeof row.host === 'string' ? row.host : '',
    port:
      typeof row.port === 'number' && Number.isFinite(row.port)
        ? Math.max(1, Math.floor(row.port))
        : 587,
    secure: Boolean(row.secure),
    user: typeof row.user === 'string' ? row.user : '',
    pass: typeof row.pass === 'string' ? row.pass : '',
    fromName: typeof row.fromName === 'string' ? row.fromName : 'Nutopiano',
    fromEmail: typeof row.fromEmail === 'string' ? row.fromEmail : '',
    replyTo: typeof row.replyTo === 'string' ? row.replyTo : '',
  };
};

export default function AdminSmtpPage() {
  const queryClient = useQueryClient();

  const configQuery = useQuery<SmtpConfig>({
    queryKey: ['admin-smtp-config'],
    queryFn: async () => {
      try {
        const res = await api.get<SettingResponse>('/settings/smtp.config');
        return normalizeConfig(res.data?.value);
      } catch {
        return { ...DEFAULT_CONFIG };
      }
    },
  });

  const [form, setForm] = useState<SmtpConfig>(DEFAULT_CONFIG);

  const hydrated = configQuery.data;
  const liveForm = hydrated && form.host === '' && form.user === '' && form.fromEmail === '' ? hydrated : form;

  const updateMutation = useMutation({
    mutationFn: async (nextConfig: SmtpConfig) => {
      await api.post('/settings/smtp.config', { value: nextConfig });
    },
    onSuccess: async () => {
      toast.success('SMTP ayarları kaydedildi.');
      await queryClient.invalidateQueries({ queryKey: ['admin-smtp-config'] });
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, 'SMTP ayarları kaydedilemedi.'));
    },
  });

  const isReady = useMemo(() => {
    return Boolean(
      liveForm.host.trim() && liveForm.user.trim() && liveForm.fromEmail.trim() && liveForm.port > 0,
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
              SMTP
            </p>
            <h1 className="mt-2 text-3xl font-serif text-[var(--primary-800)] md:text-4xl">
              Mail altyapısı
            </h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Sistemden giden sipariş ve bildirim mailleri için SMTP konfigürasyonu.
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
          <Server className="h-5 w-5 text-[var(--primary-800)]/70" />
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
            Sunucu
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--primary-800)]">{liveForm.host || '-'}</p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-5">
          <Mail className="h-5 w-5 text-[var(--primary-800)]/70" />
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
            Gönderici
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--primary-800)]">
            {liveForm.fromEmail || '-'}
          </p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-5">
          <Send className="h-5 w-5 text-[var(--primary-800)]/70" />
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
            Durum
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--primary-800)]">
            {liveForm.enabled ? 'Aktif' : 'Pasif'}
          </p>
        </div>
      </section>

      <section className="rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <h2 className="text-2xl font-serif text-[var(--primary-800)]">SMTP ayarları</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-3 text-sm text-[var(--primary-800)] md:col-span-2">
            <input
              type="checkbox"
              checked={liveForm.enabled}
              onChange={(e) => setForm((prev) => ({ ...liveForm, enabled: e.target.checked }))}
            />
            SMTP aktif
          </label>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              Host
            </label>
            <input
              value={liveForm.host}
              onChange={(e) => setForm((prev) => ({ ...liveForm, host: e.target.value }))}
              className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
              placeholder="smtp.example.com"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              Port
            </label>
            <input
              type="number"
              min={1}
              value={liveForm.port}
              onChange={(e) =>
                setForm((prev) => ({
                  ...liveForm,
                  port: Number(e.target.value) > 0 ? Number(e.target.value) : 587,
                }))
              }
              className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
            />
          </div>

          <label className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-3 text-sm text-[var(--primary-800)] md:col-span-2">
            <input
              type="checkbox"
              checked={liveForm.secure}
              onChange={(e) => setForm((prev) => ({ ...liveForm, secure: e.target.checked }))}
            />
            SSL/TLS (secure)
          </label>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              SMTP kullanıcı
            </label>
            <input
              value={liveForm.user}
              onChange={(e) => setForm((prev) => ({ ...liveForm, user: e.target.value }))}
              className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
              placeholder="apikey / username"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              SMTP parola / key
            </label>
            <input
              type="password"
              value={liveForm.pass}
              onChange={(e) => setForm((prev) => ({ ...liveForm, pass: e.target.value }))}
              className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              From name
            </label>
            <input
              value={liveForm.fromName}
              onChange={(e) => setForm((prev) => ({ ...liveForm, fromName: e.target.value }))}
              className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
              placeholder="Nutopiano"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              From email
            </label>
            <input
              type="email"
              value={liveForm.fromEmail}
              onChange={(e) => setForm((prev) => ({ ...liveForm, fromEmail: e.target.value }))}
              className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
              placeholder="noreply@nutopiano.com"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              Reply-to (opsiyonel)
            </label>
            <input
              type="email"
              value={liveForm.replyTo}
              onChange={(e) => setForm((prev) => ({ ...liveForm, replyTo: e.target.value }))}
              className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
              placeholder="support@nutopiano.com"
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
