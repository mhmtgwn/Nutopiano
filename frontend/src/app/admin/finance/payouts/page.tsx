'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import ConflictResolutionModal from '@/components/common/ConflictResolutionModal';
import Spinner from '@/components/common/Spinner';
import PaginationControls from '@/components/common/PaginationControls';
import { useCapabilities } from '@/hooks/useCapabilities';
import { isConflictError, resolveApiErrorMessage } from '@/lib/api-errors';
import api from '@/services/api';
import { formatDate, formatPrice } from '@/utils/helpers';

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
  const { can } = useCapabilities();

  const [status, setStatus] = useState<'pending' | 'approved' | 'completed' | ''>('pending');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [conflictDetail, setConflictDetail] = useState<string | null>(null);
  const [markPaidTargetId, setMarkPaidTargetId] = useState<number | null>(null);

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
      if (isConflictError(err)) {
        setConflictDetail(
          resolveApiErrorMessage(
            err,
            'Payout durumu baska bir admin tarafindan degistirildi.',
          ),
        );
        return;
      }
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
      if (isConflictError(err)) {
        setConflictDetail(
          resolveApiErrorMessage(
            err,
            'Payout durumu baska bir admin tarafindan degistirildi.',
          ),
        );
        return;
      }
      toast.error(resolveApiErrorMessage(err, 'Payout tamamlanamadı.'));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.patch(`/platform/finance/payouts/${id}/reject`);
      return res.data;
    },
    onSuccess: async () => {
      toast.success('Payout reddedildi.');
      await queryClient.invalidateQueries({ queryKey: ['platform-payouts'] });
    },
    onError: (err: unknown) => {
      if (isConflictError(err)) {
        setConflictDetail(
          resolveApiErrorMessage(
            err,
            'Payout durumu baska bir admin tarafindan degistirildi.',
          ),
        );
        return;
      }
      toast.error(resolveApiErrorMessage(err, 'Payout reddedilemedi.'));
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
                  const canReject =
                    String(row.status).toLowerCase() === 'pending' ||
                    String(row.status).toLowerCase() === 'approved';
                  const canMutatePayout = can('MANAGE_PAYOUT');

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
                            disabled={
                              !canMutatePayout ||
                              !canApprove ||
                              approveMutation.isPending ||
                              completeMutation.isPending ||
                              rejectMutation.isPending
                            }
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
                            disabled={
                              !canMutatePayout ||
                              !canReject ||
                              approveMutation.isPending ||
                              completeMutation.isPending ||
                              rejectMutation.isPending
                            }
                            onClick={() => {
                              const ok = window.confirm('Bu payout reddedilsin mi?');
                              if (!ok) return;
                              rejectMutation.mutate(row.id);
                            }}
                            className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-red-200 bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Reddet
                          </button>
                          <button
                            type="button"
                            disabled={
                              !canMutatePayout ||
                              !canComplete ||
                              approveMutation.isPending ||
                              completeMutation.isPending ||
                              rejectMutation.isPending
                            }
                            onClick={() => {
                              setMarkPaidTargetId(row.id);
                            }}
                            className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-800)] px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Mark as Paid
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

      {!can('MANAGE_PAYOUT') ? (
        <section className="rounded-[var(--radius-xl)] border border-amber-200 bg-amber-50 px-6 py-4">
          <p className="text-sm text-amber-800">
            Bu hesap payout aksiyonlarini yurutemez (sadece goruntuleme).
          </p>
        </section>
      ) : null}

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

      {markPaidTargetId !== null ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            onClick={() => setMarkPaidTargetId(null)}
            className="absolute inset-0 bg-black/40"
            aria-label="Modali kapat"
          />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6 shadow-[var(--shadow-lg)]">
            <h3 className="text-lg font-semibold text-[var(--primary-800)]">Mark as Paid</h3>
            <p className="mt-3 text-sm text-[var(--neutral-700)]">
              Bu islem immutable ledger kaydi olusturacaktir. Devam etmek istiyor musunuz?
            </p>
            <p className="mt-2 text-xs text-[var(--neutral-600)]">
              Payout #{markPaidTargetId} durumu geri alinmayacak sekilde guncellenecektir.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMarkPaidTargetId(null)}
                className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--primary-800)]"
              >
                Vazgec
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetId = markPaidTargetId;
                  if (!targetId) return;
                  completeMutation.mutate(targetId, {
                    onSuccess: () => {
                      setMarkPaidTargetId(null);
                    },
                  });
                }}
                disabled={completeMutation.isPending}
                className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-800)] px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Evet, Onayla
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConflictResolutionModal
        isOpen={Boolean(conflictDetail)}
        detail={conflictDetail ?? undefined}
        onClose={() => setConflictDetail(null)}
        onRefresh={() => {
          setConflictDetail(null);
          void queryClient.invalidateQueries({ queryKey: ['platform-payouts'] });
        }}
      />
    </div>
  );
}
