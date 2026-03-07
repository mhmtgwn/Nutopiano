"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Spinner from "@/components/common/Spinner";
import api from "@/services/api";
import { formatDateTime, formatPrice } from "@/lib/format";
import { useAppSelector } from "@/store";

type CreditPolicy = "NONE" | "WARN" | "BLOCK";

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface SellerCustomerRow {
  id: number;
  name: string;
  phone: string;
  balance: number;
  creditLimitCents: number | null;
  creditBlockPolicy: CreditPolicy;
  outstandingDebtCents: number;
  lastLedgerAt: string | null;
  createdAt: string;
}

const EMPTY_CUSTOMERS: SellerCustomerRow[] = [];

interface SellerCustomersResponse {
  data: SellerCustomerRow[];
  meta: PaginationMeta;
}

interface SellerLedgerRow {
  id: number;
  sellerId: number;
  orderId: number | null;
  type: "DEBIT" | "CREDIT";
  sourceType: string;
  amountCents: number;
  balanceAfterCents: number;
  createdByUserId: number | null;
  createdAt: string;
}

interface SellerCustomerLedgerResponse {
  customer: {
    id: number;
    name: string;
    phone: string;
    creditLimitCents: number | null;
    creditBlockPolicy: CreditPolicy;
  };
  data: SellerLedgerRow[];
  meta: PaginationMeta;
  summary: {
    totalDebitCents: number;
    totalCreditCents: number;
    outstandingDebtCents: number;
  };
}

interface CreditDraft {
  customerId: number;
  creditLimitCents: string;
  creditPolicy: CreditPolicy;
}

const resolveApiErrorMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== "object") return fallback;
  if (!("response" in error)) return fallback;
  const response = (error as { response?: unknown }).response;
  if (!response || typeof response !== "object") return fallback;
  if (!("data" in response)) return fallback;
  const data = (response as { data?: unknown }).data;
  if (!data || typeof data !== "object") return fallback;
  if (!("message" in data)) return fallback;
  const message = (data as { message?: unknown }).message;
  if (Array.isArray(message)) return message.map(String).join(", ");
  if (typeof message === "string") return message;
  return fallback;
};

