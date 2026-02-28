'use client';

export type ProductEditorType = 'PHYSICAL' | 'SERVICE' | 'WEIGHT' | 'CUSTOM';

export type ProductEditorFormValue = {
  name: string;
  subtitle: string;
  sku: string;
  type: ProductEditorType;
  price: string;
  stock: string;
  description: string;
  features: string;
  imageUrl: string;
  images: string;
  tags: string;
  seoTitle: string;
  seoDescription: string;
  isPublished: boolean;
};

export type ProductEditorCategoryOption = {
  id: number;
  name: string;
  level?: number;
};

export const defaultProductEditorFormValue: ProductEditorFormValue = {
  name: '',
  subtitle: '',
  sku: '',
  type: 'PHYSICAL',
  price: '',
  stock: '',
  description: '',
  features: '',
  imageUrl: '',
  images: '',
  tags: '',
  seoTitle: '',
  seoDescription: '',
  isPublished: false,
};

export const parsePriceInputToCents = (raw: string) => {
  const normalized = raw.trim().replace(/\s+/g, '').replace(',', '.');
  if (!normalized) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  const [wholePart, fractionPart = ''] = normalized.split('.');
  const whole = Number(wholePart);
  const fraction = Number((fractionPart + '00').slice(0, 2));
  if (!Number.isFinite(whole) || !Number.isFinite(fraction)) return null;
  return whole * 100 + fraction;
};

type ProductEditorFormProps = {
  title: string;
  subtitle?: string;
  badgeLabel?: string;
  categoryId: number | null;
  categoryOptions: ProductEditorCategoryOption[];
  onCategoryChange: (categoryId: number | null) => void;
  categoryPlaceholder?: string;
  value: ProductEditorFormValue;
  onChange: (next: ProductEditorFormValue) => void;
  onSubmit: () => void;
  submitLabel: string;
  submitPending?: boolean;
  submitDisabled?: boolean;
  onReset?: () => void;
  resetLabel?: string;
  resetDisabled?: boolean;
  footerHint?: string;
  priceFormatter?: (priceCents?: number) => string;
};

const defaultPriceFormatter = (priceCents?: number) => {
  if (typeof priceCents !== 'number') return '-';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2,
  }).format(priceCents / 100);
};

