"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Bot, Sparkles } from "lucide-react";

import api from "@/services/api";
import Spinner from "@/components/common/Spinner";
import { useDraftState } from "@/hooks/useDraftState";
import { formatPrice } from "@/lib/format";

interface SettingRow {
  id: number;
  key: string;
  value: unknown;
}

interface AutoCampaignPolicy {
  enabled: boolean;
  firstOrderDiscountBps: number;
  reactivationDiscountBps: number;
  freeShippingThresholdCents: number;
  loyaltySpendThresholdCents: number;
}

const DEFAULT_POLICY: AutoCampaignPolicy = {
  enabled: false,
  firstOrderDiscountBps: 1000,
  reactivationDiscountBps: 500,
  freeShippingThresholdCents: 300000,
  loyaltySpendThresholdCents: 500000,
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

const readBoolean = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

const readNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default function SellerAutomaticCampaignsPage() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery<SettingRow[]>({
    queryKey: ["seller-auto-campaign-settings"],
    queryFn: async () => {
      const res = await api.get<SettingRow[]>("/settings");
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const initialPolicy = useMemo<AutoCampaignPolicy>(() => {
    if (!settingsQuery.data) {
      return DEFAULT_POLICY;
    }

    const byKey = new Map(
      settingsQuery.data.map(
        (setting) => [setting.key, setting.value] as const,
      ),
    );
    return {
      enabled: readBoolean(
        byKey.get("campaigns.auto.enabled"),
        DEFAULT_POLICY.enabled,
      ),
      firstOrderDiscountBps: Math.max(
        0,
        Math.floor(
          readNumber(
            byKey.get("campaigns.auto.firstOrderDiscountBps"),
            DEFAULT_POLICY.firstOrderDiscountBps,
          ),
        ),
      ),
      reactivationDiscountBps: Math.max(
        0,
        Math.floor(
          readNumber(
            byKey.get("campaigns.auto.reactivationDiscountBps"),
            DEFAULT_POLICY.reactivationDiscountBps,
          ),
        ),
      ),
      freeShippingThresholdCents: Math.max(
        0,
        Math.floor(
          readNumber(
            byKey.get("campaigns.auto.freeShippingThresholdCents"),
            DEFAULT_POLICY.freeShippingThresholdCents,
          ),
        ),
      ),
      loyaltySpendThresholdCents: Math.max(
        0,
        Math.floor(
          readNumber(
            byKey.get("campaigns.auto.loyaltySpendThresholdCents"),
            DEFAULT_POLICY.loyaltySpendThresholdCents,
          ),
        ),
      ),
    };
  }, [settingsQuery.data]);

  const {
    value: policy,
    reset: resetPolicy,
    setDraft: setPolicy,
  } = useDraftState<AutoCampaignPolicy>(initialPolicy);

  const saveMutation = useMutation({
    mutationFn: async (nextPolicy: AutoCampaignPolicy) => {
      await Promise.all([
        api.post("/settings/campaigns.auto.enabled", {
          value: nextPolicy.enabled,
        }),
        api.post("/settings/campaigns.auto.firstOrderDiscountBps", {
          value: nextPolicy.firstOrderDiscountBps,
        }),
        api.post("/settings/campaigns.auto.reactivationDiscountBps", {
          value: nextPolicy.reactivationDiscountBps,
        }),
        api.post("/settings/campaigns.auto.freeShippingThresholdCents", {
          value: nextPolicy.freeShippingThresholdCents,
        }),
        api.post("/settings/campaigns.auto.loyaltySpendThresholdCents", {
          value: nextPolicy.loyaltySpendThresholdCents,
        }),
      ]);
    },
    onSuccess: async () => {
      toast.success("Otomatik kampanya kuralları kaydedildi.");
      await queryClient.invalidateQueries({
        queryKey: ["seller-auto-campaign-settings"],
      });
      resetPolicy();
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, "Kurallar kaydedilemedi."));
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
          Satıcı
        </p>
        <h1 className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
          Otomatik kampanyalar
        </h1>
        <p className="mt-2 text-sm text-[var(--neutral-600)]">
          İlk sipariş, yeniden kazanım ve sadakat kampanyası eşiklerini
          belirleyin.
        </p>
      </div>

      {settingsQuery.isLoading ? (
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-10">
          <Spinner label="Ayarlar yükleniyor..." />
        </div>
      ) : null}

      {settingsQuery.isError ? (
        <div className="rounded-[var(--radius-xl)] border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          Ayarlar yüklenemedi.
        </div>
      ) : null}

      {!settingsQuery.isLoading && !settingsQuery.isError ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-5">
              <Bot className="h-5 w-5 text-[var(--primary-800)]/70" />
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Otomasyon
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--primary-800)]">
                {policy.enabled ? "Açık" : "Kapalı"}
              </p>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-5">
              <Sparkles className="h-5 w-5 text-[var(--primary-800)]/70" />
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Ücretsiz kargo eşiği
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--primary-800)]">
                {formatPrice(policy.freeShippingThresholdCents / 100)}
              </p>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-5">
              <Sparkles className="h-5 w-5 text-[var(--primary-800)]/70" />
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Sadakat eşiği
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--primary-800)]">
                {formatPrice(policy.loyaltySpendThresholdCents / 100)}
              </p>
            </div>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
            <h2 className="text-xl font-serif text-[var(--primary-800)]">
              Kural ayarları
            </h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-3 text-sm text-[var(--primary-800)]">
                <input
                  type="checkbox"
                  checked={policy.enabled}
                  onChange={(e) =>
                    setPolicy((prev) => ({
                      ...prev,
                      enabled: e.target.checked,
                    }))
                  }
                />
                Otomatik kampanya aktif
              </label>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                  İlk sipariş indirimi (bps)
                </label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={policy.firstOrderDiscountBps}
                  onChange={(e) =>
                    setPolicy((prev) => ({
                      ...prev,
                      firstOrderDiscountBps: Math.max(
                        0,
                        Number(e.target.value) || 0,
                      ),
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                  Yeniden kazanım indirimi (bps)
                </label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={policy.reactivationDiscountBps}
                  onChange={(e) =>
                    setPolicy((prev) => ({
                      ...prev,
                      reactivationDiscountBps: Math.max(
                        0,
                        Number(e.target.value) || 0,
                      ),
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                  Ücretsiz kargo eşiği (kuruş)
                </label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={policy.freeShippingThresholdCents}
                  onChange={(e) =>
                    setPolicy((prev) => ({
                      ...prev,
                      freeShippingThresholdCents: Math.max(
                        0,
                        Number(e.target.value) || 0,
                      ),
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                  Sadakat harcama eşiği (kuruş)
                </label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={policy.loyaltySpendThresholdCents}
                  onChange={(e) =>
                    setPolicy((prev) => ({
                      ...prev,
                      loyaltySpendThresholdCents: Math.max(
                        0,
                        Number(e.target.value) || 0,
                      ),
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => saveMutation.mutate(policy)}
              disabled={saveMutation.isPending}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary-800)] px-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saveMutation.isPending ? "Kaydediliyor..." : "Kuralları kaydet"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
