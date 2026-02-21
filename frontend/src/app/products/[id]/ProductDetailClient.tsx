'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Search, ShoppingBag, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useAppDispatch } from '@/store';
import { useAppSelector } from '@/store';
import { addItem } from '@/store/cartSlice';
import { formatDate, formatPrice } from '@/utils/helpers';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';

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
  if (Array.isArray(message)) {
    return message.map(String).join(', ');
  }
  if (typeof message === 'string') return message;
  return fallback;
};

interface ProductDetail {
  id: string;
  categoryId?: number | null;
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

type PublicProductReview = {
  id: number;
  rating: number;
  comment?: string | null;
  customerName: string;
  createdAt: string;
  updatedAt: string;
};

export default function ProductDetailClient({
  product,
  categoryId,
}: ProductDetailClientProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isOutOfStock = typeof product.stock === 'number' && product.stock <= 0;

  interface PublicCategoryTreeNode {
    id: number;
    name: string;
    slug: string;
    parentId?: number | null;
    orderIndex: number;
    children?: PublicCategoryTreeNode[];
  }

  const {
    data: categoriesTree,
  } = useQuery<PublicCategoryTreeNode[]>({
    queryKey: ['public-categories-tree'],
    queryFn: async () => {
      const res = await api.get<PublicCategoryTreeNode[]>('/public/categories/tree');
      return res.data;
    },
  });

  const categoriesIndex = useMemo(() => {
    const byId = new Map<number, PublicCategoryTreeNode>();
    const walk = (nodes: PublicCategoryTreeNode[]) => {
      for (const node of nodes) {
        byId.set(node.id, node);
        if (node.children && node.children.length > 0) {
          walk(node.children);
        }
      }
    };
    walk(categoriesTree ?? []);
    return byId;
  }, [categoriesTree]);

  const categoriesBySlug = useMemo(() => {
    const bySlug = new Map<string, PublicCategoryTreeNode>();
    const walk = (nodes: PublicCategoryTreeNode[]) => {
      for (const node of nodes) {
        if (node.slug) bySlug.set(node.slug, node);
        if (node.children && node.children.length > 0) {
          walk(node.children);
        }
      }
    };
    walk(categoriesTree ?? []);
    return bySlug;
  }, [categoriesTree]);

  const breadcrumbItems = useMemo(() => {
    const items: Array<{ label: string; href?: string }> = [
      { label: 'Anasayfa', href: '/' },
      { label: 'Shop', href: '/categories' },
    ];

    const categoryIdString = typeof categoryId === 'string' ? categoryId.trim() : '';
    const fromCategoryId = categoryIdString ? Number(categoryIdString) : undefined;
    const resolvedCategoryId =
      typeof fromCategoryId === 'number' && Number.isFinite(fromCategoryId)
        ? fromCategoryId
        : typeof product.categoryId === 'number' && Number.isFinite(product.categoryId)
          ? product.categoryId
          : undefined;

    const resolvedCategoryFromSlug =
      categoryIdString && !Number.isFinite(fromCategoryId as number)
        ? categoriesBySlug.get(categoryIdString)
        : undefined;

    if (resolvedCategoryFromSlug) {
      const chain: PublicCategoryTreeNode[] = [];
      let current: PublicCategoryTreeNode | undefined = resolvedCategoryFromSlug;
      while (current) {
        chain.push(current);
        const parentId = current.parentId;
        if (typeof parentId !== 'number') break;
        current = categoriesIndex.get(parentId);
      }
      chain.reverse();

      for (const node of chain) {
        items.push({ label: node.name, href: `/categories/${node.slug}` });
      }
    } else if (resolvedCategoryId) {
      const chain: PublicCategoryTreeNode[] = [];
      let current = categoriesIndex.get(resolvedCategoryId);
      while (current) {
        chain.push(current);
        const parentId = current.parentId;
        if (typeof parentId !== 'number') break;
        current = categoriesIndex.get(parentId);
      }
      chain.reverse();

      for (const node of chain) {
        items.push({ label: node.name, href: `/categories/${node.slug}` });
      }
    }

    items.push({ label: product.name });
    return items;
  }, [categoriesBySlug, categoriesIndex, categoryId, product.categoryId, product.name]);

  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'features' | 'description' | 'reviews'>('features');
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomOffset, setZoomOffset] = useState({ x: 0, y: 0 });
  const [isDraggingZoom, setIsDraggingZoom] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const user = useAppSelector((state) => state.user.user);
  const queryClient = useQueryClient();

