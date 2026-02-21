/* eslint-disable react/no-unescaped-entities */
'use client';

import { FormEvent, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { formatDateTime, formatPrice } from '@/lib/format';

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

interface PayoutRow {
  id: number;
  beneficiaryUserId: number;
  amountCents: number;
  status: string;
  requestedAt: string;
  approvedAt?: string | null;
  completedAt?: string | null;
}

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface PaginatedPayouts {
  data: PayoutRow[];
  meta: PaginationMeta;
}

const statusBadgeClassName = (status: string) => {
  const key = String(status ?? '').trim().toLowerCase();
  if (key === 'pending') return 'bg-[#FFF7E6] text-[#7A4B00]';
  if (key === 'approved') return 'bg-[#E8F1FF] text-[#0B3B91]';
  if (key === 'completed') return 'bg-[#E6FBF2] text-[#0F5132]';
  return 'bg-[#F3EEE3] text-[#3E2723]';
};

export default function SellerFinancePage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [amountCents, setAmountCents] = useState('');

  const { data, isLoading, isError, error } = useQuery<PaginatedPayouts>({
    queryKey: ['seller-payouts', { page, pageSize }],
    queryFn: async () => {
      const res = await api.get<PaginatedPayouts>('/seller/finance/payouts', {
        params: {
          page,
          pageSize,
        },
      });
      return res.data;
    },
  });

  const items = data?.data ?? [];
  const meta = data?.meta;

  const summary = useMemo(() => {
    const totalAmountCents = items.reduce((acc, r) => acc + (Number(r.amountCents) || 0), 0);
    return {
      count: items.length,
      totalAmountCents,
      pendingCount: items.filter((r) => String(r.status).toLowerCase() === 'pending').length,
    };
  }, [items]);

  const requestMutation = useMutation({
    mutationFn: async () => {
      const parsed = Number(amountCents);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error('Tutar (kuruş) geçerli olmalıdır.');
      }
      await api.post('/seller/finance/payout-request', {
        amountCents: Math.floor(parsed),
      });
    },
    onSuccess: async () => {
      toast.success('Payout talebi oluşturuldu.');
      setAmountCents('');
      await queryClient.invalidateQueries({ queryKey: ['seller-payouts'] });
    },
    onError: (err: unknown) => {
      toast.error(resolveApiErrorMessage(err, 'Payout talebi oluşturulamadı.'));
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    requestMutation.mutate();
  };

  const paging = useMemo(() => {
    const totalPages = meta?.totalPages ?? 1;
    return {
      totalPages,
      canPrev: page > 1,
      canNext: page < totalPages,
    };
  }, [meta?.totalPages, page]);

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
          Satıcı
        </p>
        <h1 className="mt-2 text-2xl font-serif text-[var(--primary-800)]">Finans</h1>
        <p className="mt-2 text-sm text-[var(--neutral-600)]">
          Payout taleplerinizi oluşturun ve durumunu takip edin.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">Kayıt</p>
          <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">{summary.count}</p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">Bekleyen</p>
          <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">{summary.pendingCount}</p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">Toplam tutar</p>
          <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">{formatPrice(summary.totalAmountCents)}</p>
        </div>
      </div>

      <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <h2 className="text-xl font-serif text-[var(--primary-800)]">Payout talebi</h2>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="text-xs font-semibold text-[var(--neutral-600)]">Tutar (kuruş)</label>
            <input
              value={amountCents}
              onChange={(e) => setAmountCents(e.target.value)}
              inputMode="numeric"
              placeholder="Örn: 15000"
              className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-sm outline-none"
            />
            <p className="mt-2 text-xs text-[var(--neutral-500)]">Gösterim: {formatPrice(Number(amountCents) || 0)}</p>
          </div>
          <button
            type="submit"
            disabled={requestMutation.isPending}
            className="inline-flex h-11 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-800)] px-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Talep oluştur
          </button>
        </form>
      </section>

      <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-serif text-[var(--primary-800)]">Payout taleplerim</h2>
          <div className="rounded-full border border-[var(--neutral-200)] bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)]">
            {meta ? `Sayfa ${meta.page}/${meta.totalPages}` : 'Sayfa -'}
          </div>
        </div>

        {isLoading && <Spinner fullscreen label="Yükleniyor..." />}

        {isError && !isLoading && (
          <div className="mt-4 rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {resolveApiErrorMessage(error, 'Payout listesi yüklenemedi.')}
          </div>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <div className="mt-4 text-sm text-[var(--neutral-600)]">Kayıt bulunamadı.</div>
        )}

        {!isLoading && !isError && items.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--neutral-200)] text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                  <th className="py-3 pr-4">ID</th>
                  <th className="py-3 pr-4">Tutar</th>
                  <th className="py-3 pr-4">Durum</th>
                  <th className="py-3 pr-4">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--neutral-100)]">
                    <td className="py-3 pr-4 font-semibold text-[var(--primary-800)]">#{row.id}</td>
                    <td className="py-3 pr-4 font-semibold text-[var(--primary-800)]">
                      {formatPrice(row.amountCents ?? 0)}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${statusBadgeClassName(
                          row.status,
                        )}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-[var(--neutral-600)]">
                      {formatDateTime(row.requestedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!paging.canPrev}
            className={`inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border px-4 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${
              paging.canPrev
                ? 'border-[var(--neutral-200)] bg-white text-[var(--primary-800)] hover:bg-[var(--neutral-50)]'
                : 'cursor-not-allowed border-[var(--neutral-200)] bg-[var(--neutral-50)] text-[var(--neutral-400)]'
            }`}
          >
            Önceki
          </button>
          <div className="text-xs font-semibold text-[var(--neutral-600)]">
            Sayfa {page} / {paging.totalPages}
          </div>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(paging.totalPages, p + 1))}
            disabled={!paging.canNext}
            className={`inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border px-4 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${
              paging.canNext
                ? 'border-[var(--neutral-200)] bg-white text-[var(--primary-800)] hover:bg-[var(--neutral-50)]'
                : 'cursor-not-allowed border-[var(--neutral-200)] bg-[var(--neutral-50)] text-[var(--neutral-400)]'
            }`}
          >
            Sonraki
          </button>
        </div>
      </section>
    </div>
  );
}