export default function ProductEditorForm({
  title,
  subtitle,
  badgeLabel,
  categoryId,
  categoryOptions,
  onCategoryChange,
  categoryPlaceholder = 'Kategori secin',
  value,
  onChange,
  onSubmit,
  submitLabel,
  submitPending = false,
  submitDisabled = false,
  onReset,
  resetLabel = 'Formu Temizle',
  resetDisabled = false,
  footerHint,
  priceFormatter = defaultPriceFormatter,
}: ProductEditorFormProps) {
  const setField = <K extends keyof ProductEditorFormValue>(
    key: K,
    nextValue: ProductEditorFormValue[K],
  ) => {
    onChange({ ...value, [key]: nextValue });
  };

  const pricePreview = priceFormatter(parsePriceInputToCents(value.price) ?? undefined);

  return (
    <div className="rounded-xl border border-[var(--neutral-200)] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--primary-800)]">{title}</p>
          {subtitle ? <p className="mt-1 text-xs text-[var(--neutral-600)]">{subtitle}</p> : null}
        </div>
        {badgeLabel ? (
          <span className="rounded-full border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-1 text-[11px] font-semibold text-[var(--primary-800)]">
            {badgeLabel}
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--neutral-600)]">
          Kategori
          <select
            value={categoryId ?? ''}
            onChange={(e) => {
              const next = Number(e.target.value);
              onCategoryChange(Number.isFinite(next) && next > 0 ? next : null);
            }}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--neutral-200)] bg-white px-2 text-sm text-[var(--primary-800)]"
          >
            <option value="">{categoryPlaceholder}</option>
            {categoryOptions.map((row) => (
              <option key={row.id} value={row.id}>
                {`${'-- '.repeat(Math.max(row.level ?? 0, 0))}${row.name}`}
              </option>
            ))}
          </select>
        </label>

        <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--neutral-600)]">
          Urun Adi
          <input
            value={value.name}
            onChange={(e) => setField('name', e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
            placeholder="Orn: Klasik Gitar Teli"
          />
        </label>

        <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--neutral-600)]">
          Alt Baslik
          <input
            value={value.subtitle}
            onChange={(e) => setField('subtitle', e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
            placeholder="Orn: Profesyonel seri"
          />
        </label>

        <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--neutral-600)]">
          SKU
          <input
            value={value.sku}
            onChange={(e) => setField('sku', e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
            placeholder="NP-STR-001"
          />
        </label>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--neutral-600)]">
          Urun Tipi
          <select
            value={value.type}
            onChange={(e) => setField('type', e.target.value as ProductEditorType)}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--neutral-200)] bg-white px-2 text-sm text-[var(--primary-800)]"
          >
            <option value="PHYSICAL">PHYSICAL</option>
            <option value="SERVICE">SERVICE</option>
            <option value="WEIGHT">WEIGHT</option>
            <option value="CUSTOM">CUSTOM</option>
          </select>
        </label>

        <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--neutral-600)]">
          Fiyat (TL)
          <input
            value={value.price}
            onChange={(e) => setField('price', e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
            placeholder="1499.90"
            inputMode="decimal"
          />
        </label>

        <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--neutral-600)]">
          Stok
          <input
            value={value.stock}
            onChange={(e) => setField('stock', e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
            placeholder="0"
            inputMode="numeric"
          />
        </label>

        <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--neutral-600)]">
          Gorsel URL
          <input
            value={value.imageUrl}
            onChange={(e) => setField('imageUrl', e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
            placeholder="https://..."
          />
        </label>
      </div>

      <label className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--neutral-600)]">
        Aciklama
        <textarea
          value={value.description}
          onChange={(e) => setField('description', e.target.value)}
          className="mt-1 min-h-[88px] w-full rounded-lg border border-[var(--neutral-200)] bg-white px-3 py-2 text-sm text-[var(--primary-800)]"
          placeholder="Marketplace detay sayfasinda gorunecek urun aciklamasi"
        />
      </label>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--neutral-600)]">
          Ozellikler (satir satir)
          <textarea
            value={value.features}
            onChange={(e) => setField('features', e.target.value)}
            className="mt-1 min-h-[110px] w-full rounded-lg border border-[var(--neutral-200)] bg-white px-3 py-2 text-sm text-[var(--primary-800)]"
            placeholder={'Hafif govde\nUzun omur\nPremium malzeme'}
          />
        </label>

        <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--neutral-600)]">
          Ek Gorseller (satir satir URL)
          <textarea
            value={value.images}
            onChange={(e) => setField('images', e.target.value)}
            className="mt-1 min-h-[110px] w-full rounded-lg border border-[var(--neutral-200)] bg-white px-3 py-2 text-sm text-[var(--primary-800)]"
            placeholder={'https://.../img-1.jpg\nhttps://.../img-2.jpg'}
          />
        </label>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--neutral-600)]">
          Etiketler
          <input
            value={value.tags}
            onChange={(e) => setField('tags', e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
            placeholder="gitar, aksesuar, premium"
          />
        </label>

        <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--neutral-600)]">
          SEO Baslik
          <input
            value={value.seoTitle}
            onChange={(e) => setField('seoTitle', e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
            placeholder="Google basligi"
          />
        </label>

        <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--neutral-600)]">
          SEO Aciklama
          <input
            value={value.seoDescription}
            onChange={(e) => setField('seoDescription', e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
            placeholder="Arama sonucunda gorunen aciklama"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-xs text-[var(--primary-800)]">
            <input
              type="checkbox"
              checked={value.isPublished}
              onChange={(e) => setField('isPublished', e.target.checked)}
              className="h-4 w-4 rounded border border-[var(--neutral-300)]"
            />
            Marketplace icin urunu hemen yayinla
          </label>
          <p className="text-xs text-[var(--neutral-600)]">
            Fiyat onizleme: <span className="font-semibold">{pricePreview}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onReset ? (
            <button
              type="button"
              onClick={onReset}
              disabled={resetDisabled}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--neutral-200)] bg-white px-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary-800)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resetLabel}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onSubmit}
            disabled={submitPending || submitDisabled}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--primary-800)] px-4 text-xs font-semibold uppercase tracking-[0.16em] text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitPending ? 'Kaydediliyor...' : submitLabel}
          </button>
        </div>
      </div>

      {footerHint ? <p className="mt-2 text-xs text-red-700">{footerHint}</p> : null}
    </div>
  );
}
