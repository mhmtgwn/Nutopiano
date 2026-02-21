/* eslint-disable react/no-unescaped-entities */
'use client';

import { FormEvent, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Spinner from '@/components/common/Spinner';
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
  if (Array.isArray(message)) return message.map(String).join(', ');
  if (typeof message === 'string') return message;
  return fallback;
};

interface SettingRow {
  id: number;
  key: string;
  value: unknown;
}

export default function SellerSettingsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery<SettingRow[]>({
    queryKey: ['seller-settings'],
    queryFn: async () => {
      const res = await api.get<SettingRow[]>('/settings');
      return res.data;
    },
  });

  const settings = data ?? [];

  const [editKey, setEditKey] = useState('');
  const [editValueJson, setEditValueJson] = useState('');

  const selected = useMemo(() => {
    if (!editKey) return null;
    return settings.find((s) => s.key === editKey) ?? null;
  }, [editKey, settings]);

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const key = editKey.trim();
      if (!key) {
        throw new Error('Ayar anahtarı (key) zorunludur.');
      }
      let value: unknown;
      try {
        value = editValueJson.trim() ? JSON.parse(editValueJson) : null;
      } catch {
        throw new Error('Geçerli JSON giriniz.');
      }

      await api.post(`/settings/${encodeURIComponent(key)}`, {
        value,
      });
    },
    onSuccess: async () => {
      toast.success('Ayar kaydedildi.');
      await queryClient.invalidateQueries({ queryKey: ['seller-settings'] });
    },
    onError: (err: unknown) => {
      toast.error(resolveApiErrorMessage(err, 'Ayar kaydedilemedi.'));
    },
  });

  const handleSelect = (key: string) => {
    setEditKey(key);
    const row = settings.find((s) => s.key === key);
    setEditValueJson(row ? JSON.stringify(row.value ?? null, null, 2) : '');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    upsertMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
          Satıcı
        </p>
        <h1 className="mt-2 text-2xl font-serif text-[var(--primary-800)]">Ayarlar</h1>
        <p className="mt-2 text-sm text-[var(--neutral-600)]">
          İşletme ayarlarını görüntüleyin ve güncelleyin.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif text-[var(--primary-800)]">Ayar listesi</h2>
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
              {settings.length} kayıt
            </div>
          </div>

          {isLoading && <Spinner fullscreen label="Yükleniyor..." />}

          {isError && !isLoading && (
            <div className="mt-4 rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {resolveApiErrorMessage(error, 'Ayarlar yüklenemedi.')}
            </div>
          )}

          {!isLoading && !isError && (
            <div className="mt-4 space-y-2">
              {settings.map((s) => {
                const active = s.key === editKey;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => handleSelect(s.key)}
                    className={`w-full rounded-[var(--radius-lg)] border px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.2em] transition ${
                      active
                        ? 'border-[var(--primary-800)]/20 bg-[var(--primary-800)] text-white'
                        : 'border-[var(--neutral-200)] bg-white text-[var(--primary-800)] hover:bg-[var(--neutral-50)]'
                    }`}
                  >
                    {s.key}
                  </button>
                );
              })}
              {settings.length === 0 && (
                <div className="text-sm text-[var(--neutral-600)]">Henüz ayar kaydı yok.</div>
              )}
            </div>
          )}
        </section>

        <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
          <h2 className="text-lg font-serif text-[var(--primary-800)]">Ayar düzenle</h2>
          <p className="mt-2 text-sm text-[var(--neutral-600)]">
            Seçili ayarın JSON değerini güncelleyebilirsiniz.
          </p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-[var(--neutral-600)]">Key</label>
              <input
                value={editKey}
                onChange={(e) => setEditKey(e.target.value)}
                placeholder="ör: moderation_enabled"
                className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-sm outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--neutral-600)]">Value (JSON)</label>
              <textarea
                value={editValueJson}
                onChange={(e) => setEditValueJson(e.target.value)}
                rows={12}
                className="mt-2 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 py-3 font-mono text-xs outline-none"
              />
              {selected && (
                <p className="mt-2 text-xs text-[var(--neutral-500)]">
                  Mevcut değer yüklendi.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!editKey) return;
                  handleSelect(editKey);
                }}
                disabled={!editKey}
                className="inline-flex h-11 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Sıfırla
              </button>
              <button
                type="submit"
                disabled={upsertMutation.isPending}
                className="inline-flex h-11 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-800)] px-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Kaydet
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
