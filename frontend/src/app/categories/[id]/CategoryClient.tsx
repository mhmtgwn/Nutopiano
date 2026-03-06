'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import Spinner from '@/components/common/Spinner';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import api from '@/services/api';

interface Product {
  id: string;
  name: string;
  subtitle?: string | null;
  description?: string;
  price: number;
  imageUrl?: string | null;
  type?: string;
  stock?: number | null;
  tags?: string[];
}

interface ApiProduct {
  id: number;
  name: string;
  subtitle?: string | null;
  description?: string | null;
  priceCents: number;
  imageUrl?: string | null;
  stock?: number | null;
  tags?: string[];
}

interface ApiCategoryDetail {
  id: number;
  name: string;
  slug: string;
  products: ApiProduct[];
}

const PAGE_SIZE = 20;
const LEGACY_STORE_CATEGORY_IDS = new Set(['service', 'physical', 'weight', 'custom']);

export default function CategoryClient() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const slug = params?.id ?? '';
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [qInput, setQInput] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    if (slug === 'all') {
      router.replace('/products');
    }
  }, [router, slug]);

  const isLegacy = LEGACY_STORE_CATEGORY_IDS.has(slug);

  const page = Number(searchParams.get('page') ?? '1');
  const sort = searchParams.get('sort') ?? 'popular';

  const { data: category, isLoading, isError } = useQuery<ApiCategoryDetail>({
    queryKey: ['public-category', { slug }],
    enabled: Boolean(slug) && slug !== 'all' && !isLegacy,
    queryFn: async () => {
      const res = await api.get<ApiCategoryDetail>(`/public/categories/${slug}`);
      return res.data;
    },
  });

  const updateQuery = (next: { page?: number; sort?: string }) => {
    const sp = new URLSearchParams(searchParams.toString());

    if (next.page !== undefined) {
      sp.set('page', String(next.page));
    }

    if (next.sort !== undefined) {
      sp.set('sort', next.sort);
    }

    router.push(`/categories/${params.id}?${sp.toString()}`);
  };

  const handlePrevPage = () => {
    if (page > 1) {
      updateQuery({ page: page - 1 });
    }
  };

  const handleNextPage = () => {
    updateQuery({ page: page + 1 });
  };

  const handleSortChange = (value: string) => {
    updateQuery({ page: 1, sort: value });
  };

  const products = useMemo<Product[]>(() => {
    const list = category?.products ?? [];
    return list.map((p) => ({
      id: String(p.id),
      name: p.name,
      subtitle: p.subtitle ?? null,
      description: p.description ?? undefined,
      price: (p.priceCents ?? 0) / 100,
      imageUrl: p.imageUrl ?? null,
      stock: p.stock ?? null,
      tags: p.tags ?? [],
    }));
  }, [category]);

  const normalizeText = (value: string) => {
    try {
      const lowered = value.toLocaleLowerCase?.('tr-TR') ?? value.toLowerCase();
      const normalized =
        typeof lowered.normalize === 'function' ? lowered.normalize('NFD') : lowered;
      return normalized
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ı/g, 'i')
        .replace(/İ/g, 'i')
        .replace(/ş/g, 's')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/\s+/g, ' ')
        .trim();
    } catch {
      return String(value ?? '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
    }
  };

  const normalizedQuery = normalizeText(qInput);
  const queryTokens = useMemo(() => {
    if (!normalizedQuery) return [] as string[];
    return normalizedQuery
      .split(' ')
      .map((t) => t.trim())
      .filter(Boolean)
      .filter((t) => /^[0-9]+$/.test(t) || t.length >= 2)
      .slice(0, 6);
  }, [normalizedQuery]);

  const filteredProducts = useMemo(() => {
    const min = Number(minPrice);
    const max = Number(maxPrice);
    const hasMin = minPrice.trim().length > 0 && Number.isFinite(min);
    const hasMax = maxPrice.trim().length > 0 && Number.isFinite(max);

    return products.filter((p) => {
      if (inStockOnly && !(typeof p.stock === 'number' && p.stock > 0)) {
        return false;
      }

      if (hasMin && p.price < min) return false;
      if (hasMax && p.price > max) return false;

      if (queryTokens.length > 0) {
        const hay = normalizeText(
          [p.name, p.subtitle, p.description, (p.tags ?? []).join(' ')].filter(Boolean).join(' '),
        );
        const ok = queryTokens.every((t) => hay.includes(t));
        if (!ok) return false;
      }

      return true;
    });
  }, [inStockOnly, maxPrice, minPrice, products, queryTokens]);

  const sortedProducts = useMemo(() => {
    const next = [...filteredProducts];

    if (sort === 'price-asc') {
      next.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-desc') {
      next.sort((a, b) => b.price - a.price);
    }

    return next;
  }, [filteredProducts, sort]);

  const handleClearFilters = () => {
    setQInput('');
    setInStockOnly(false);
    setMinPrice('');
    setMaxPrice('');
  };

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const pagedProducts = sortedProducts.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const hasProducts = pagedProducts.length > 0;

  if (slug === 'all') {
    return null;
  }

  if (isLegacy) {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-white">
        <div className="flex flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Shop', href: '/categories' },
              { label: 'Kategori bulunamadı' },
            ]}
          />

          <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white p-6 shadow-[var(--shadow-sm)]">
            <p className="text-sm text-[var(--neutral-600)]">
              Bu kategori artık mevcut değil.
            </p>
            <Link
              href="/categories"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary-800)] underline-offset-2 hover:underline"
            >
              Kategorilere dön <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </div>
      </div>
    );
  }

  if (!category && !isLoading && !isError) {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-white">
        <div className="flex flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Shop', href: '/categories' },
              { label: 'Kategori bulunamadı' },
            ]}
          />

          <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white p-6 shadow-[var(--shadow-sm)]">
            <p className="text-sm text-[var(--neutral-600)]">
              Aradığınız kategori bulunamadı.
            </p>
            <Link
              href="/categories"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary-800)] underline-offset-2 hover:underline"
            >
              Kategorilere dön <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-140px)] bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
        <div className="flex flex-col gap-6">
          <section className="space-y-4">
            <Breadcrumbs
              items={[
                { label: 'Home', href: '/' },
                { label: 'Shop', href: '/categories' },
                { label: category?.name ?? 'Kategori' },
              ]}
            />

            <div className="flex items-center justify-between gap-3 rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white p-3 shadow-[var(--shadow-sm)]">
              <button
                type="button"
                onClick={() => setFiltersOpen((prev) => !prev)}
                className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--primary-800)]/80 shadow-[var(--shadow-sm)] transition hover:shadow-[var(--shadow-md)]"
                aria-expanded={filtersOpen}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtre
              </button>

              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="h-11 min-w-[220px] appearance-none rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 pr-10 text-sm font-medium text-[var(--neutral-700)] shadow-[var(--shadow-sm)] outline-none transition focus-visible:border-[var(--primary-800)] focus-visible:ring-1 focus-visible:ring-[var(--primary-800)]"
                >
                  <option value="popular">Default sorting</option>
                  <option value="price-asc">Sort by price: low to high</option>
                  <option value="price-desc">Sort by price: high to low</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--neutral-500)]" />
              </div>
            </div>

            {filtersOpen && (
              <div className="mt-3 grid gap-3 rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white p-4 shadow-[var(--shadow-sm)]">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                      Ara
                    </p>
                    <input
                      value={qInput}
                      onChange={(e) => setQInput(e.target.value)}
                      placeholder="Ürün ara..."
                      className="mt-2 h-11 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 text-sm font-medium text-[var(--neutral-700)] shadow-[var(--shadow-sm)] outline-none transition focus-visible:border-[var(--primary-800)] focus-visible:ring-1 focus-visible:ring-[var(--primary-800)]"
                    />
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                      Fiyat
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <input
                        value={minPrice}
                        inputMode="decimal"
                        onChange={(e) => setMinPrice(e.target.value)}
                        placeholder="Min ₺"
                        className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 text-sm font-medium text-[var(--neutral-700)] shadow-[var(--shadow-sm)] outline-none transition focus-visible:border-[var(--primary-800)] focus-visible:ring-1 focus-visible:ring-[var(--primary-800)]"
                      />
                      <input
                        value={maxPrice}
                        inputMode="decimal"
                        onChange={(e) => setMaxPrice(e.target.value)}
                        placeholder="Max ₺"
                        className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 text-sm font-medium text-[var(--neutral-700)] shadow-[var(--shadow-sm)] outline-none transition focus-visible:border-[var(--primary-800)] focus-visible:ring-1 focus-visible:ring-[var(--primary-800)]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                    Kategori
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 text-sm font-medium text-[var(--neutral-700)] shadow-[var(--shadow-sm)] inline-flex items-center">
                      {category?.name ?? 'Kategori'}
                    </div>
                    <Link
                      href="/categories"
                      className="inline-flex h-11 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--neutral-700)] shadow-[var(--shadow-sm)] transition hover:bg-white hover:shadow-[var(--shadow-md)]"
                    >
                      Temizle
                    </Link>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setInStockOnly((prev) => !prev)}
                    className={`inline-flex h-11 items-center justify-center rounded-[var(--radius-md)] border px-4 text-xs font-semibold uppercase tracking-[0.3em] shadow-[var(--shadow-sm)] transition hover:shadow-[var(--shadow-md)] ${
                      inStockOnly
                        ? 'border-[var(--primary-800)]/20 bg-[var(--primary-800)] text-white'
                        : 'border-[var(--neutral-200)] bg-white text-[var(--primary-800)]/80'
                    }`}
                  >
                    Stokta
                  </button>

                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="inline-flex h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--neutral-700)] shadow-[var(--shadow-sm)] transition hover:bg-white hover:shadow-[var(--shadow-md)]"
                  >
                    Temizle
                  </button>
                </div>
              </div>
            )}
          </section>

          {isLoading && (
            <section>
              <Spinner fullscreen />
            </section>
          )}

          {isError && !isLoading && (
            <section className="rounded-[var(--radius-lg)] border border-[var(--error-600)]/20 bg-[var(--error-100)] px-4 py-3 text-sm text-[var(--error-600)]">
              Ürünler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.
            </section>
          )}

          {!isLoading && !isError && (
            <section>
              {hasProducts ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
                  {pagedProducts.map((product) => (
                    <div key={product.id}>
                      <ProductCard product={product} categoryId={slug} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white p-8 text-center shadow-[var(--shadow-md)]">
                  <p className="text-sm text-[var(--neutral-600)]">Ürün bulunamadı.</p>
                  <Link
                    href="/categories"
                    className="mt-4 inline-flex text-sm font-semibold text-[var(--primary-800)] underline-offset-2 hover:underline"
                  >
                    Kategorilere dön
                  </Link>
                </div>
              )}
            </section>
          )}

          {!isLoading && !isError && totalPages > 1 && (
            <section className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--neutral-200)] pt-4 text-xs text-[var(--neutral-500)]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Sayfa {safePage} / {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={safePage === 1}
                  className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] shadow-[var(--shadow-sm)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" /> Önceki
                </button>
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={safePage >= totalPages}
                  className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-[var(--primary-800)] px-4 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-[var(--shadow-sm)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sonraki <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
