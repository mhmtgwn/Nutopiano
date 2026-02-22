'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowUpRight, Tag, TicketPercent } from 'lucide-react';

import api from '@/services/api';
import Spinner from '@/components/common/Spinner';
import { formatPrice } from '@/lib/format';

interface SettingRow {
  id: number;
  key: string;
  value: unknown;
}

interface CouponPolicy {
  enabled: boolean;
  allowStacking: boolean;
  defaultMaxDiscountCents: number;
  defaultMinOrderCents: number;
  defaultValidityDays: number;
}

const DEFAULT_POLICY: CouponPolicy = {
  enabled: true,
  allowStacking: false,
  defaultMaxDiscountCents: 100000,
  defaultMinOrderCents: 0,
  defaultValidityDays: 30,
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

const readBoolean = (value: unknown, fallback = false) =>
  typeof value === 'boolean' ? value : fallback;

const readNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default function SellerCouponsPage() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery<SettingRow[]>({
    queryKey: ['seller-coupons-settings'],
    queryFn: async () => {
      const res = await api.get<SettingRow[]>('/settings');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const [policy, setPolicy] = useState<CouponPolicy>(DEFAULT_POLICY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!hydrated && settingsQuery.data) {
      const byKey = new Map(settingsQuery.data.map((s) => [s.key, s.value] as const));
      setPolicy({
        enabled: readBoolean(byKey.get('campaigns.coupons.enabled'), DEFAULT_POLICY.enabled),
        allowStacking: readBoolean(
          byKey.get('campaigns.coupons.allowStacking'),
          DEFAULT_POLICY.allowStacking,
        ),
        defaultMaxDiscountCents: Math.max(
          0,
          Math.floor(
            readNumber(
              byKey.get('campaigns.coupons.defaultMaxDiscountCents'),
              DEFAULT_POLICY.defaultMaxDiscountCents,
            ),
          ),
        ),
        defaultMinOrderCents: Math.max(
          0,
          Math.floor(
            readNumber(
              byKey.get('campaigns.coupons.defaultMinOrderCents'),
              DEFAULT_POLICY.defaultMinOrderCents,
            ),
          ),
        ),
        defaultValidityDays: Math.max(
          1,
          Math.floor(
            readNumber(
              byKey.get('campaigns.coupons.defaultValidityDays'),
              DEFAULT_POLICY.defaultValidityDays,
            ),
          ),
        ),
      });
      setHydrated(true);
    }
  }, [hydrated, settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (nextPolicy: CouponPolicy) => {
      await Promise.all([
        api.post('/settings/campaigns.coupons.enabled', { value: nextPolicy.enabled }),
        api.post('/settings/campaigns.coupons.allowStacking', {
          value: nextPolicy.allowStacking,
        }),
        api.post('/settings/campaigns.coupons.defaultMaxDiscountCents', {
          value: nextPolicy.defaultMaxDiscountCents,
        }),
        api.post('/settings/campaigns.coupons.defaultMinOrderCents', {
          value: nextPolicy.defaultMinOrderCents,
        }),
        api.post('/settings/campaigns.coupons.defaultValidityDays', {
          value: nextPolicy.defaultValidityDays,
        }),
      ]);
    },
    onSuccess: async () => {
      toast.success('Kupon politikası kaydedildi.');
      await queryClient.invalidateQueries({ queryKey: ['seller-coupons-settings'] });
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, 'Kupon politikası kaydedilemedi.'));
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              Satıcı
            </p>
            <h1 className="mt-2 text-2xl font-serif text-[var(--primary-800)]">Kupon politikası</h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Kupon kullanım kurallarını yönetin. Kupon kodu checkout sırasında uygulanır.
            </p>
          </div>
          <Link
            href="/dashboard/campaigns/automatic"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--neutral-200)] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)]"
          >
            Otomatik kampanyalar <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {settingsQuery.isLoading ? (
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-10">
          <Spinner label="Ayarlar yükleniyor..." />
        </div>
      ) : null}

      {settingsQuery.isError ? (
        <div className="rounded-[var(--radius-xl)] border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          Ayarlar yüklenemedi.
        </div>
      ) : null}

      {!settingsQuery.isLoading && !settingsQuery.isError ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-5">
              <Tag className="h-5 w-5 text-[var(--primary-800)]/70" />
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Kupon sistemi
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--primary-800)]">
                {policy.enabled ? 'Açık' : 'Kapalı'}
              </p>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-5">
              <TicketPercent className="h-5 w-5 text-[var(--primary-800)]/70" />
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Maksimum indirim
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--primary-800)]">
                {formatPrice(policy.defaultMaxDiscountCents / 100)}
              </p>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-5">
              <TicketPercent className="h-5 w-5 text-[var(--primary-800)]/70" />
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Geçerlilik
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--primary-800)]">
                {policy.defaultValidityDays} gün
              </p>
            </div>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
            <h2 className="text-xl font-serif text-[var(--primary-800)]">Kural ayarları</h2>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-3 text-sm text-[var(--primary-800)]">
                <input
                  type="checkbox"
                  checked={policy.enabled}
                  onChange={(e) => setPolicy((prev) => ({ ...prev, enabled: e.target.checked }))}
                />
                Kupon sistemi aktif
              </label>

              <label className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-3 text-sm text-[var(--primary-800)]">
                <input
                  type="checkbox"
                  checked={policy.allowStacking}
                  onChange={(e) =>
                    setPolicy((prev) => ({ ...prev, allowStacking: e.target.checked }))
                  }
                />
                Aynı siparişte kupon birikimi
              </label>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                  Varsayılan min. sipariş (kuruş)
                </label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={policy.defaultMinOrderCents}
                  onChange={(e) =>
                    setPolicy((prev) => ({
                      ...prev,
                      defaultMinOrderCents: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                  Varsayılan max. indirim (kuruş)
                </label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={policy.defaultMaxDiscountCents}
                  onChange={(e) =>
                    setPolicy((prev) => ({
                      ...prev,
                      defaultMaxDiscountCents: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                  Varsayılan geçerlilik (gün)
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={policy.defaultValidityDays}
                  onChange={(e) =>
                    setPolicy((prev) => ({
                      ...prev,
                      defaultValidityDays: Math.max(1, Number(e.target.value) || 1),
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => saveMutation.mutate(policy)}
              disabled={saveMutation.isPending}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary-800)] px-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saveMutation.isPending ? 'Kaydediliyor...' : 'Kupon politikasını kaydet'}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
