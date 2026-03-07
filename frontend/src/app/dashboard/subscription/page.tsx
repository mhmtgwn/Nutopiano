"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { CreditCard, FileText, RefreshCcw } from "lucide-react";

import api from "@/services/api";
import Spinner from "@/components/common/Spinner";
import { useDraftState } from "@/hooks/useDraftState";
import { formatPrice } from "@/lib/format";

interface SettingRow {
  id: number;
  key: string;
  value: unknown;
}

interface SellerReportsSummary {
  range: {
    from: string;
    to: string;
    days: number;
  };
  ordersCount: number;
  revenueCents: number;
  averageOrderValueCents: number;
}

interface SubscriptionCurrent {
  planName: string;
  interval: "MONTHLY" | "YEARLY";
  priceCents: number;
  status: "ACTIVE" | "PAST_DUE" | "CANCELLED" | "TRIAL";
  renewAt: string;
}

interface SubscriptionBilling {
  invoiceEmail: string;
  companyName: string;
  taxNumber: string;
}

const DEFAULT_CURRENT: SubscriptionCurrent = {
  planName: "Starter",
  interval: "MONTHLY",
  priceCents: 0,
  status: "ACTIVE",
  renewAt: "",
};

const DEFAULT_BILLING: SubscriptionBilling = {
  invoiceEmail: "",
  companyName: "",
  taxNumber: "",
};

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

const readString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const readNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readCurrent = (value: unknown): SubscriptionCurrent => {
  if (!value || typeof value !== "object") return DEFAULT_CURRENT;
  const row = value as Record<string, unknown>;
  const interval =
    readString(row.interval, "MONTHLY").toUpperCase() === "YEARLY"
      ? "YEARLY"
      : "MONTHLY";
  const statusRaw = readString(row.status, "ACTIVE").toUpperCase();
  const status: SubscriptionCurrent["status"] =
    statusRaw === "PAST_DUE" ||
    statusRaw === "CANCELLED" ||
    statusRaw === "TRIAL"
      ? (statusRaw as SubscriptionCurrent["status"])
      : "ACTIVE";
  return {
    planName: readString(row.planName, DEFAULT_CURRENT.planName),
    interval,
    priceCents: Math.max(
      0,
      Math.floor(readNumber(row.priceCents, DEFAULT_CURRENT.priceCents)),
    ),
    status,
    renewAt: readString(row.renewAt),
  };
};

const readBilling = (value: unknown): SubscriptionBilling => {
  if (!value || typeof value !== "object") return DEFAULT_BILLING;
  const row = value as Record<string, unknown>;
  return {
    invoiceEmail: readString(row.invoiceEmail),
    companyName: readString(row.companyName),
    taxNumber: readString(row.taxNumber),
  };
};

