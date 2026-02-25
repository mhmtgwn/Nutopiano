'use client';

import Link from 'next/link';
import { ArrowUpRight, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { formatDate } from '@/utils/helpers';

type PaginationMeta = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type SellerRow = {
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

type PaginatedSellers = {
  data: SellerRow[];
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

export default function AdminSellersPage() {
  const [isActive, setIsActive] = useState<'true' | 'false' | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const {
    data: payload,
    isLoading,
    isError,
    error,
  } = useQuery<PaginatedSellers>({
    queryKey: ['platform-sellers', { isActive, page, pageSize }],
    queryFn: async () => {
      const res = await api.get<PaginatedSellers>('/platform/sellers', {
        params: {
          isActive: isActive || undefined,
          page,
          pageSize,
        },
      });
      return res.data;
    },
  });

  const items = payload?.data ?? [];
  const meta = payload?.meta;

  const summary = useMemo(() => {
    const activeCount = items.filter((s) => s.isActive).length;
    const inactiveCount = items.length - activeCount;
    return { activeCount, inactiveCount };
  }, [items]);

  return (
    <div className="space-y-6">
      <section className="border-b border-[var(--neutral-200)] pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              Platform
            </p>
            <h1 className="mt-2 text-3xl font-serif text-[var(--primary-800)] md:text-4xl">
              Satıcılar
            </h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Satıcı profillerini görüntüleyin ve durumlarını yönetin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={isActive}
              onChange={(e) => {
                setPage(1);
                setIsActive(e.target.value as any);
              }}
              className="h-11 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-sm"
            >
              <option value="">Tümü</option>
              <option value="true">Aktif</option>
              <option value="false">Pasif</option>
            </select>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--neutral-200)] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)]"
            >
              Genel bakış <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stat strip */}
      <div className="grid gap-4 border-b border-[var(--neutral-200)] pb-5 md:grid-cols-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
            Toplam
          </p>
          <p className="mt-1 text-2xl font-serif text-[var(--primary-800)]">{meta?.total ?? items.length}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
            Aktif
          </p>
          <p className="mt-1 text-2xl font-serif text-[#0F5132]">{summary.activeCount}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
            Pasif
          </p>
          <p className="mt-1 text-2xl font-serif text-[var(--neutral-600)]">{summary.inactiveCount}</p>
        </div>
      </div>

      {/* Data table - no card wrapper */}
      {isLoading ? (
        <div className="py-10">
          <Spinner fullscreen />
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
          {resolveApiErrorMessage(error, 'Satıcı listesi yüklenemedi.')}
        </div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center">
          <Users className="mx-auto h-8 w-8 text-[var(--neutral-400)]" />
          <p className="mt-3 text-sm text-[var(--neutral-500)]">Filtreye uygun satıcı bulunamadı.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead className="border-b border-[var(--neutral-200)]">
              <tr>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">ID</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">Satıcı</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">Slug</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">Durum</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">Güncelleme</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--neutral-100)]">
              {items.map((row) => (
                <tr key={row.id} className="transition hover:bg-[var(--neutral-50)]">
                  <td className="px-4 py-3 font-semibold text-[var(--primary-800)]">#{row.id}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[var(--primary-800)]">{row.displayName}</p>
                    <p className="text-xs text-[var(--neutral-500)]">User: {row.userId}</p>
                  </td>
                  <td className="px-4 py-3 text-[var(--neutral-700)]">{row.slug}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${row.isActive
                          ? 'bg-[#E6FBF2] text-[#0F5132]'
                          : 'bg-[#FDECEC] text-[#9B1C1C]'
                        }`}
                    >
                      {row.isActive ? 'aktif' : 'pasif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--neutral-600)]">{formatDate(row.updatedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/magaza/${row.slug}`}
                      className="text-sm font-semibold text-[var(--primary-800)] underline-offset-2 hover:underline"
                      target="_blank"
                    >
                      Profil
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