  const { data: reviews, isLoading: isLoadingReviews } = useQuery<PublicProductReview[]>({
    queryKey: ['public-product-reviews', product.id],
    enabled: activeTab === 'reviews',
    queryFn: async () => {
      const res = await api.get<PublicProductReview[]>(`/products/${product.id}/reviews`);
      return res.data;
    },
  });

  const avgRating = useMemo(() => {
    const list = reviews ?? [];
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    return sum / list.length;
  }, [reviews]);

  const myExistingReview = useMemo(() => {
    return null;
  }, []);

  const upsertReviewMutation = useMutation({
    mutationFn: async (payload: { rating: number; comment?: string }) => {
      const res = await api.post('/customer/reviews', {
        productId: Number(product.id),
        rating: payload.rating,
        comment: payload.comment,
      });
      return res.data;
    },
    onSuccess: async () => {
      toast.success('Yorum kaydedildi.');
      await queryClient.invalidateQueries({ queryKey: ['public-product-reviews', product.id] });
      await queryClient.invalidateQueries({ queryKey: ['account-reviews'] });
    },
    onError: (err: unknown) => {
      toast.error(resolveApiErrorMessage(err, 'Yorum kaydedilemedi.'));
    },
  });

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

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
  const isRemoteImage = (src: string) => /^https?:\/\//i.test(src);
  const shouldUnoptimize = isRemoteImage(activeImageSrc);

