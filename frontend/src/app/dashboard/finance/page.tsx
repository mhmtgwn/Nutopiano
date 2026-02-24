'use client';

import { FormEvent, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { formatDateTime, formatPrice } from '@/lib/format';

interface FinanceOverview {
  range: { startAt: string; endAt: string };
  orderCount: number;
  grossRevenueCents: number;
  collectedCents: number;
  grossProfitCents: number;
  netProfitV2Cents: number;
  shippingCostCents: number;
  commissionCostCents: number;
  returnCostCents: number;
  openCreditCents: number;
  warnCount: number;
  averageOrderValueCents: number;
}

interface UserSalesReport {
  range: { startAt: string; endAt: string };
  rows: Array<{
    userId: number;
    userName: string;
    role: string | null;
    orderCount: number;
    salesTotalCents: number;
    profitCents: number;
    netProfitV2Cents: number;
    shippingCostCents: number;
    commissionCostCents: number;
    returnCostCents: number;
    averageOrderValueCents: number;
  }>;
  totals: {
    orderCount: number;
    salesTotalCents: number;
    profitCents: number;
    netProfitV2Cents: number;
    shippingCostCents: number;
    commissionCostCents: number;
    returnCostCents: number;
  };
}

interface ProductProfitReport {
  range: { startAt: string; endAt: string };
  rows: Array<{
    productId: number;
    productName: string;
    quantity: number;
    salesCents: number;
    costCents: number;
    profitCents: number;
    netProfitV2Cents: number;
    shippingCostCents: number;
    commissionCostCents: number;
    returnCostCents: number;
  }>;
  totals: {
    quantity: number;
    salesCents: number;
    costCents: number;
    profitCents: number;
    netProfitV2Cents: number;
    shippingCostCents: number;
    commissionCostCents: number;
    returnCostCents: number;
  };
}

interface PayoutRow {
  id: number;
  amountCents: number;
  status: string;
  requestedAt: string;
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

const statusBadgeClassName = (status: string) => {
  const key = String(status ?? '').trim().toLowerCase();
  if (key === 'pending') return 'bg-[#FFF7E6] text-[#7A4B00]';
  if (key === 'approved') return 'bg-[#E8F1FF] text-[#0B3B91]';
  if (key === 'completed') return 'bg-[#E6FBF2] text-[#0F5132]';
  return 'bg-[#F3EEE3] text-[#3E2723]';
};

export default function SellerFinancePage() {
  const queryClient = useQueryClient();

  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [amountCents, setAmountCents] = useState('');

  const filters = useMemo(
    () => ({
      dateFrom: dateFrom.trim() || undefined,
      dateTo: dateTo.trim() || undefined,
    }),
    [dateFrom, dateTo],
  );

  const overviewQuery = useQuery<FinanceOverview>({
    queryKey: ['seller-finance-overview', filters],
    queryFn: async () => {
      const res = await api.get<FinanceOverview>('/seller/finance/overview', {
        params: filters,
      });
      return res.data;
    },
  });

  const userSalesQuery = useQuery<UserSalesReport>({
    queryKey: ['seller-finance-user-sales', filters],
    queryFn: async () => {
      const res = await api.get<UserSalesReport>('/seller/finance/reports/users', {
        params: filters,
      });
      return res.data;
    },
  });

  const productProfitQuery = useQuery<ProductProfitReport>({
    queryKey: ['seller-finance-product-profit', filters],
    queryFn: async () => {
      const res = await api.get<ProductProfitReport>('/seller/finance/reports/products', {
        params: {
          ...filters,
          limit: 20,
        },
      });
      return res.data;
    },
  });

  const payoutQuery = useQuery<PaginatedPayouts>({
    queryKey: ['seller-payouts', { page: 1, pageSize: 10 }],
    queryFn: async () => {
      const res = await api.get<PaginatedPayouts>('/seller/finance/payouts', {
        params: { page: 1, pageSize: 10 },
      });
      return res.data;
    },
  });

  const requestPayoutMutation = useMutation({
    mutationFn: async () => {
      const parsed = Number(amountCents);
      if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
        throw new Error('Tutar (kurus) pozitif tam sayi olmali.');
      }
      await api.post('/seller/finance/payout-request', {
        amountCents: parsed,
      });
    },
    onSuccess: async () => {
      toast.success('Payout talebi olusturuldu.');
      setAmountCents('');
      await queryClient.invalidateQueries({ queryKey: ['seller-payouts'] });
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, 'Payout talebi olusturulamadi.'));
    },
  });

  const handleRequestPayout = (e: FormEvent) => {
    e.preventDefault();
    requestPayoutMutation.mutate();
  };

  const isBusy =
    overviewQuery.isLoading || userSalesQuery.isLoading || productProfitQuery.isLoading;
  const hasError =
    overviewQuery.isError || userSalesQuery.isError || productProfitQuery.isError;

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
          Satici
        </p>
        <h1 className="mt-2 text-2xl font-serif text-[var(--primary-800)]">Finans</h1>
        <p className="mt-2 text-sm text-[var(--neutral-600)]">
          User bazli satis, urun bazli kar ve veresiye risk metriklerini izleyin.
        </p>
      </div>

      <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <label className="text-xs font-semibold text-[var(--neutral-600)]">
            Baslangic
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="mt-1 h-10 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm outline-none"
            />
          </label>
          <label className="text-xs font-semibold text-[var(--neutral-600)]">
            Bitis
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="mt-1 h-10 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm outline-none"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                void queryClient.invalidateQueries({
                  queryKey: ['seller-finance-overview'],
                });
                void queryClient.invalidateQueries({
                  queryKey: ['seller-finance-user-sales'],
                });
                void queryClient.invalidateQueries({
                  queryKey: ['seller-finance-product-profit'],
                });
              }}
              className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-800)] px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white"
            >
              Yenile
            </button>
          </div>
        </div>
      </section>

      {isBusy && <Spinner fullscreen label="Finans raporlari yukleniyor..." />}

      {hasError && !isBusy && (
        <div className="rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Finans verileri yuklenemedi.
        </div>
      )}

      {!isBusy && !hasError && overviewQuery.data && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-8">
          <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--neutral-500)]">Siparis</p>
            <p className="mt-1 text-xl font-serif text-[var(--primary-800)]">
              {overviewQuery.data.orderCount}
            </p>
          </div>
          <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--neutral-500)]">Ciro</p>
            <p className="mt-1 text-xl font-serif text-[var(--primary-800)]">
              {formatPrice(overviewQuery.data.grossRevenueCents)}
            </p>
          </div>
          <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              Tahsilat
            </p>
            <p className="mt-1 text-xl font-serif text-[var(--primary-800)]">
              {formatPrice(overviewQuery.data.collectedCents)}
            </p>
          </div>
          <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              Brut kar
            </p>
            <p className="mt-1 text-xl font-serif text-[var(--primary-800)]">
              {formatPrice(overviewQuery.data.grossProfitCents)}
            </p>
          </div>
          <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              Net kar v2
            </p>
            <p className="mt-1 text-xl font-serif text-[var(--primary-800)]">
              {formatPrice(overviewQuery.data.netProfitV2Cents)}
            </p>
          </div>
          <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              Allocation maliyet
            </p>
            <p className="mt-1 text-xl font-serif text-[var(--primary-800)]">
              {formatPrice(
                overviewQuery.data.shippingCostCents +
                  overviewQuery.data.commissionCostCents +
                  overviewQuery.data.returnCostCents,
              )}
            </p>
          </div>
          <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              Acik veresiye
            </p>
            <p className="mt-1 text-xl font-serif text-[var(--primary-800)]">
              {formatPrice(overviewQuery.data.openCreditCents)}
            </p>
          </div>
          <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              Warn sayisi
            </p>
            <p className="mt-1 text-xl font-serif text-[var(--primary-800)]">
              {overviewQuery.data.warnCount}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
          <h2 className="text-xl font-serif text-[var(--primary-800)]">User bazli satis</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--neutral-200)] text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                  <th className="py-3 pr-3">User</th>
                  <th className="py-3 pr-3">Siparis</th>
                  <th className="py-3 pr-3">Ciro</th>
                  <th className="py-3 pr-3">Brut Kar</th>
                  <th className="py-3 pr-3">Net Kar v2</th>
                </tr>
              </thead>
              <tbody>
                {(userSalesQuery.data?.rows ?? []).map((row) => (
                  <tr key={row.userId} className="border-b border-[var(--neutral-100)]">
                    <td className="py-3 pr-3 text-xs font-semibold text-[var(--primary-800)]">
                      {row.userName}
                    </td>
                    <td className="py-3 pr-3 text-xs text-[var(--neutral-700)]">{row.orderCount}</td>
                    <td className="py-3 pr-3 text-xs text-[var(--neutral-700)]">
                      {formatPrice(row.salesTotalCents)}
                    </td>
                    <td className="py-3 pr-3 text-xs text-[var(--neutral-700)]">
                      {formatPrice(row.profitCents)}
                    </td>
                    <td className="py-3 pr-3 text-xs text-[var(--neutral-700)]">
                      {formatPrice(row.netProfitV2Cents)}
                    </td>
                  </tr>
                ))}
                {(userSalesQuery.data?.rows.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={5} className="py-5 text-center text-sm text-[var(--neutral-600)]">
                      Veri yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
          <h2 className="text-xl font-serif text-[var(--primary-800)]">Urun bazli kar</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--neutral-200)] text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                  <th className="py-3 pr-3">Urun</th>
                  <th className="py-3 pr-3">Adet</th>
                  <th className="py-3 pr-3">Ciro</th>
                  <th className="py-3 pr-3">Brut Kar</th>
                  <th className="py-3 pr-3">Net Kar v2</th>
                </tr>
              </thead>
              <tbody>
                {(productProfitQuery.data?.rows ?? []).map((row) => (
                  <tr key={row.productId} className="border-b border-[var(--neutral-100)]">
                    <td className="py-3 pr-3 text-xs font-semibold text-[var(--primary-800)]">
                      {row.productName}
                    </td>
                    <td className="py-3 pr-3 text-xs text-[var(--neutral-700)]">{row.quantity}</td>
                    <td className="py-3 pr-3 text-xs text-[var(--neutral-700)]">
                      {formatPrice(row.salesCents)}
                    </td>
                    <td className="py-3 pr-3 text-xs text-[var(--neutral-700)]">
                      {formatPrice(row.profitCents)}
                    </td>
                    <td className="py-3 pr-3 text-xs text-[var(--neutral-700)]">
                      {formatPrice(row.netProfitV2Cents)}
                    </td>
                  </tr>
                ))}
                {(productProfitQuery.data?.rows.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={5} className="py-5 text-center text-sm text-[var(--neutral-600)]">
                      Veri yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div>
            <h2 className="text-xl font-serif text-[var(--primary-800)]">Payout talebi</h2>
            <form onSubmit={handleRequestPayout} className="mt-3 flex flex-col gap-3 md:flex-row">
              <input
                value={amountCents}
                onChange={(e) => setAmountCents(e.target.value)}
                placeholder="Tutar (kurus)"
                inputMode="numeric"
                className="h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-sm outline-none"
              />
              <button
                type="submit"
                disabled={requestPayoutMutation.isPending}
                className="inline-flex h-11 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-800)] px-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Talep olustur
              </button>
            </form>
          </div>

          <div>
            <h2 className="text-xl font-serif text-[var(--primary-800)]">Son payout kayitlari</h2>
            {payoutQuery.isLoading && <Spinner fullscreen label="Payoutlar yukleniyor..." />}
            {payoutQuery.isError && !payoutQuery.isLoading && (
              <div className="mt-3 rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {resolveApiErrorMessage(payoutQuery.error, 'Payout listesi yuklenemedi.')}
              </div>
            )}
            {!payoutQuery.isLoading && !payoutQuery.isError && (
              <div className="mt-3 space-y-2">
                {(payoutQuery.data?.data ?? []).map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-3"
                  >
                    <div>
                      <p className="text-xs font-semibold text-[var(--primary-800)]">#{row.id}</p>
                      <p className="text-xs text-[var(--neutral-600)]">
                        {formatDateTime(row.requestedAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-[var(--primary-800)]">
                        {formatPrice(row.amountCents)}
                      </p>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${statusBadgeClassName(
                          row.status,
                        )}`}
                      >
                        {row.status}
                      </span>
                    </div>
                  </div>
                ))}
                {(payoutQuery.data?.data.length ?? 0) === 0 && (
                  <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-3 text-sm text-[var(--neutral-600)]">
                    Kayit yok.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
