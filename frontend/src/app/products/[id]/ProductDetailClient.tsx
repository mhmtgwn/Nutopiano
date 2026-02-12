'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, ShoppingBag, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAppDispatch } from '@/store';
import { useAppSelector } from '@/store';
import { addItem } from '@/store/cartSlice';
import { formatPrice } from '@/utils/helpers';
import Button from '@/components/common/Button';

interface ProductDetail {
  id: string;
  name: string;
  subtitle?: string | null;
  description?: string | null;
  features?: string[];
  price: number;
  imageUrl?: string | null;
  images?: string[];
  stock?: number | null;
  tags?: string[];
}

export interface ProductDetailClientProps {
  product: ProductDetail;
  categoryId?: string;
}

export default function ProductDetailClient({
  product,
  categoryId,
}: ProductDetailClientProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(
    (state) => state.user.status === 'authenticated',
  );
  const isOutOfStock = typeof product.stock === 'number' && product.stock <= 0;
  const breadcrumbLabel = categoryId ? 'Kategori' : 'Shop';
  const breadcrumbHref = categoryId ? `/categories/${categoryId}` : '/products';

  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'features' | 'description' | 'reviews'>('features');

  const variationOptions = useMemo(() => {
    const tags = product.tags ?? [];
    const variants = tags
      .map((t) => String(t))
      .filter((t) => /^var\s*:/i.test(t) || /^variant\s*:/i.test(t))
      .map((t) => t.replace(/^var\s*:/i, '').replace(/^variant\s*:/i, '').trim())
      .filter(Boolean);

    return Array.from(new Set(variants));
  }, [product.tags]);

  const [selectedVariation, setSelectedVariation] = useState<string>('');

  useEffect(() => {
    if (variationOptions.length === 0) {
      if (selectedVariation) setSelectedVariation('');
      return;
    }

    if (variationOptions.length === 1) {
      const only = variationOptions[0];
      if (selectedVariation !== only) setSelectedVariation(only);
      return;
    }

    if (selectedVariation && !variationOptions.includes(selectedVariation)) {
      setSelectedVariation('');
    }
  }, [selectedVariation, variationOptions]);

  const placeholderSeed = Number.parseInt(String(product.id), 10);
  const placeholderId = Number.isFinite(placeholderSeed)
    ? Math.abs(placeholderSeed % 1000)
    : 1;
  const fallbackImageSrc = `https://picsum.photos/seed/nutopiano-${placeholderId}/1000/1000`;
  const galleryImages =
    product.images && product.images.length > 0
      ? product.images
      : product.imageUrl
        ? [product.imageUrl]
        : [fallbackImageSrc];

  const activeImageSrc = galleryImages[Math.min(activeImageIndex, galleryImages.length - 1)];

  const maxQuantity = useMemo(() => {
    if (typeof product.stock === 'number' && product.stock > 0) {
      return product.stock;
    }
    return 99;
  }, [product.stock]);

  const lowStockWarning =
    typeof product.stock === 'number' && product.stock > 0 && product.stock <= 5;

  const handleAddToCart = () => {
    if (isOutOfStock) {
      toast.error('Ürün stokta yok.');
      return;
    }

    if (variationOptions.length > 0 && !selectedVariation) {
      toast.error('Lütfen bir varyasyon seçin.');
      return;
    }

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    dispatch(
      addItem({
        item: {
          lineId: `${product.id}${selectedVariation ? `::${selectedVariation}` : ''}`,
          productId: product.id,
          name: product.name,
          variant: selectedVariation || undefined,
          price: product.price,
          imageUrl: product.imageUrl ?? undefined,
        },
        quantity,
      }),
    );

    toast.success('Sepete eklendi');
  };

  return (
    <div className="min-h-[calc(100vh-140px)] bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 md:px-6">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
          <Link href="/" className="transition-colors hover:text-[var(--primary-800)]">
            Anasayfa
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link href={breadcrumbHref} className="transition-colors hover:text-[var(--primary-800)]">
            {breadcrumbLabel}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-[var(--primary-800)]">{product.name}</span>
        </div>

        <section className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start md:gap-0">
          <div className="space-y-4">
            <div className="overflow-hidden bg-white">
              <div className="mx-auto w-full max-w-[560px]">
                <div className="relative aspect-square w-full max-h-[70vh] overflow-hidden rounded-[var(--radius-2xl)]">
                  <Image
                    src={activeImageSrc}
                    alt={product.name}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {galleryImages.slice(0, 4).map((src, index) => {
                const active = index === activeImageIndex;
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    className={`relative aspect-square overflow-hidden rounded-[var(--radius-xl)] border bg-white transition ${
                      active
                        ? 'border-[var(--primary-800)] shadow-[var(--shadow-sm)]'
                        : 'border-[var(--neutral-200)] hover:border-[var(--primary-800)]/40'
                    }`}
                    aria-label={`Görsel ${index + 1}`}
                  >
                    <Image src={src} alt={product.name} fill className="object-cover" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-5 md:border-l md:border-[var(--neutral-200)] md:pl-10">
            <div className="w-full max-w-[560px]">
              <header className="space-y-1">
                <h1 className="text-[28px] font-serif leading-tight text-[var(--primary-800)] md:text-[36px]">
                  {product.name}
                </h1>
                {product.subtitle && (
                  <p className="text-sm font-medium text-[var(--neutral-700)] md:text-base">
                    {product.subtitle}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 text-[var(--accent-600)]">
                    <Star className="h-5 w-5 fill-current" />
                    <span className="text-sm font-semibold text-[var(--neutral-700)]">0.0</span>
                  </div>

                  {lowStockWarning && (
                    <span className="inline-flex items-center rounded-full border border-[var(--warning-600)]/20 bg-[var(--warning-100)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--warning-700)]">
                      Kritik stok: {product.stock}
                    </span>
                  )}
                </div>
              </header>
            </div>

            <div className="w-full max-w-[560px] flex flex-col gap-6">
              {variationOptions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                    Varyasyon
                  </p>
                  <select
                    value={selectedVariation}
                    onChange={(e) => setSelectedVariation(e.target.value)}
                    className="h-11 w-full appearance-none rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 text-sm font-medium text-[var(--neutral-700)] shadow-[var(--shadow-sm)] outline-none transition focus-visible:border-[var(--primary-800)] focus-visible:ring-1 focus-visible:ring-[var(--primary-800)]"
                  >
                    <option value="">Seçiniz</option>
                    {variationOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid gap-6 sm:grid-cols-2 sm:items-end">
                <div className="space-y-1">
                  <p className="text-[28px] font-semibold leading-none text-[var(--primary-800)]">
                    {formatPrice(product.price)}
                  </p>
                </div>

                <div className="space-y-2 sm:justify-self-end">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {typeof product.stock === 'number' && (
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                          isOutOfStock
                            ? 'border border-[var(--error-600)]/20 bg-[var(--error-100)] text-[var(--error-600)]'
                            : 'border border-[var(--success-600)]/20 bg-[var(--success-100)] text-[var(--success-600)]'
                        }`}
                      >
                        {isOutOfStock ? 'Stok yok' : 'Stokta'}
                      </span>
                    )}
                  </div>
                  <div className="inline-flex w-fit items-center overflow-hidden rounded-full border border-[var(--neutral-200)] bg-white">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-4 py-2 text-sm font-semibold text-[var(--primary-800)] transition-colors hover:bg-[var(--neutral-50)]"
                      aria-label="Adet azalt"
                    >
                      -
                    </button>
                    <span className="min-w-[3rem] px-3 py-2 text-center text-sm font-semibold text-[var(--primary-800)]">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                      className="px-4 py-2 text-sm font-semibold text-[var(--primary-800)] transition-colors hover:bg-[var(--neutral-50)]"
                      aria-label="Adet artır"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock || (variationOptions.length > 0 && !selectedVariation)}
                className="mt-10 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-2xl)] bg-[var(--primary-800)] px-6 text-sm font-semibold uppercase tracking-[0.22em] text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-700)] hover:shadow-[var(--shadow-lg)] active:bg-[var(--primary-900)] disabled:cursor-not-allowed disabled:bg-[var(--neutral-300)] disabled:text-[var(--neutral-700)]"
                aria-label={isOutOfStock ? 'Tükendi' : 'Sepete ekle'}
              >
                <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                <span>{isOutOfStock ? 'Tükendi' : 'Sepete ekle'}</span>
              </button>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--neutral-200)] pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('features')}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] transition ${
                activeTab === 'features'
                  ? 'bg-[var(--primary-800)] text-white'
                  : 'bg-white text-[var(--primary-800)]/70 hover:text-[var(--primary-800)]'
              }`}
            >
              Özellikler
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('description')}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] transition ${
                activeTab === 'description'
                  ? 'bg-[var(--primary-800)] text-white'
                  : 'bg-white text-[var(--primary-800)]/70 hover:text-[var(--primary-800)]'
              }`}
            >
              Açıklama
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] transition ${
                activeTab === 'reviews'
                  ? 'bg-[var(--primary-800)] text-white'
                  : 'bg-white text-[var(--primary-800)]/70 hover:text-[var(--primary-800)]'
              }`}
            >
              Yorumlar
            </button>
          </div>

          <div className="pt-6">
            {activeTab === 'features' && (
              <div className="max-w-3xl">
                {product.features && product.features.length > 0 ? (
                  <ul className="grid gap-3 text-sm text-[var(--neutral-700)] md:grid-cols-2">
                    {product.features.map((feature) => (
                      <li
                        key={feature}
                        className="rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] px-5 py-4"
                      >
                        {feature}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[var(--neutral-600)]">
                    Bu ürün için özellik eklenmemiş.
                  </p>
                )}
              </div>
            )}

            {activeTab === 'description' && (
              <p className="max-w-3xl text-sm leading-relaxed text-[var(--neutral-700)] md:text-base">
                {product.description || 'Bu ürün için açıklama eklenmemiş.'}
              </p>
            )}

            {activeTab === 'reviews' && (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--primary-800)]">
                    Henüz yorum yok
                  </h2>
                  <p className="mt-1 text-sm text-[var(--neutral-600)]">
                    İlk yorumu sen bırak.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[var(--accent-600)]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={`star-${index}`} className="h-5 w-5" />
                  ))}
                  <span className="ml-2 text-sm font-semibold text-[var(--neutral-700)]">
                    0.0
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
