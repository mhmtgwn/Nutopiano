'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api from '@/services/api';
import Spinner from '@/components/common/Spinner';

type SellerApplicationRow = {
  id: number;
  userId: number;
  slug: string;
  displayName: string;
  description?: string | null;
  logoUrl?: string | null;
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

type PaginatedSellerApplications = {
  data: SellerApplicationRow[];
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

export default function AdminSellerApplicationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const {
    data: payload,
    isLoading,
    isError,
  } = useQuery<PaginatedSellerApplications>({
    queryKey: ['platform-seller-applications', { page, pageSize }],
    queryFn: async () => {
      const res = await api.get<PaginatedSellerApplications>('/platform/sellers/applications', {
        params: { page, pageSize },
      });
      return res.data;
    },
  });

  const applications = payload?.data ?? [];
  const meta = payload?.meta;

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.patch(`/platform/sellers/${id}/active`, { isActive: true });
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, 'Onaylanamadı.'));
    },
    onSuccess: async () => {
      toast.success('Başvuru onaylandı.');
      await queryClient.invalidateQueries({ queryKey: ['platform-seller-applications'] });
      await queryClient.invalidateQueries({ queryKey: ['platform-sellers'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.patch(`/platform/sellers/${id}/active`, { isActive: false });
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, 'Reddedilemedi.'));
    },
    onSuccess: async () => {
      toast.success('Başvuru reddedildi.');
      await queryClient.invalidateQueries({ queryKey: ['platform-seller-applications'] });
      await queryClient.invalidateQueries({ queryKey: ['platform-sellers'] });
    },
  });

  return (
    <div className="space-y-6">
      <section className="border-b border-[var(--neutral-200)] pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              Platform
            </p>
            <h1 className="mt-2 text-2xl font-serif text-[var(--primary-800)] md:text-3xl lg:text-4xl">
              Satıcı başvuruları
            </h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Bekleyen satıcı başvurularını inceleyin ve onaylayın.
            </p>
          </div>

          <Link
            href="/admin/sellers"
            className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)]"
          >
            Satıcılara dön
          </Link>
        </div>
      </section>

      <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white">
        <div className="flex items-center justify-between border-b border-[var(--neutral-200)] px-4 py-4 md:px-6">
          <h2 className="text-xl font-serif text-[var(--primary-800)]">Liste</h2>
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
            Toplam: {meta?.total ?? applications.length}
          </span>
        </div>

        {isLoading && (
          <div className="px-4 py-6 md:px-6">
            <Spinner fullscreen />
          </div>
        )}

        {isError && !isLoading && (
          <div className="px-4 py-6 text-sm text-[var(--neutral-600)] md:px-6">
            Başvurular yüklenemedi.
          </div>
        )}

        {!isLoading && !isError && applications.length === 0 && (
          <div className="px-4 py-10 text-sm text-[var(--neutral-600)] md:px-6">Başvuru bulunamadı.</div>
        )}

        {!isLoading && !isError && applications.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] border-collapse">
              <thead>
                <tr className="border-b border-[var(--neutral-200)] text-left text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                  <th className="px-4 py-3 md:px-6">Satıcı</th>
                  <th className="px-4 py-3 md:px-6">Slug</th>
                  <th className="px-4 py-3 md:px-6">Durum</th>
                  <th className="px-4 py-3 md:px-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--neutral-200)]">
                {applications.map((s) => (
                  <tr key={s.id} className="text-sm text-[var(--primary-800)]">
                    <td className="px-4 py-4 md:px-6">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{s.displayName}</p>
                        <p className="mt-1 text-xs text-[var(--neutral-600)]">
                          ID: {s.id} • User: {s.userId}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-[var(--neutral-600)] md:px-6">{s.slug}</td>
                    <td className="px-4 py-4 md:px-6">
                      <span className="inline-flex items-center rounded-full border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)]">
                        bekliyor
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right md:px-6">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/sellers/${s.id}`}
                          className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)]"
                        >
                          Detay
                        </Link>
                        <button
                          type="button"
                          disabled={approveMutation.isPending}
                          onClick={() => approveMutation.mutate(s.id)}
                          className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--primary-800)] bg-[var(--primary-800)] px-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-white transition hover:opacity-95 disabled:opacity-60"
                        >
                          Onayla
                        </button>
                        <button
                          type="button"
                          disabled={rejectMutation.isPending}
                          onClick={() => rejectMutation.mutate(s.id)}
                          className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)] disabled:opacity-60"
                        >
                          Reddet
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
    </div>
  );
}