export default function SellerCustomersPage() {
  const queryClient = useQueryClient();
  const role = useAppSelector((state) => state.user.user?.role);
  const canEditPolicy =
    role === "SELLER" || role === "ADMIN" || role === "SUPER_ADMIN";

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    null,
  );
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerPageSize] = useState(30);
  const [creditDraft, setCreditDraft] = useState<CreditDraft | null>(null);

  const customersQuery = useQuery<SellerCustomersResponse>({
    queryKey: ["seller-customers", { q, page, pageSize }],
    queryFn: async () => {
      const res = await api.get<SellerCustomersResponse>("/seller/customers", {
        params: { q: q.trim() || undefined, page, pageSize },
      });
      return res.data;
    },
  });

  const customers = customersQuery.data?.data ?? EMPTY_CUSTOMERS;
  const customersMeta = customersQuery.data?.meta;

  const effectiveSelectedCustomerId = useMemo(() => {
    if (!customers.length) return null;
    if (
      selectedCustomerId &&
      customers.some((row) => row.id === selectedCustomerId)
    ) {
      return selectedCustomerId;
    }
    return customers[0].id;
  }, [customers, selectedCustomerId]);

  const ledgerQuery = useQuery<SellerCustomerLedgerResponse>({
    queryKey: [
      "seller-customer-ledger",
      {
        selectedCustomerId: effectiveSelectedCustomerId,
        ledgerPage,
        ledgerPageSize,
      },
    ],
    enabled:
      typeof effectiveSelectedCustomerId === "number" &&
      effectiveSelectedCustomerId > 0,
    queryFn: async () => {
      const res = await api.get<SellerCustomerLedgerResponse>(
        `/seller/customers/${effectiveSelectedCustomerId}/ledger`,
        {
          params: { page: ledgerPage, pageSize: ledgerPageSize },
        },
      );
      return res.data;
    },
  });

  const selectedLedgerCustomer = ledgerQuery.data?.customer ?? null;
  const activeCreditDraft =
    creditDraft && creditDraft.customerId === effectiveSelectedCustomerId
      ? creditDraft
      : null;
  const draftCreditLimitCents = activeCreditDraft
    ? activeCreditDraft.creditLimitCents
    : typeof selectedLedgerCustomer?.creditLimitCents === "number"
      ? String(selectedLedgerCustomer.creditLimitCents)
      : "";
  const draftCreditPolicy =
    activeCreditDraft?.creditPolicy ??
    selectedLedgerCustomer?.creditBlockPolicy ??
    "WARN";

  const updateCreditDraft = (
    updates: Partial<Omit<CreditDraft, "customerId">>,
  ) => {
    if (!effectiveSelectedCustomerId) return;

    setCreditDraft((previous) => {
      const base =
        previous && previous.customerId === effectiveSelectedCustomerId
          ? previous
          : {
              customerId: effectiveSelectedCustomerId,
              creditLimitCents:
                typeof selectedLedgerCustomer?.creditLimitCents === "number"
                  ? String(selectedLedgerCustomer.creditLimitCents)
                  : "",
              creditPolicy: selectedLedgerCustomer?.creditBlockPolicy ?? "WARN",
            };

      return { ...base, ...updates };
    });
  };

  const updateCreditPolicyMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveSelectedCustomerId) return;
      const limitRaw = draftCreditLimitCents.trim();
      const payload: {
        creditLimitCents?: number | null;
        creditBlockPolicy?: CreditPolicy;
      } = {
        creditBlockPolicy: draftCreditPolicy,
      };
      if (limitRaw.length === 0) {
        payload.creditLimitCents = null;
      } else {
        const parsed = Number(limitRaw);
        if (
          !Number.isFinite(parsed) ||
          parsed < 0 ||
          !Number.isInteger(parsed)
        ) {
          throw new Error("Kredi limiti pozitif tam sayi (kurus) olmali.");
        }
        payload.creditLimitCents = parsed;
      }

      await api.patch(
        `/seller/customers/${effectiveSelectedCustomerId}/credit-policy`,
        payload,
      );
    },
    onSuccess: async () => {
      toast.success("Kredi politikasi guncellendi.");
      await queryClient.invalidateQueries({ queryKey: ["seller-customers"] });
      await queryClient.invalidateQueries({
        queryKey: ["seller-customer-ledger"],
      });
      setCreditDraft(null);
    },
    onError: (error: unknown) => {
      toast.error(
        resolveApiErrorMessage(error, "Kredi politikasi guncellenemedi."),
      );
    },
  });

  const selectedCustomer = useMemo(
    () =>
      customers.find((row) => row.id === effectiveSelectedCustomerId) ?? null,
    [customers, effectiveSelectedCustomerId],
  );

  const customersPaging = useMemo(() => {
    const totalPages = customersMeta?.totalPages ?? 1;
    return {
      totalPages,
      canPrev: page > 1,
      canNext: page < totalPages,
    };
  }, [customersMeta?.totalPages, page]);

  const ledgerPaging = useMemo(() => {
    const totalPages = ledgerQuery.data?.meta.totalPages ?? 1;
    return {
      totalPages,
      canPrev: ledgerPage > 1,
      canNext: ledgerPage < totalPages,
    };
  }, [ledgerQuery.data?.meta.totalPages, ledgerPage]);

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
          Satici
        </p>
        <h1 className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
          Musteriler
        </h1>
        <p className="mt-2 text-sm text-[var(--neutral-600)]">
          Veresiye bakiyeleri ve musteri hareketlerini seller scope icinde
          yonetin.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-xl font-serif text-[var(--primary-800)]">
              Musteri listesi
            </h2>
            <div className="text-xs font-semibold text-[var(--neutral-600)]">
              {customersMeta ? `${customersMeta.total} kayit` : "-"}
            </div>
          </div>

          <div className="mt-4">
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
                setLedgerPage(1);
              }}
              placeholder="Ad, telefon veya musteri id ara"
              className="h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-sm outline-none"
            />
          </div>

          {customersQuery.isLoading && (
            <Spinner fullscreen label="Musteriler yukleniyor..." />
          )}

          {customersQuery.isError && !customersQuery.isLoading && (
            <div className="mt-4 rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {resolveApiErrorMessage(
                customersQuery.error,
                "Musteriler yuklenemedi.",
              )}
            </div>
          )}

          {!customersQuery.isLoading && !customersQuery.isError && (
            <div className="mt-4 space-y-2">
              {customers.map((row) => {
                const isSelected = row.id === selectedCustomerId;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId(row.id);
                      setLedgerPage(1);
                    }}
                    className={`w-full rounded-[var(--radius-lg)] border px-4 py-3 text-left transition ${
                      isSelected
                        ? "border-[var(--primary-800)]/30 bg-[var(--neutral-50)]"
                        : "border-[var(--neutral-200)] bg-white hover:bg-[var(--neutral-50)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--primary-800)]">
                          #{row.id} {row.name}
                        </p>
                        <p className="mt-1 text-xs text-[var(--neutral-600)]">
                          {row.phone}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--neutral-500)]">
                          Acik borc
                        </p>
                        <p className="text-sm font-semibold text-[var(--primary-800)]">
                          {formatPrice(row.outstandingDebtCents)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}

              {customers.length === 0 && (
                <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-4 text-sm text-[var(--neutral-600)]">
                  Kayit bulunamadi.
                </div>
              )}
            </div>
          )}

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setPage((prev) => Math.max(1, prev - 1));
                setLedgerPage(1);
              }}
              disabled={!customersPaging.canPrev}
              className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-200)] px-4 text-xs font-semibold uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Onceki
            </button>
            <span className="text-xs font-semibold text-[var(--neutral-600)]">
              {page} / {customersPaging.totalPages}
            </span>
            <button
              type="button"
              onClick={() => {
                setPage((prev) =>
                  Math.min(customersPaging.totalPages, prev + 1),
                );
                setLedgerPage(1);
              }}
              disabled={!customersPaging.canNext}
              className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-200)] px-4 text-xs font-semibold uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
        </section>

        <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
          {!selectedCustomer ? (
            <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-4 text-sm text-[var(--neutral-600)]">
              Detay gormek icin bir musteri secin.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-serif text-[var(--primary-800)]">
                    #{selectedCustomer.id} {selectedCustomer.name}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--neutral-600)]">
                    {selectedCustomer.phone}
                  </p>
                </div>
                <div className="rounded-full border border-[var(--neutral-200)] bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)]">
                  Acik borc:{" "}
                  {formatPrice(selectedCustomer.outstandingDebtCents)}
                </div>
              </div>

              {ledgerQuery.isLoading && (
                <Spinner fullscreen label="Ledger yukleniyor..." />
              )}

              {ledgerQuery.isError && !ledgerQuery.isLoading && (
                <div className="mt-4 rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {resolveApiErrorMessage(
                    ledgerQuery.error,
                    "Ledger verisi yuklenemedi.",
                  )}
                </div>
              )}

              {!ledgerQuery.isLoading &&
                !ledgerQuery.isError &&
                ledgerQuery.data && (
                  <>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--neutral-500)]">
                          Toplam borc
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[var(--primary-800)]">
                          {formatPrice(
                            ledgerQuery.data.summary.totalDebitCents,
                          )}
                        </p>
                      </div>
                      <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--neutral-500)]">
                          Toplam tahsilat
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[var(--primary-800)]">
                          {formatPrice(
                            ledgerQuery.data.summary.totalCreditCents,
                          )}
                        </p>
                      </div>
                      <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--neutral-500)]">
                          Kalan borc
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[var(--primary-800)]">
                          {formatPrice(
                            ledgerQuery.data.summary.outstandingDebtCents,
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-4">
                      <div className="grid gap-3 md:grid-cols-[1fr_220px_150px]">
                        <label className="text-xs font-semibold text-[var(--neutral-600)]">
                          Kredi limiti (kurus)
                          <input
                            value={draftCreditLimitCents}
                            onChange={(e) =>
                              updateCreditDraft({
                                creditLimitCents: e.target.value,
                              })
                            }
                            disabled={!canEditPolicy}
                            placeholder="Bos birak = limitsiz"
                            inputMode="numeric"
                            className="mt-1 h-10 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm outline-none disabled:cursor-not-allowed disabled:bg-[var(--neutral-100)]"
                          />
                        </label>
                        <label className="text-xs font-semibold text-[var(--neutral-600)]">
                          Politika
                          <select
                            value={draftCreditPolicy}
                            onChange={(e) =>
                              updateCreditDraft({
                                creditPolicy: e.target.value as CreditPolicy,
                              })
                            }
                            disabled={!canEditPolicy}
                            className="mt-1 h-10 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm outline-none disabled:cursor-not-allowed disabled:bg-[var(--neutral-100)]"
                          >
                            <option value="NONE">NONE</option>
                            <option value="WARN">WARN</option>
                            <option value="BLOCK">BLOCK</option>
                          </select>
                        </label>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => updateCreditPolicyMutation.mutate()}
                            disabled={
                              !canEditPolicy ||
                              updateCreditPolicyMutation.isPending
                            }
                            className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-800)] px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Kaydet
                          </button>
                        </div>
                      </div>
                      {!canEditPolicy ? (
                        <p className="mt-2 text-xs text-[var(--neutral-600)]">
                          Bu alanda degisiklik yetkisi sadece SELLER/ADMIN
                          rollerindedir.
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-[var(--neutral-200)] text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                            <th className="py-3 pr-3">Tarih</th>
                            <th className="py-3 pr-3">Tip</th>
                            <th className="py-3 pr-3">Kaynak</th>
                            <th className="py-3 pr-3">Tutar</th>
                            <th className="py-3 pr-3">Bakiye</th>
                            <th className="py-3 pr-3">Siparis</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ledgerQuery.data.data.map((row) => (
                            <tr
                              key={row.id}
                              className="border-b border-[var(--neutral-100)]"
                            >
                              <td className="py-3 pr-3 text-xs text-[var(--neutral-600)]">
                                {formatDateTime(row.createdAt)}
                              </td>
                              <td className="py-3 pr-3">
                                <span
                                  className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${
                                    row.type === "DEBIT"
                                      ? "bg-[#FFF2F2] text-[#9B1C1C]"
                                      : "bg-[#E6FBF2] text-[#0F5132]"
                                  }`}
                                >
                                  {row.type}
                                </span>
                              </td>
                              <td className="py-3 pr-3 text-xs text-[var(--neutral-700)]">
                                {row.sourceType}
                              </td>
                              <td className="py-3 pr-3 text-xs font-semibold text-[var(--primary-800)]">
                                {formatPrice(row.amountCents)}
                              </td>
                              <td className="py-3 pr-3 text-xs text-[var(--neutral-700)]">
                                {formatPrice(row.balanceAfterCents)}
                              </td>
                              <td className="py-3 pr-3 text-xs text-[var(--neutral-700)]">
                                {row.orderId ? `#${row.orderId}` : "-"}
                              </td>
                            </tr>
                          ))}
                          {ledgerQuery.data.data.length === 0 && (
                            <tr>
                              <td
                                colSpan={6}
                                className="py-5 text-center text-sm text-[var(--neutral-600)]"
                              >
                                Ledger kaydi yok.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setLedgerPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={!ledgerPaging.canPrev}
                        className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-200)] px-4 text-xs font-semibold uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Onceki
                      </button>
                      <span className="text-xs font-semibold text-[var(--neutral-600)]">
                        {ledgerPage} / {ledgerPaging.totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setLedgerPage((prev) =>
                            Math.min(ledgerPaging.totalPages, prev + 1),
                          )
                        }
                        disabled={!ledgerPaging.canNext}
                        className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-200)] px-4 text-xs font-semibold uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Sonraki
                      </button>
                    </div>
                  </>
                )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
