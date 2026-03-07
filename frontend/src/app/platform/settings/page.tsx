"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FileText, Globe, Palette, Settings } from "lucide-react";

import api from "@/services/api";
import { useDraftState } from "@/hooks/useDraftState";

type SettingRow = {
  id: number;
  key: string;
  value: unknown;
};

type OperationsSettings = {
  moderationEnabled: boolean;
  appointmentAllowStaffCreate: boolean;
  appointmentAutoConfirm: boolean;
  appointmentDefaultDurationMinutes: number;
  orderDefaultTaxRateBps: number;
  globalCommissionRate: number;
};

type SiteProfileSettings = {
  businessName: string;
  contactPhone: string;
  contactEmail: string;
  supportWhatsapp: string;
};

type LegalSettings = {
  kvkkUrl: string;
  privacyUrl: string;
  distanceSalesUrl: string;
};

type BrandSettings = {
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
};

type SeoSettings = {
  siteUrl: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultOgImage: string;
};

type SettingsDraft = {
  operations: OperationsSettings;
  siteProfile: SiteProfileSettings;
  legal: LegalSettings;
  brand: BrandSettings;
  seo: SeoSettings;
};

const DEFAULT_DRAFT: SettingsDraft = {
  operations: {
    moderationEnabled: false,
    appointmentAllowStaffCreate: false,
    appointmentAutoConfirm: false,
    appointmentDefaultDurationMinutes: 60,
    orderDefaultTaxRateBps: 0,
    globalCommissionRate: 0.05,
  },
  siteProfile: {
    businessName: "",
    contactPhone: "",
    contactEmail: "",
    supportWhatsapp: "",
  },
  legal: {
    kvkkUrl: "",
    privacyUrl: "",
    distanceSalesUrl: "",
  },
  brand: {
    logoUrl: "",
    primaryColor: "#1A3C34",
    secondaryColor: "#C5A059",
  },
  seo: {
    siteUrl: "https://nutopiano.com",
    defaultTitle: "Nutopiano",
    defaultDescription: "",
    defaultOgImage: "",
  },
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

const readBoolean = (value: unknown, fallback = false) => {
  if (typeof value === "boolean") return value;
  return fallback;
};

const readNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readString = (value: unknown, fallback = "") => {
  return typeof value === "string" ? value : fallback;
};

const normalizeDraft = (rows: SettingRow[]): SettingsDraft => {
  const byKey = new Map(rows.map((row) => [row.key, row.value] as const));

  const siteProfileRaw = byKey.get("site.profile");
  const legalRaw = byKey.get("legal.documents");
  const brandRaw = byKey.get("brand.appearance");
  const seoRaw = byKey.get("seo.defaults");

  const siteProfileObj =
    siteProfileRaw && typeof siteProfileRaw === "object"
      ? (siteProfileRaw as Record<string, unknown>)
      : {};
  const legalObj =
    legalRaw && typeof legalRaw === "object"
      ? (legalRaw as Record<string, unknown>)
      : {};
  const brandObj =
    brandRaw && typeof brandRaw === "object"
      ? (brandRaw as Record<string, unknown>)
      : {};
  const seoObj =
    seoRaw && typeof seoRaw === "object"
      ? (seoRaw as Record<string, unknown>)
      : {};

  return {
    operations: {
      moderationEnabled: readBoolean(
        byKey.get("moderation_enabled"),
        DEFAULT_DRAFT.operations.moderationEnabled,
      ),
      appointmentAllowStaffCreate: readBoolean(
        byKey.get("appointment.allowStaffCreate"),
        DEFAULT_DRAFT.operations.appointmentAllowStaffCreate,
      ),
      appointmentAutoConfirm: readBoolean(
        byKey.get("appointment.autoConfirm"),
        DEFAULT_DRAFT.operations.appointmentAutoConfirm,
      ),
      appointmentDefaultDurationMinutes: Math.max(
        15,
        Math.floor(
          readNumber(
            byKey.get("appointment.defaultDurationMinutes"),
            DEFAULT_DRAFT.operations.appointmentDefaultDurationMinutes,
          ),
        ),
      ),
      orderDefaultTaxRateBps: Math.max(
        0,
        Math.floor(
          readNumber(
            byKey.get("order.defaultTaxRateBps"),
            DEFAULT_DRAFT.operations.orderDefaultTaxRateBps,
          ),
        ),
      ),
      globalCommissionRate: Math.max(
        0,
        readNumber(
          byKey.get("global_commission_rate"),
          DEFAULT_DRAFT.operations.globalCommissionRate,
        ),
      ),
    },
    siteProfile: {
      businessName: readString(siteProfileObj.businessName),
      contactPhone: readString(siteProfileObj.contactPhone),
      contactEmail: readString(siteProfileObj.contactEmail),
      supportWhatsapp: readString(siteProfileObj.supportWhatsapp),
    },
    legal: {
      kvkkUrl: readString(legalObj.kvkkUrl),
      privacyUrl: readString(legalObj.privacyUrl),
      distanceSalesUrl: readString(legalObj.distanceSalesUrl),
    },
    brand: {
      logoUrl: readString(brandObj.logoUrl),
      primaryColor: readString(
        brandObj.primaryColor,
        DEFAULT_DRAFT.brand.primaryColor,
      ),
      secondaryColor: readString(
        brandObj.secondaryColor,
        DEFAULT_DRAFT.brand.secondaryColor,
      ),
    },
    seo: {
      siteUrl: readString(seoObj.siteUrl, DEFAULT_DRAFT.seo.siteUrl),
      defaultTitle: readString(
        seoObj.defaultTitle,
        DEFAULT_DRAFT.seo.defaultTitle,
      ),
      defaultDescription: readString(seoObj.defaultDescription),
      defaultOgImage: readString(seoObj.defaultOgImage),
    },
  };
};

const sectionCardClass = "py-6";

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery<SettingRow[]>({
    queryKey: ["admin-settings-all"],
    queryFn: async () => {
      const res = await api.get<SettingRow[]>("/settings");
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const initialDraft = useMemo(
    () =>
      settingsQuery.data ? normalizeDraft(settingsQuery.data) : DEFAULT_DRAFT,
    [settingsQuery.data],
  );
  const {
    value: draft,
    reset: resetDraft,
    setDraft,
  } = useDraftState<SettingsDraft>(initialDraft);

  const saveOperationsMutation = useMutation({
    mutationFn: async (data: OperationsSettings) => {
      await Promise.all([
        api.post("/settings/moderation_enabled", {
          value: data.moderationEnabled,
        }),
        api.post("/settings/appointment.allowStaffCreate", {
          value: data.appointmentAllowStaffCreate,
        }),
        api.post("/settings/appointment.autoConfirm", {
          value: data.appointmentAutoConfirm,
        }),
        api.post("/settings/appointment.defaultDurationMinutes", {
          value: Math.max(
            15,
            Math.floor(data.appointmentDefaultDurationMinutes),
          ),
        }),
        api.post("/settings/order.defaultTaxRateBps", {
          value: Math.max(0, Math.floor(data.orderDefaultTaxRateBps)),
        }),
        api.post("/settings/global_commission_rate", {
          value: Math.max(0, data.globalCommissionRate),
        }),
      ]);
    },
    onSuccess: async () => {
      toast.success("Operasyon ayarları kaydedildi.");
      await queryClient.invalidateQueries({ queryKey: ["admin-settings-all"] });
    },
    onError: (error: unknown) => {
      toast.error(
        resolveApiErrorMessage(error, "Operasyon ayarları kaydedilemedi."),
      );
    },
  });

  const saveSiteProfileMutation = useMutation({
    mutationFn: async (data: SiteProfileSettings) => {
      await api.post("/settings/site.profile", { value: data });
    },
    onSuccess: async () => {
      toast.success("Site ayarları kaydedildi.");
      await queryClient.invalidateQueries({ queryKey: ["admin-settings-all"] });
    },
    onError: (error: unknown) => {
      toast.error(
        resolveApiErrorMessage(error, "Site ayarları kaydedilemedi."),
      );
    },
  });

  const saveLegalMutation = useMutation({
    mutationFn: async (data: LegalSettings) => {
      await api.post("/settings/legal.documents", { value: data });
    },
    onSuccess: async () => {
      toast.success("Yasal metin ayarları kaydedildi.");
      await queryClient.invalidateQueries({ queryKey: ["admin-settings-all"] });
    },
    onError: (error: unknown) => {
      toast.error(
        resolveApiErrorMessage(error, "Yasal metin ayarları kaydedilemedi."),
      );
    },
  });

  const saveBrandMutation = useMutation({
    mutationFn: async (data: BrandSettings) => {
      await api.post("/settings/brand.appearance", { value: data });
    },
    onSuccess: async () => {
      toast.success("Marka ayarları kaydedildi.");
      await queryClient.invalidateQueries({ queryKey: ["admin-settings-all"] });
    },
    onError: (error: unknown) => {
      toast.error(
        resolveApiErrorMessage(error, "Marka ayarları kaydedilemedi."),
      );
    },
  });

  const saveSeoMutation = useMutation({
    mutationFn: async (data: SeoSettings) => {
      await api.post("/settings/seo.defaults", { value: data });
    },
    onSuccess: async () => {
      toast.success("SEO ayarları kaydedildi.");
      await queryClient.invalidateQueries({ queryKey: ["admin-settings-all"] });
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, "SEO ayarları kaydedilemedi."));
    },
  });

  const operationSummary = useMemo(() => {
    return {
      moderation: draft.operations.moderationEnabled ? "Açık" : "Kapalı",
      appointmentDuration: `${draft.operations.appointmentDefaultDurationMinutes} dk`,
      commission: `%${(draft.operations.globalCommissionRate * 100).toFixed(2)}`,
    };
  }, [draft.operations]);

  const reloadFromServer = () => {
    resetDraft();
    void settingsQuery.refetch();
    toast.success("Ayarlar sunucudan yenilendi.");
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="border-b border-[var(--neutral-200)] pb-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              Ayarlar
            </p>
            <h1 className="mt-1 text-3xl font-serif text-[var(--primary-800)] md:text-4xl">
              Genel ayarlar
            </h1>
            <p className="mt-1 text-sm text-[var(--neutral-600)]">
              Operasyon, site bilgisi, yasal metin, marka ve SEO
              konfigürasyonlarını yönetin.
            </p>
          </div>
          <button
            type="button"
            onClick={reloadFromServer}
            disabled={settingsQuery.isLoading}
            className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white px-5 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Sunucudan yenile
          </button>
        </div>
      </div>

      {settingsQuery.isLoading ? (
        <section className={sectionCardClass}>
          <p className="text-sm text-[var(--neutral-600)]">
            Ayarlar yükleniyor...
          </p>
        </section>
      ) : null}

      {/* Stat strip */}
      <div className="grid gap-4 border-b border-[var(--neutral-200)] pb-5 md:grid-cols-3">
        <div>
          <Settings className="h-5 w-5 text-[var(--primary-800)]/60" />
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
            Moderasyon
          </p>
          <p className="mt-1 text-base font-semibold text-[var(--primary-800)]">
            {operationSummary.moderation}
          </p>
        </div>
        <div>
          <FileText className="h-5 w-5 text-[var(--primary-800)]/60" />
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
            Randevu varsıyılan
          </p>
          <p className="mt-1 text-base font-semibold text-[var(--primary-800)]">
            {operationSummary.appointmentDuration}
          </p>
        </div>
        <div>
          <Globe className="h-5 w-5 text-[var(--primary-800)]/60" />
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
            Komisyon oranı
          </p>
          <p className="mt-1 text-base font-semibold text-[var(--primary-800)]">
            {operationSummary.commission}
          </p>
        </div>
      </div>

      {/* Operations section */}
      <section className="border-t border-[var(--neutral-200)] pt-6">
        <h2 className="mb-4 text-xl font-serif text-[var(--primary-800)]">
          Operasyon ayarları
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-3 text-sm text-[var(--primary-800)]">
            <input
              type="checkbox"
              checked={draft.operations.moderationEnabled}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  operations: {
                    ...prev.operations,
                    moderationEnabled: e.target.checked,
                  },
                }))
              }
            />
            Ürün moderasyonu aktif
          </label>

          <label className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-3 text-sm text-[var(--primary-800)]">
            <input
              type="checkbox"
              checked={draft.operations.appointmentAllowStaffCreate}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  operations: {
                    ...prev.operations,
                    appointmentAllowStaffCreate: e.target.checked,
                  },
                }))
              }
            />
            Personel randevu oluşturabilsin
          </label>

          <label className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-3 text-sm text-[var(--primary-800)]">
            <input
              type="checkbox"
              checked={draft.operations.appointmentAutoConfirm}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  operations: {
                    ...prev.operations,
                    appointmentAutoConfirm: e.target.checked,
                  },
                }))
              }
            />
            Yeni randevular otomatik onaylansın
          </label>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              Varsayılan randevu süresi (dk)
            </label>
            <input
              type="number"
              min={15}
              step={15}
              value={draft.operations.appointmentDefaultDurationMinutes}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  operations: {
                    ...prev.operations,
                    appointmentDefaultDurationMinutes:
                      Number(e.target.value) > 0 ? Number(e.target.value) : 60,
                  },
                }))
              }
              className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              Varsayılan vergi (bps)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={draft.operations.orderDefaultTaxRateBps}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  operations: {
                    ...prev.operations,
                    orderDefaultTaxRateBps:
                      Number(e.target.value) >= 0 ? Number(e.target.value) : 0,
                  },
                }))
              }
              className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              Komisyon oranı (0-1)
            </label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={draft.operations.globalCommissionRate}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  operations: {
                    ...prev.operations,
                    globalCommissionRate:
                      Number(e.target.value) >= 0 ? Number(e.target.value) : 0,
                  },
                }))
              }
              className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => saveOperationsMutation.mutate(draft.operations)}
          disabled={saveOperationsMutation.isPending}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary-800)] px-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saveOperationsMutation.isPending
            ? "Kaydediliyor..."
            : "Operasyonu kaydet"}
        </button>
      </section>

      {/* Site + Legal */}
      <section className="grid gap-6 border-t border-[var(--neutral-200)] pt-6 md:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Settings className="h-5 w-5 text-[var(--primary-800)]/60" />
            <h2 className="text-xl font-serif text-[var(--primary-800)]">
              Site ayarları
            </h2>
          </div>
          <div className="mt-3 grid gap-3">
            <input
              value={draft.siteProfile.businessName}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  siteProfile: {
                    ...prev.siteProfile,
                    businessName: e.target.value,
                  },
                }))
              }
              className="h-11 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
              placeholder="Firma adı"
            />
            <input
              value={draft.siteProfile.contactPhone}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  siteProfile: {
                    ...prev.siteProfile,
                    contactPhone: e.target.value,
                  },
                }))
              }
              className="h-11 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
              placeholder="İletişim telefonu"
            />
            <input
              value={draft.siteProfile.contactEmail}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  siteProfile: {
                    ...prev.siteProfile,
                    contactEmail: e.target.value,
                  },
                }))
              }
              className="h-11 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
              placeholder="İletişim e-posta"
            />
            <input
              value={draft.siteProfile.supportWhatsapp}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  siteProfile: {
                    ...prev.siteProfile,
                    supportWhatsapp: e.target.value,
                  },
                }))
              }
              className="h-11 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
              placeholder="WhatsApp destek no"
            />
          </div>
          <button
            type="button"
            onClick={() => saveSiteProfileMutation.mutate(draft.siteProfile)}
            disabled={saveSiteProfileMutation.isPending}
            className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary-800)] px-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveSiteProfileMutation.isPending
              ? "Kaydediliyor..."
              : "Site ayarını kaydet"}
          </button>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-[var(--primary-800)]/60" />
            <h2 className="text-xl font-serif text-[var(--primary-800)]">
              Yasal metinler
            </h2>
          </div>
          <div className="mt-3 grid gap-3">
            <input
              value={draft.legal.kvkkUrl}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  legal: { ...prev.legal, kvkkUrl: e.target.value },
                }))
              }
              className="h-11 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
              placeholder="/legal/kvkk"
            />
            <input
              value={draft.legal.privacyUrl}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  legal: { ...prev.legal, privacyUrl: e.target.value },
                }))
              }
              className="h-11 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
              placeholder="/legal/privacy"
            />
            <input
              value={draft.legal.distanceSalesUrl}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  legal: { ...prev.legal, distanceSalesUrl: e.target.value },
                }))
              }
              className="h-11 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
              placeholder="/legal/distance-sales"
            />
          </div>
          <button
            type="button"
            onClick={() => saveLegalMutation.mutate(draft.legal)}
            disabled={saveLegalMutation.isPending}
            className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary-800)] px-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveLegalMutation.isPending
              ? "Kaydediliyor..."
              : "Yasal metni kaydet"}
          </button>
        </div>
      </section>

      {/* Brand + SEO */}
      <section className="grid gap-6 border-t border-[var(--neutral-200)] pt-6 md:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Palette className="h-5 w-5 text-[var(--primary-800)]/60" />
            <h2 className="text-xl font-serif text-[var(--primary-800)]">
              Marka görünümü
            </h2>
          </div>
          <div className="mt-3 grid gap-3">
            <input
              value={draft.brand.logoUrl}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  brand: { ...prev.brand, logoUrl: e.target.value },
                }))
              }
              className="h-11 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
              placeholder="Logo URL"
            />
            <input
              value={draft.brand.primaryColor}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  brand: { ...prev.brand, primaryColor: e.target.value },
                }))
              }
              className="h-11 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
              placeholder="#1A3C34"
            />
            <input
              value={draft.brand.secondaryColor}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  brand: { ...prev.brand, secondaryColor: e.target.value },
                }))
              }
              className="h-11 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
              placeholder="#C5A059"
            />
          </div>
          <button
            type="button"
            onClick={() => saveBrandMutation.mutate(draft.brand)}
            disabled={saveBrandMutation.isPending}
            className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary-800)] px-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveBrandMutation.isPending ? "Kaydediliyor..." : "Markayı kaydet"}
          </button>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <Globe className="h-5 w-5 text-[var(--primary-800)]/60" />
            <h2 className="text-xl font-serif text-[var(--primary-800)]">
              SEO ayarları
            </h2>
          </div>
          <div className="mt-3 grid gap-3">
            <input
              value={draft.seo.siteUrl}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  seo: { ...prev.seo, siteUrl: e.target.value },
                }))
              }
              className="h-11 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
              placeholder="https://nutopiano.com"
            />
            <input
              value={draft.seo.defaultTitle}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  seo: { ...prev.seo, defaultTitle: e.target.value },
                }))
              }
              className="h-11 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
              placeholder="Varsayılan başlık"
            />
            <input
              value={draft.seo.defaultDescription}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  seo: { ...prev.seo, defaultDescription: e.target.value },
                }))
              }
              className="h-11 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
              placeholder="Varsayılan açıklama"
            />
            <input
              value={draft.seo.defaultOgImage}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  seo: { ...prev.seo, defaultOgImage: e.target.value },
                }))
              }
              className="h-11 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
              placeholder="OG image URL"
            />
          </div>
          <button
            type="button"
            onClick={() => saveSeoMutation.mutate(draft.seo)}
            disabled={saveSeoMutation.isPending}
            className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary-800)] px-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveSeoMutation.isPending
              ? "Kaydediliyor..."
              : "SEO ayarını kaydet"}
          </button>
        </div>
      </section>
    </div>
  );
}