export default function SellerSubscriptionPage() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery<SettingRow[]>({
    queryKey: ["seller-subscription-settings"],
    queryFn: async () => {
      const res = await api.get<SettingRow[]>("/settings");
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const reportsQuery = useQuery<SellerReportsSummary>({
    queryKey: ["seller-subscription-reports"],
    queryFn: async () => {
      const res = await api.get<SellerReportsSummary>(
        "/dashboard/reports/summary",
      );
      return res.data;
    },
  });

  const initialCurrent = useMemo<SubscriptionCurrent>(() => {
    if (!settingsQuery.data) {
      return DEFAULT_CURRENT;
    }

    const byKey = new Map(
      settingsQuery.data.map(
        (setting) => [setting.key, setting.value] as const,
      ),
    );
    return readCurrent(byKey.get("subscription.current"));
  }, [settingsQuery.data]);

  const initialBilling = useMemo<SubscriptionBilling>(() => {
    if (!settingsQuery.data) {
      return DEFAULT_BILLING;
    }

    const byKey = new Map(
      settingsQuery.data.map(
        (setting) => [setting.key, setting.value] as const,
      ),
    );
    return readBilling(byKey.get("subscription.billing"));
  }, [settingsQuery.data]);

  const {
    value: current,
    reset: resetCurrent,
    setDraft: setCurrent,
  } = useDraftState<SubscriptionCurrent>(initialCurrent);
  const {
    value: billing,
    reset: resetBilling,
    setDraft: setBilling,
  } = useDraftState<SubscriptionBilling>(initialBilling);

  const saveCurrentMutation = useMutation({
    mutationFn: async (nextCurrent: SubscriptionCurrent) => {
      await api.post("/settings/subscription.current", { value: nextCurrent });
    },
    onSuccess: async () => {
      toast.success("Abonelik bilgisi kaydedildi.");
      await queryClient.invalidateQueries({
        queryKey: ["seller-subscription-settings"],
      });
      resetCurrent();
    },
    onError: (error: unknown) => {
      toast.error(
        resolveApiErrorMessage(error, "Abonelik bilgisi kaydedilemedi."),
      );
    },
  });

  const saveBillingMutation = useMutation({
    mutationFn: async (nextBilling: SubscriptionBilling) => {
      await api.post("/settings/subscription.billing", { value: nextBilling });
    },
    onSuccess: async () => {
      toast.success("Fatura bilgisi kaydedildi.");
      await queryClient.invalidateQueries({
        queryKey: ["seller-subscription-settings"],
      });
      resetBilling();
    },
    onError: (error: unknown) => {
      toast.error(
        resolveApiErrorMessage(error, "Fatura bilgisi kaydedilemedi."),
      );
    },
  });

  const isLoading = settingsQuery.isLoading || reportsQuery.isLoading;
  const isError = settingsQuery.isError || reportsQuery.isError;

  const monthlyProjectionCents = useMemo(() => {
    const revenue = reportsQuery.data?.revenueCents ?? 0;
    return Math.round(revenue);
  }, [reportsQuery.data?.revenueCents]);

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
          Satıcı
        </p>
        <h1 className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
          Abonelik
        </h1>
        <p className="mt-2 text-sm text-[var(--neutral-600)]">
          Plan özetinizi ve fatura bilgilerinizi yönetin.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-10">
          <Spinner label="Abonelik verileri yükleniyor..." />
        </div>
      ) : null}

      {isError ? (
        <div className="rounded-[var(--radius-xl)] border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          Abonelik verileri alınamadı.
        </div>
      ) : null}

      {!isLoading && !isError ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-5">
              <CreditCard className="h-5 w-5 text-[var(--primary-800)]/70" />
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Plan
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--primary-800)]">
                {current.planName}
              </p>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-5">
              <RefreshCcw className="h-5 w-5 text-[var(--primary-800)]/70" />
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Yenileme
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--primary-800)]">
                {current.renewAt
                  ? new Date(current.renewAt).toLocaleDateString("tr-TR")
                  : "-"}
              </p>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-5">
              <FileText className="h-5 w-5 text-[var(--primary-800)]/70" />
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                30 gün ciro
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--primary-800)]">
                {formatPrice(monthlyProjectionCents / 100)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
              <h2 className="text-xl font-serif text-[var(--primary-800)]">
                Plan bilgisi
              </h2>
              <div className="mt-4 grid gap-3">
                <input
                  value={current.planName}
                  onChange={(e) =>
                    setCurrent((prev) => ({
                      ...prev,
                      planName: e.target.value,
                    }))
                  }
                  className="h-11 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
                  placeholder="Plan adı"
                />
                <select
                  value={current.interval}
                  onChange={(e) =>
                    setCurrent((prev) => ({
                      ...prev,
                      interval:
                        e.target.value === "YEARLY" ? "YEARLY" : "MONTHLY",
                    }))
                  }
                  className="h-11 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
                >
                  <option value="MONTHLY">Aylık</option>
                  <option value="YEARLY">Yıllık</option>
                </select>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={current.priceCents}
                  onChange={(e) =>
                    setCurrent((prev) => ({
                      ...prev,
                      priceCents: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                  className="h-11 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
                  placeholder="Fiyat (kuruş)"
                />
                <select
                  value={current.status}
                  onChange={(e) =>
                    setCurrent((prev) => ({
                      ...prev,
                      status: e.target.value as SubscriptionCurrent["status"],
                    }))
                  }
                  className="h-11 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="TRIAL">TRIAL</option>
                  <option value="PAST_DUE">PAST_DUE</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
                <input
                  type="date"
                  value={current.renewAt ? current.renewAt.slice(0, 10) : ""}
                  onChange={(e) =>
                    setCurrent((prev) => ({
                      ...prev,
                      renewAt: e.target.value
                        ? `${e.target.value}T00:00:00.000Z`
                        : "",
                    }))
                  }
                  className="h-11 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
                />
              </div>
              <button
                type="button"
                onClick={() => saveCurrentMutation.mutate(current)}
                disabled={saveCurrentMutation.isPending}
                className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary-800)] px-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveCurrentMutation.isPending
                  ? "Kaydediliyor..."
                  : "Planı kaydet"}
              </button>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
              <h2 className="text-xl font-serif text-[var(--primary-800)]">
                Fatura bilgisi
              </h2>
              <div className="mt-4 grid gap-3">
                <input
                  type="email"
                  value={billing.invoiceEmail}
                  onChange={(e) =>
                    setBilling((prev) => ({
                      ...prev,
                      invoiceEmail: e.target.value,
                    }))
                  }
                  className="h-11 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
                  placeholder="fatura e-posta"
                />
                <input
                  value={billing.companyName}
                  onChange={(e) =>
                    setBilling((prev) => ({
                      ...prev,
                      companyName: e.target.value,
                    }))
                  }
                  className="h-11 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
                  placeholder="Şirket adı"
                />
                <input
                  value={billing.taxNumber}
                  onChange={(e) =>
                    setBilling((prev) => ({
                      ...prev,
                      taxNumber: e.target.value,
                    }))
                  }
                  className="h-11 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
                  placeholder="Vergi no / TCKN"
                />
              </div>
              <button
                type="button"
                onClick={() => saveBillingMutation.mutate(billing)}
                disabled={saveBillingMutation.isPending}
                className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary-800)] px-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveBillingMutation.isPending
                  ? "Kaydediliyor..."
                  : "Fatura bilgisini kaydet"}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
