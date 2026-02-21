'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Spinner from '@/components/common/Spinner';
import PaginationControls from '@/components/common/PaginationControls';
import api from '@/services/api';
import { formatDate, formatPrice } from '@/utils/helpers';

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

type PaginationMeta = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type PayoutRow = {
  id: number;
  beneficiaryUserId: number;
  amountCents: number;
  status: string;
  requestedAt: string;
  approvedAt?: string | null;
  completedAt?: string | null;
};

type PaginatedPayouts = {
  data: PayoutRow[];
  meta: PaginationMeta;
};

const statusBadge = (status: string) => {
  const key = String(status ?? '').trim().toLowerCase();
  if (key === 'pending') return 'bg-[#FFF7E6] text-[#7A4B00]';
  if (key === 'approved') return 'bg-[#E8F1FF] text-[#0B3B91]';
  if (key === 'completed') return 'bg-[#E6FBF2] text-[#0F5132]';
  return 'bg-[#F3EEE3] text-[#3E2723]';
};

export default function AdminPlatformPayoutsPage() {
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<'pending' | 'approved' | 'completed' | ''>('pending');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const {
    data: payload,
    isLoading,
    isError,
    error,
  } = useQuery<PaginatedPayouts>({
    queryKey: ['platform-payouts', { status, page, pageSize }],
    queryFn: async () => {
      const res = await api.get<PaginatedPayouts>('/platform/finance/payouts', {
        params: {
          status: status || undefined,
          page,
          pageSize,
        },
      });
      return res.data;
    },
  });

  const items = payload?.data ?? [];
  const meta = payload?.meta;

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.patch(`/platform/finance/payouts/${id}/approve`);
      return res.data;
    },
    onSuccess: async () => {
      toast.success('Payout onaylandı.');
      await queryClient.invalidateQueries({ queryKey: ['platform-payouts'] });
    },
    onError: (err: unknown) => {
      toast.error(resolveApiErrorMessage(err, 'Payout onaylanamadı.'));
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.patch(`/platform/finance/payouts/${id}/complete`);
      return res.data;
    },
    onSuccess: async () => {
      toast.success('Payout tamamlandı.');
      await queryClient.invalidateQueries({ queryKey: ['platform-payouts'] });
    },
    onError: (err: unknown) => {
      toast.error(resolveApiErrorMessage(err, 'Payout tamamlanamadı.'));
    },
  });

  const summary = useMemo(() => {
    const totalAmount = items.reduce((acc, r) => acc + (Number(r.amountCents) || 0), 0);
    return {
      count: items.length,
      totalAmountCents: totalAmount,
    };
  }, [items]);

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col px-4 py-10 md:px-6">
        <Spinner fullscreen />
      </div>
    );
  }

  if (isError) {
    const message = resolveApiErrorMessage(error, 'Payout listesi yüklenemedi.');
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-serif text-[var(--primary-800)]">Payout Yönetimi</h1>
        <section className="space-y-3 rounded-[var(--radius-2xl)] border border-[var(--error-600)]/20 bg-[var(--error-100)] px-4 py-6 md:px-6">
          <p className="text-sm text-[var(--error-600)] md:text-base">{message}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="border-b border-[var(--neutral-200)] pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              Finans
            </p>
            <h1 className="mt-2 text-3xl font-serif text-[var(--primary-800)] md:text-4xl">
              Payout Yönetimi
            </h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Satıcı payout taleplerini onaylayın ve EFT sonrası tamamlayın.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value as any);
              }}
              className="h-11 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-sm"
            >
              <option value="pending">Bekleyen</option>
              <option value="approved">Onaylı</option>
              <option value="completed">Tamamlanan</option>
              <option value="">Tümü</option>
            </select>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
            Kayıt
          </p>
          <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">{summary.count}</p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
            Toplam tutar
          </p>
          <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
            {formatPrice(summary.totalAmountCents / 100)}
          </p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
            Sayfa
          </p>
          <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
            {meta ? `${meta.page}/${meta.totalPages}` : '-'}
          </p>
        </div>
      </section>

      {items.length === 0 ? (
        <section className="rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
          <p className="text-sm text-[var(--neutral-600)]">Kayıt bulunamadı.</p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white shadow-[var(--shadow-md)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-[var(--neutral-200)] bg-[var(--neutral-50)]">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">ID</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">Satıcı User</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">Tutar</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">Durum</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">Tarih</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--neutral-200)]">
                {items.map((row) => {
                  const canApprove = String(row.status).toLowerCase() === 'pending';
                  const canComplete = String(row.status).toLowerCase() === 'approved';

                  return (
                    <tr key={row.id} className="hover:bg-[var(--neutral-50)]">
                      <td className="px-4 py-3 font-semibold text-[var(--primary-800)]">#{row.id}</td>
                      <td className="px-4 py-3 text-[var(--neutral-700)]">{row.beneficiaryUserId}</td>
                      <td className="px-4 py-3 font-semibold text-[var(--primary-800)]">
                        {formatPrice((row.amountCents ?? 0) / 100)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${statusBadge(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--neutral-600)]">
                        {formatDate(row.requestedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={!canApprove || approveMutation.isPending || completeMutation.isPending}
                            onClick={() => {
                              const ok = window.confirm('Bu payout onaylansın mı?');
                              if (!ok) return;
                              approveMutation.mutate(row.id);
                            }}
                            className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Onayla
                          </button>
                          <button
                            type="button"
                            disabled={!canComplete || approveMutation.isPending || completeMutation.isPending}
                            onClick={() => {
                              const ok = window.confirm('EFT yapıldı mı? Tamamlansın mı?');
                              if (!ok) return;
                              completeMutation.mutate(row.id);
                            }}
                            className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-800)] px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Tamamla
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {meta && meta.totalPages > 1 && (
        <PaginationControls
          page={meta.page}
          totalPages={meta.totalPages}
          buildHref={(nextPage) => {
            void nextPage;
            return '#';
          }}
        />
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={meta.page <= 1}
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Önceki
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={meta.page >= meta.totalPages}
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Sonraki
          </button>
        </div>
      )}
    </div>
  );
}
