'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import api from '@/services/api';
import Spinner from '@/components/common/Spinner';

interface CustomerRow {
  id: number;
  name: string;
  phone: string;
  balance: number;
}

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface PaginatedCustomers {
  data: CustomerRow[];
  meta: PaginationMeta;
}

export default function AdminCustomersPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');

  const {
    data: customersPayload,
    isLoading,
    isError,
  } = useQuery<PaginatedCustomers>({
    queryKey: ['admin-customers', { page, pageSize, search }],
    queryFn: async () => {
      const res = await api.get<PaginatedCustomers>('/platform/customers', {
        params: {
          q: search.trim() || undefined,
          page,
          pageSize,
        },
      });
      return res.data;
    },
  });

  const customers = customersPayload?.data ?? [];
  const meta = customersPayload?.meta;

  const filteredCustomers = useMemo(() => {
    return customers;
  }, [customers]);

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-[#1A3C34]/10 bg-white/90 px-6 py-6 shadow-[0_30px_90px_rgba(26,60,52,0.12)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
              Merkez
            </p>
            <h1 className="text-3xl font-serif text-[#1A3C34] md:text-4xl">Müşteriler</h1>
            <p className="text-sm text-[#5C5C5C]">Müşteri kayıtlarını görüntüleyin.</p>
          </div>
          <div className="w-full max-w-xs">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="ID, isim veya telefon ara"
              className="h-11 w-full rounded-2xl border border-[#E5E5E0] bg-white px-4 text-sm text-[#1A3C34] shadow-sm outline-none"
            />
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-[#E0D7C6] bg-white/90 px-6 py-6 shadow-[0_20px_60px_rgba(26,60,52,0.08)]">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-serif text-[#1A3C34]">Liste</h2>
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#1A3C34]/60">
            Toplam: {meta?.total ?? customers.length}
          </span>
        </div>

        {isLoading && (
          <div className="pt-6">
            <Spinner fullscreen />
          </div>
        )}

        {isError && !isLoading && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Müşteriler yüklenemedi. Token veya yetki problemi olabilir.
          </div>
        )}

        {!isLoading && !isError && filteredCustomers.length === 0 && (
          <div className="mt-6 rounded-2xl border border-[#E0D7C6] bg-white px-4 py-4 text-sm text-[#5C5C5C]">
            Müşteri bulunamadı.
          </div>
        )}

        {!isLoading && !isError && filteredCustomers.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-[#1A3C34]/10 bg-white">
            <div className="grid grid-cols-[minmax(0,0.5fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)] gap-3 border-b border-[#E5E5E0] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#1A3C34]/60">
              <span>ID</span>
              <span>İsim</span>
              <span>Telefon</span>
              <span>Bakiye</span>
            </div>
            <div className="divide-y divide-[#F0F0EA]">
              {filteredCustomers.map((c) => (
                <div
                  key={c.id}
                  className="grid grid-cols-[minmax(0,0.5fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)] gap-3 px-4 py-3 text-sm text-[#1A3C34]"
                >
                  <div className="font-semibold">{c.id}</div>
                  <div className="truncate font-semibold">{c.name}</div>
                  <div className="text-sm text-[#5C5C5C]">{c.phone}</div>
                  <div className="text-sm text-[#5C5C5C]">{Number(c.balance ?? 0).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && !isError && meta && meta.totalPages > 1 && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E5E0] pt-4 text-xs text-[#5C5C5C]">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#1A3C34]/60">
              Sayfa {meta.page} / {meta.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={meta.page <= 1}
                className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] border border-[#E5E5E0] bg-white px-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#1A3C34] shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Önceki
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={meta.page >= meta.totalPages}
                className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] border border-[#1A3C34]/10 bg-[#1A3C34] px-4 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
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
