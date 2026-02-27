'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';

import api from '@/services/api';
import Spinner from '@/components/common/Spinner';
import { formatPrice } from '@/lib/format';

interface CustomerRow { id: number; name: string; phone: string; balance: number; }
interface PaginationMeta { total: number; page: number; pageSize: number; totalPages: number; }
interface PaginatedCustomers { data: CustomerRow[]; meta: PaginationMeta; }

export default function AdminCustomersPage() {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    clearTimeout((window as { _st?: ReturnType<typeof setTimeout> })._st);
    (window as { _st?: ReturnType<typeof setTimeout> })._st = setTimeout(() => setDebouncedSearch(val), 350);
  };

  const { data: payload, isLoading, isError } = useQuery<PaginatedCustomers>({
    queryKey: ['admin-customers', { page, pageSize, q: debouncedSearch }],
    queryFn: async () => (await api.get<PaginatedCustomers>('/platform/customers', {
      params: { q: debouncedSearch.trim() || undefined, page, pageSize },
    })).data,
  });

  const customers = payload?.data ?? [];
  const meta = payload?.meta;

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div>
        <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">Müşteriler</h1>
        <p className="mt-1 text-sm text-[var(--neutral-600)]">Kayıtlı müşteri havuzunu görüntüleyin.</p>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3 border-b border-[var(--neutral-200)] pb-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--neutral-600)]">
          {meta ? <><span className="font-semibold text-[var(--primary-800)]">{meta.total}</span> müşteri</> : ''}
        </p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--neutral-400)]" />
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="İsim veya telefon ara..."
            className="h-8 w-56 rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white pl-8 pr-3 text-xs text-[var(--neutral-700)] outline-none focus:border-[var(--primary-800)]/40"
          />
        </div>
      </div>

      {/* ── States ── */}
      {isLoading && <Spinner label="Müşteriler yükleniyor..." />}
      {isError && (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" /> Müşteriler yüklenemedi.
        </div>
      )}

      {/* ── Table ── */}
      {!isLoading && !isError && (
        customers.length === 0
          ? <p className="py-10 text-center text-sm text-[var(--neutral-500)]">Müşteri bulunamadı.</p>
          : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--neutral-200)]">
                    {['Müşteri', 'Telefon', 'Bakiye'].map((h) => (
                      <th key={h} className={`pb-3 pr-6 text-left text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)] ${h === 'Bakiye' ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--neutral-100)]">
                  {customers.map((c) => (
                    <tr key={c.id} className="transition-colors hover:bg-[var(--neutral-50)]">
                      <td className="py-3 pr-6">
                        <div className="flex items-center gap-3">
                          <div className="h-7 w-7 rounded-full bg-[var(--neutral-100)] flex items-center justify-center flex-shrink-0">
                            <span className="text-[11px] font-bold text-[var(--neutral-600)]">
                              {c.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--primary-800)]">{c.name}</p>
                            <p className="text-[11px] text-[var(--neutral-500)]">#{c.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-6 text-[var(--neutral-600)]">{c.phone || '—'}</td>
                      <td className="py-3 text-right font-semibold text-[var(--primary-800)]">
                        {formatPrice(c.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      )}

      {/* ── Pagination ── */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--neutral-200)] pt-4">
          <p className="text-xs text-[var(--neutral-500)]">Sayfa {meta.page} / {meta.totalPages}</p>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={meta.page <= 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white text-[var(--neutral-700)] hover:bg-[var(--neutral-50)] disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={meta.page >= meta.totalPages}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white text-[var(--neutral-700)] hover:bg-[var(--neutral-50)] disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
