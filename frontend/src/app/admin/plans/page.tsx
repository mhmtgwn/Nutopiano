'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import api from '@/services/api';

type PlanInterval = 'MONTHLY' | 'YEARLY';

type PlanRow = {
  id: number;
  name: string;
  interval: PlanInterval;
  priceCents: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type PaginationMeta = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type PaginatedPlans = {
  data: PlanRow[];
  meta: PaginationMeta;
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

const intervalLabel: Record<PlanInterval, string> = {
  MONTHLY: 'Aylık',
  YEARLY: 'Yıllık',
};

export default function AdminPlansPage() {
  const queryClient = useQueryClient();

  const [interval, setInterval] = useState<'' | PlanInterval>('');
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [createName, setCreateName] = useState('');
  const [createInterval, setCreateInterval] = useState<PlanInterval>('MONTHLY');
  const [createPriceCents, setCreatePriceCents] = useState<number>(0);
  const [createCurrency, setCreateCurrency] = useState('TRY');

  const {
    data: plansPayload,
    isLoading,
    isError,
  } = useQuery<PaginatedPlans>({
    queryKey: ['admin-plans', { interval, activeFilter, page, pageSize }],
    queryFn: async () => {
      const res = await api.get<PaginatedPlans>('/platform/plans', {
        params: {
          interval: interval || undefined,
          isActive: activeFilter || undefined,
          page,
          pageSize,
        },
      });
      return res.data;
    },
  });

  const plans = plansPayload?.data ?? [];
  const meta = plansPayload?.meta;

  const createPlanMutation = useMutation({
    mutationFn: async () => {
      await api.post('/platform/plans', {
        name: createName.trim(),
        interval: createInterval,
        priceCents: Number(createPriceCents),
        currency: createCurrency.trim() || 'TRY',
        isActive: true,
      });
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, 'Plan oluşturulamadı.'));
    },
    onSuccess: async () => {
      toast.success('Plan oluşturuldu.');
      setCreateName('');
      setCreatePriceCents(0);
      await queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (payload: { id: number; isActive: boolean }) => {
      await api.patch(`/platform/plans/${payload.id}`, { isActive: payload.isActive });
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, 'Durum güncellenemedi.'));
    },
    onSuccess: async () => {
      toast.success('Durum güncellendi.');
      await queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
    },
  });

  const kpis = useMemo(() => {
    const total = meta?.total ?? plans.length;
    const activeCount = plans.filter((p) => p.isActive).length;
    return { total, activeCount };
  }, [plans, meta]);

  const canCreate = createName.trim().length > 0 && Number.isFinite(createPriceCents) && createPriceCents >= 0;

  return (
    <div className="space-y-6">
      <section className="border-b border-[var(--neutral-200)] pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              Platform
            </p>
            <h1 className="mt-2 text-2xl font-serif text-[var(--primary-800)] md:text-3xl lg:text-4xl">
              Planlar
            </h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Aylık ve yıllık planları yönetin.
            </p>
          </div>
          <div className="rounded-full border border-[var(--neutral-200)] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)]">
            Aktif: {kpis.activeCount} / {kpis.total}
          </div>
        </div>
      </section>

      <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white">
        <div className="flex flex-col gap-3 border-b border-[var(--neutral-200)] px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              Filtre
            </p>
            <p className="mt-1 text-sm text-[var(--neutral-600)]">
              Toplam: <span className="font-semibold text-[var(--primary-800)]">{meta?.total ?? plans.length}</span>
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <select
              value={interval}
              onChange={(e) => {
                setInterval(e.target.value as '' | PlanInterval);
                setPage(1);
              }}
              className="h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] outline-none transition focus:border-[var(--primary-800)]/30 md:w-40"
            >
              <option value="">Tümü</option>
              <option value="MONTHLY">Aylık</option>
              <option value="YEARLY">Yıllık</option>
            </select>

            <select
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value as '' | 'true' | 'false');
                setPage(1);
              }}
              className="h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] outline-none transition focus:border-[var(--primary-800)]/30 md:w-40"
            >
              <option value="">Tümü</option>
              <option value="true">Aktif</option>
              <option value="false">Pasif</option>
            </select>
          </div>
        </div>

        {isLoading && (
          <div className="px-4 py-6 text-sm text-[var(--neutral-600)] md:px-6">Planlar yükleniyor...</div>
        )}

        {isError && !isLoading && (
          <div className="px-4 py-6 text-sm text-[var(--neutral-600)] md:px-6">Planlar alınamadı.</div>
        )}

        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="border-b border-[var(--neutral-200)] text-left text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                  <th className="px-4 py-3 md:px-6">Plan</th>
                  <th className="px-4 py-3 md:px-6">Periyot</th>
                  <th className="px-4 py-3 md:px-6">Fiyat</th>
                  <th className="px-4 py-3 md:px-6">Durum</th>
                  <th className="px-4 py-3 md:px-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--neutral-200)]">
                {plans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-sm text-[var(--neutral-600)] md:px-6">
                      Plan bulunamadı.
                    </td>
                  </tr>
                ) : (
                  plans.map((p) => (
                    <tr key={p.id} className="text-sm text-[var(--primary-800)]">
                      <td className="px-4 py-4 md:px-6">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{p.name}</p>
                          <p className="mt-1 text-xs text-[var(--neutral-600)]">ID: {p.id}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 md:px-6">
                        <span className="inline-flex items-center rounded-full border border-[var(--neutral-200)] bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)]/70">
                          {intervalLabel[p.interval]}
                        </span>
                      </td>
                      <td className="px-4 py-4 md:px-6 font-semibold">
                        {(p.priceCents / 100).toFixed(2)} {p.currency}
                      </td>
                      <td className="px-4 py-4 md:px-6">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                            p.isActive
                              ? 'border-[var(--neutral-200)] bg-white text-[var(--primary-800)]/70'
                              : 'border-[var(--neutral-200)] bg-[var(--neutral-50)] text-[var(--primary-800)]'
                          }`}
                        >
                          {p.isActive ? 'aktif' : 'pasif'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right md:px-6">
                        <button
                          type="button"
                          disabled={toggleActiveMutation.isPending}
                          onClick={() => toggleActiveMutation.mutate({ id: p.id, isActive: !p.isActive })}
                          className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)] disabled:opacity-60"
                        >
                          {p.isActive ? 'Pasife al' : 'Aktifleştir'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !isError && meta && meta.totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--neutral-200)] px-4 py-4 text-xs text-[var(--neutral-600)] md:px-6">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)]/60">
              Sayfa {meta.page} / {meta.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={meta.page <= 1}
                className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Önceki
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={meta.page >= meta.totalPages}
                className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--primary-800)] bg-[var(--primary-800)] px-4 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-4 py-5 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              Yeni plan
            </p>
            <h2 className="mt-2 text-2xl font-serif text-[var(--primary-800)]">Plan oluştur</h2>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Aylık veya yıllık plan tanımlayın.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <input
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="Plan adı"
            className="h-11 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-sm text-[var(--primary-900)] outline-none transition placeholder:text-[var(--neutral-500)] focus:border-[var(--primary-800)]/30"
          />

          <select
            value={createInterval}
            onChange={(e) => setCreateInterval(e.target.value as PlanInterval)}
            className="h-11 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] outline-none transition focus:border-[var(--primary-800)]/30"
          >
            <option value="MONTHLY">Aylık</option>
            <option value="YEARLY">Yıllık</option>
          </select>

          <input
            value={String(createPriceCents)}
            onChange={(e) => setCreatePriceCents(Number(e.target.value))}
            inputMode="numeric"
            type="number"
            min={0}
            placeholder="Fiyat (kuruş)"
            className="h-11 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-sm text-[var(--primary-900)] outline-none transition placeholder:text-[var(--neutral-500)] focus:border-[var(--primary-800)]/30"
          />

          <input
            value={createCurrency}
            onChange={(e) => setCreateCurrency(e.target.value)}
            placeholder="Para birimi (TRY)"
            className="h-11 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-sm text-[var(--primary-900)] outline-none transition placeholder:text-[var(--neutral-500)] focus:border-[var(--primary-800)]/30"
          />
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={createPlanMutation.isPending || !canCreate}
            onClick={() => createPlanMutation.mutate()}
            className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--primary-800)] bg-[var(--primary-800)] px-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-white transition hover:opacity-95 disabled:opacity-60"
          >
            Oluştur
          </button>
        </div>
      </section>
    </div>
  );
}