  const canNavigateGallery = galleryImages.length > 1;
  const goPrevImage = () => {
    if (!canNavigateGallery) return;
    setActiveImageIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length);
  };

  const goNextImage = () => {
    if (!canNavigateGallery) return;
    setActiveImageIndex((i) => (i + 1) % galleryImages.length);
  };

  const openZoom = () => {
    setZoomScale(1);
    setZoomOffset({ x: 0, y: 0 });
    setIsZoomOpen(true);
  };

  const closeZoom = () => {
    setIsZoomOpen(false);
    setIsDraggingZoom(false);
  };

  const maxQuantity = useMemo(() => {
    if (typeof product.stock === 'number' && product.stock > 0) {
      return product.stock;
    }
    return 99;
  }, [product.stock]);

  const lowStockWarning =
    typeof product.stock === 'number' && product.stock > 0 && product.stock <= 5;

  const displayTags = useMemo(() => {
    const tags = product.tags ?? [];
    return tags
      .map((t) => String(t))
      .map((t) => t.trim())
      .filter(Boolean)
      .filter((t) => !/^var\s*:/i.test(t) && !/^variant\s*:/i.test(t))
      .slice(0, 8);
  }, [product.tags]);

  const handleAddToCart = () => {
    if (isOutOfStock) {
      toast.error('Ürün stokta yok.');
      return;
    }

    if (variationOptions.length > 0 && !selectedVariation) {
      toast.error('Lütfen bir varyasyon seçin.');
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
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:px-6">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
          {breadcrumbItems.map((item, idx) => {
            const isLast = idx === breadcrumbItems.length - 1;
            return (
              <span key={`${item.label}-${idx}`} className="inline-flex items-center gap-2">
                {item.href && !isLast ? (
                  <Link href={item.href} className="transition-colors hover:text-[var(--primary-800)]">
                    {item.label}
                  </Link>
                ) : (
                  <span className={isLast ? 'text-[var(--primary-800)]' : ''}>{item.label}</span>
                )}
                {!isLast && <ChevronRight className="h-3 w-3" />}
              </span>
            );
          })}
        </div>

        <section className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start md:gap-0">
          <div className="space-y-5">
            <div className="overflow-hidden bg-white">
              <div className="mx-auto w-full max-w-[480px]">
                <div className="relative aspect-square w-full max-h-[56vh] overflow-hidden rounded-[var(--radius-2xl)]">
                  <Image
                    src={activeImageSrc}
                    alt={product.name}
                    fill
                    unoptimized={shouldUnoptimize}
                    className="object-cover"
                    priority
                  />

                  {canNavigateGallery && (
                    <>
                      <button
                        type="button"
                        onClick={goPrevImage}
                        className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-white/80 text-[var(--primary-800)] shadow-[var(--shadow-sm)] backdrop-blur transition hover:bg-white"
                        aria-label="Önceki görsel"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={goNextImage}
                        className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-white/80 text-[var(--primary-800)] shadow-[var(--shadow-sm)] backdrop-blur transition hover:bg-white"
                        aria-label="Sonraki görsel"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={openZoom}
                    className="absolute bottom-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/80 text-[var(--primary-800)] shadow-[var(--shadow-sm)] backdrop-blur transition hover:bg-white"
                    aria-label="Yakınlaştır"
                  >
                    <Search className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mx-auto grid w-full max-w-[480px] grid-cols-4 gap-2">
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
            <div className="w-full max-w-[480px]">
              <header className="space-y-1">
                <h1 className="text-[28px] font-serif leading-tight text-[var(--primary-800)] md:text-[36px]">
                  {product.name}
                </h1>
              </header>
            </div>

            <div className="w-full max-w-[480px] flex flex-col gap-6">
              <div className="min-h-[48px] py-3 text-center text-sm font-medium text-[var(--neutral-700)] md:text-base">
                {product.subtitle ? (
                  product.subtitle
                ) : (
                  <div className="h-6" aria-hidden="true" />
                )}
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
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

                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                      lowStockWarning
                        ? 'border border-[var(--warning-600)]/20 bg-[var(--warning-100)] text-[var(--warning-700)]'
                        : 'border border-transparent bg-transparent text-transparent'
                    }`}
                    aria-hidden={!lowStockWarning}
                  >
                    Kritik stok: {product.stock}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[var(--accent-600)]">
                  <Star className="h-5 w-5 fill-current" />
                  <span className="text-sm font-semibold text-[var(--neutral-700)]">0.0</span>
                </div>
              </div>

              <div className="min-h-[40px]">
                {displayTags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {displayTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full border border-[var(--neutral-200)] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--neutral-600)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="h-10" aria-hidden="true" />
                )}
              </div>

              <div className="min-h-[44px]">
                {variationOptions.length > 0 ? (
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
                ) : (
                  <div className="h-11 w-full" aria-hidden="true" />
                )}
              </div>

              <div className="grid gap-6 sm:grid-cols-2 sm:items-end">
                <div className="space-y-1">
                  <p className="text-[28px] font-semibold leading-none text-[var(--primary-800)]">
                    {formatPrice(product.price)}
                  </p>
                </div>

                <div className="space-y-2 sm:justify-self-end">
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
                className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-2xl)] bg-[var(--primary-800)] px-6 text-sm font-semibold uppercase tracking-[0.22em] text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--primary-700)] hover:shadow-[var(--shadow-lg)] active:bg-[var(--primary-900)] disabled:cursor-not-allowed disabled:bg-[var(--neutral-300)] disabled:text-[var(--neutral-700)]"
                aria-label={isOutOfStock ? 'Tükendi' : 'Sepete ekle'}
              >
                <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                <span>{isOutOfStock ? 'Tükendi' : 'Sepete ekle'}</span>
              </button>
            </div>
          </div>
        </section>

        {isZoomOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeZoom();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') closeZoom();
            }}
            tabIndex={-1}
          >
            <div className="relative w-full max-w-5xl overflow-hidden rounded-[var(--radius-2xl)] bg-black">
              <div
                className="relative aspect-square w-full"
                onWheel={(e) => {
                  e.preventDefault();
                  const next = Math.min(3, Math.max(1, zoomScale + (e.deltaY > 0 ? -0.12 : 0.12)));
                  setZoomScale(next);
                  if (next === 1) setZoomOffset({ x: 0, y: 0 });
                }}
                onMouseDown={(e) => {
                  setIsDraggingZoom(true);
                  setDragStart({ x: e.clientX - zoomOffset.x, y: e.clientY - zoomOffset.y });
                }}
                onMouseMove={(e) => {
                  if (!isDraggingZoom || zoomScale === 1) return;
                  setZoomOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
                }}
                onMouseUp={() => setIsDraggingZoom(false)}
                onMouseLeave={() => setIsDraggingZoom(false)}
              >
                <Image
                  src={activeImageSrc}
                  alt={product.name}
                  fill
                  unoptimized={shouldUnoptimize}
                  className="object-contain"
                  style={{
                    transform: `translate(${zoomOffset.x}px, ${zoomOffset.y}px) scale(${zoomScale})`,
                    transformOrigin: 'center',
                    cursor: zoomScale > 1 ? (isDraggingZoom ? 'grabbing' : 'grab') : 'zoom-in',
                  }}
                />

                <button
                  type="button"
                  onClick={closeZoom}
                  className="absolute right-3 top-3 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--primary-800)]"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="mt-1">
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
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--primary-800)]">Yorumlar</h2>
                    <p className="mt-1 text-sm text-[var(--neutral-600)]">
                      {reviews && reviews.length > 0
                        ? `${reviews.length} değerlendirme`
                        : 'Henüz yorum yok'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[var(--accent-600)]">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={`star-${index}`}
                        className={`h-5 w-5 ${index < Math.round(avgRating) ? 'fill-current' : ''}`}
                      />
                    ))}
                    <span className="ml-2 text-sm font-semibold text-[var(--neutral-700)]">
                      {avgRating ? avgRating.toFixed(1) : '0.0'}
                    </span>
                  </div>
                </div>

                {user && (
                  <section className="rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white px-4 py-5 shadow-[var(--shadow-md)] md:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                          Yorum yaz
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[var(--primary-800)]">Bu ürünü değerlendir</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                          Puan (1-5)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={reviewRating}
                          onChange={(e) => setReviewRating(Number(e.target.value))}
                          className="h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-sm outline-none"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                          Yorum
                        </label>
                        <textarea
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          className="min-h-[110px] w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 py-3 text-sm outline-none"
                          placeholder="Deneyiminizi yazın..."
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          upsertReviewMutation.mutate({
                            rating: Math.max(1, Math.min(5, Number(reviewRating) || 5)),
                            comment: reviewComment.trim() || undefined,
                          })
                        }
                        disabled={upsertReviewMutation.isPending}
                        className="inline-flex h-11 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-800)] px-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Kaydet
                      </button>
                    </div>
                  </section>
                )}

                {isLoadingReviews ? (
                  <div className="py-8">
                    <Spinner fullscreen />
                  </div>
                ) : reviews && reviews.length > 0 ? (
                  <section className="grid gap-3">
                    {reviews.map((r) => (
                      <article
                        key={r.id}
                        className="rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white px-4 py-5 shadow-[var(--shadow-md)] md:px-6"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[var(--primary-800)]">{r.customerName}</p>
                            <p className="mt-1 text-xs text-[var(--neutral-500)]">{formatDate(r.createdAt)}</p>
                          </div>
                          <span className="rounded-full border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-1 text-xs font-semibold text-[var(--primary-800)]">
                            {r.rating}/5
                          </span>
                        </div>
                        {r.comment && (
                          <p className="mt-3 text-sm leading-relaxed text-[var(--neutral-700)]">{r.comment}</p>
                        )}
                      </article>
                    ))}
                  </section>
                ) : (
                  <p className="text-sm text-[var(--neutral-600)]">İlk yorumu sen bırak.</p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
