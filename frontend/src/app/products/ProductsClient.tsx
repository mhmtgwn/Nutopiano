'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronDown,
  SlidersHorizontal,
} from 'lucide-react';

import api from '@/services/api';
import ProductCard from '@/components/ProductCard';
import Spinner from '@/components/common/Spinner';
import Breadcrumbs from '@/components/common/Breadcrumbs';

interface ApiProduct {
  id: number;
  categoryId?: number | null;
  name: string;
  subtitle?: string | null;
  description?: string | null;
  priceCents: number;
  imageUrl?: string | null;
  stock?: number | null;
  tags?: string[];
}

interface Product {
  id: string;
  categoryId?: number | null;
  name: string;
  subtitle?: string | null;
  description?: string;
  price: number;
  imageUrl?: string | null;
  stock?: number | null;
  tags?: string[];
}

interface PublicCategoryTreeNode {
  id: number;
  name: string;
  slug: string;
  parentId?: number | null;
  orderIndex: number;
  children?: PublicCategoryTreeNode[];
}

export default function ProductsClient({
  query,
  categoryId,
}: {
  query?: string;
  categoryId?: number;
}) {
  const [sort, setSort] = useState<'popular' | 'price-asc' | 'price-desc'>('popular');
  const [qInput, setQInput] = useState(query ?? '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(categoryId);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const syncTimer = useRef<number | null>(null);

  useEffect(() => {
    setQInput(query ?? '');
  }, [query]);

  useEffect(() => {
    setSelectedCategoryId(categoryId);
  }, [categoryId]);

  const buildUrl = (next: { q?: string; category?: number }) => {
    const params = new URLSearchParams();
    if (next.q) params.set('q', next.q);
    if (typeof next.category === 'number' && Number.isFinite(next.category)) {
      params.set('category', String(next.category));
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  useEffect(() => {
    const initialQuery = (query ?? '').trim();
    const currentQuery = qInput.trim();
    const initialCategory = categoryId;
    const currentCategory = selectedCategoryId;
    if (currentQuery === initialQuery && initialCategory === currentCategory) return;

    if (syncTimer.current) {
      window.clearTimeout(syncTimer.current);
    }

    syncTimer.current = window.setTimeout(() => {
      const nextQ = qInput.trim();
      const nextUrl = buildUrl({
        q: nextQ || undefined,
        category: selectedCategoryId,
      });
      router.replace(nextUrl, { scroll: false });
    }, 300);

    return () => {
      if (syncTimer.current) {
        window.clearTimeout(syncTimer.current);
      }
    };
  }, [qInput, pathname, router, query, selectedCategoryId]);

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

  const {
    data: products,
    isLoading: productsLoading,
    isError: productsError,
  } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await api.get<unknown>('/products');

      const payload = res.data as unknown;
      const apiProducts: ApiProduct[] = Array.isArray(payload)
        ? (payload as ApiProduct[])
        : Array.isArray((payload as { data?: unknown })?.data)
          ? ((payload as { data: ApiProduct[] }).data ?? [])
          : [];

      return apiProducts.map((p) => ({
        id: String(p.id),
        categoryId: p.categoryId ?? null,
        name: p.name,
        subtitle: p.subtitle ?? null,
        description: p.description ?? undefined,
        price: (p.priceCents ?? 0) / 100,
        imageUrl: p.imageUrl ?? null,
        stock: p.stock ?? null,
        tags: p.tags ?? [],
      }));
    },
  });

  const {
    data: categoriesTree,
    isLoading: categoriesLoading,
  } = useQuery<PublicCategoryTreeNode[]>({
    queryKey: ['public-categories-tree'],
    queryFn: async () => {
      const res = await api.get<PublicCategoryTreeNode[]>('/public/categories/tree');
      return res.data;
    },
  });

  const flattenedCategories = useMemo(() => {
    const result: Array<{ id: number; name: string; level: number }> = [];
    const walk = (nodes: PublicCategoryTreeNode[], level: number) => {
      for (const node of nodes) {
        result.push({ id: node.id, name: node.name, level });
        if (node.children && node.children.length > 0) {
          walk(node.children, level + 1);
        }
      }
    };
    walk(categoriesTree ?? [], 0);
    return result;
  }, [categoriesTree]);

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

  const categoryDescendants = useMemo(() => {
    const byId = new Map<number, PublicCategoryTreeNode>();
    const index = (nodes: PublicCategoryTreeNode[]) => {
      for (const node of nodes) {
        byId.set(node.id, node);
        if (node.children) index(node.children);
      }
    };
    index(categoriesTree ?? []);

    const collectIds = (id: number): Set<number> => {
      const root = byId.get(id);
      const set = new Set<number>();
      if (!root) return set;
      const stack: PublicCategoryTreeNode[] = [root];
      while (stack.length > 0) {
        const current = stack.pop();
        if (!current) continue;
        set.add(current.id);
        if (current.children) {
          for (const child of current.children) {
            stack.push(child);
          }
        }
      }
      return set;
    };

    return selectedCategoryId ? collectIds(selectedCategoryId) : undefined;
  }, [categoriesTree, selectedCategoryId]);

  const isLoading = productsLoading;
  const hasError = productsError;

  const sortedProducts = useMemo(() => {
    const base = (products ?? []).slice();

    const filteredByCategory = categoryDescendants
      ? base.filter((p) =>
          typeof p.categoryId === 'number' && categoryDescendants.has(p.categoryId),
        )
      : base;

    const filtered = queryTokens.length > 0
      ? filteredByCategory.filter((p) => {
        const tags = Array.isArray(p.tags) ? p.tags.join(' ') : '';
        const haystack = normalizeText(
          `${p.name} ${p.subtitle ?? ''} ${p.description ?? ''} ${tags}`,
        );
        return queryTokens.some((t) => haystack.includes(t));
      })
      : filteredByCategory;

    const priceMinValue = minPrice.trim() ? Number(minPrice) : undefined;
    const priceMaxValue = maxPrice.trim() ? Number(maxPrice) : undefined;

    const filteredByMeta = filtered.filter((p) => {
      if (inStockOnly && (p.stock ?? 0) <= 0) return false;

      if (typeof priceMinValue === 'number' && !Number.isNaN(priceMinValue)) {
        if (p.price < priceMinValue) return false;
      }

      if (typeof priceMaxValue === 'number' && !Number.isNaN(priceMaxValue)) {
        if (p.price > priceMaxValue) return false;
      }

      return true;
    });

    const next = filteredByMeta.slice();

    if (sort === 'price-asc') {
      next.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-desc') {
      next.sort((a, b) => b.price - a.price);
    }

    return next;
  }, [products, sort, queryTokens, inStockOnly, minPrice, maxPrice, categoryDescendants]);

  const productsGroupedByCategory = useMemo(() => {
    const groups = new Map<number, Product[]>();
    const uncategorized: Product[] = [];

    for (const product of sortedProducts) {
      if (typeof product.categoryId === 'number' && Number.isFinite(product.categoryId)) {
        const list = groups.get(product.categoryId) ?? [];
        list.push(product);
        groups.set(product.categoryId, list);
      } else {
        uncategorized.push(product);
      }
    }

    const orderedCategoryIds = flattenedCategories
      .map((c) => c.id)
      .filter((id) => groups.has(id));

    for (const id of groups.keys()) {
      if (!orderedCategoryIds.includes(id)) {
        orderedCategoryIds.push(id);
      }
    }

    return {
      orderedCategoryIds,
      groups,
      uncategorized,
    };
  }, [sortedProducts, flattenedCategories]);

  const handleSortChange = (value: string) => {
    if (value === 'price-asc' || value === 'price-desc' || value === 'popular') {
      setSort(value);
    }
  };

  const handleClearFilters = () => {
    setQInput('');
    setSort('popular');
    setInStockOnly(false);
    setMinPrice('');
    setMaxPrice('');
    setSelectedCategoryId(undefined);
  };

  return (
    <div className="min-h-[calc(100vh-140px)] bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
        <div className="flex flex-col gap-6">
          <section className="space-y-4">
              <Breadcrumbs
                items={[
                  { label: 'Home', href: '/' },
                  { label: 'Shop' },
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
                      <select
                        value={selectedCategoryId ?? ''}
                        onChange={(e) => {
                          const next = e.target.value ? Number(e.target.value) : undefined;
                          setSelectedCategoryId(Number.isFinite(next as number) ? next : undefined);
                        }}
                        className="h-11 w-full appearance-none rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 text-sm font-medium text-[var(--neutral-700)] shadow-[var(--shadow-sm)] outline-none transition focus-visible:border-[var(--primary-800)] focus-visible:ring-1 focus-visible:ring-[var(--primary-800)]"
                        disabled={categoriesLoading}
                      >
                        <option value="">Tümü</option>
                        {flattenedCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {`${'— '.repeat(cat.level)}${cat.name}`}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => setSelectedCategoryId(undefined)}
                        className="inline-flex h-11 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--neutral-700)] shadow-[var(--shadow-sm)] transition hover:bg-white hover:shadow-[var(--shadow-md)]"
                      >
                        Temizle
                      </button>
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

          {hasError && !isLoading && (
            <section className="rounded-[var(--radius-lg)] border border-[var(--error-600)]/20 bg-[var(--error-100)] px-4 py-3 text-sm text-[var(--error-600)]">
              Ürünler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.
            </section>
          )}

          {!isLoading && !hasError && (
            <section>
              {sortedProducts.length > 0 ? (
                <div className="space-y-10">
                  {productsGroupedByCategory.orderedCategoryIds.map((categoryId) => {
                    const list = productsGroupedByCategory.groups.get(categoryId) ?? [];
                    if (list.length === 0) return null;
                    const categoryName = categoriesIndex.get(categoryId)?.name ?? 'Kategori';
                    return (
                      <div key={`category-${categoryId}`} className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <h2 className="text-lg font-semibold text-[var(--primary-800)] md:text-xl">
                            {categoryName}
                          </h2>
                          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                            {list.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
                          {list.map((product) => (
                            <div key={product.id}>
                              <ProductCard product={product} />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {productsGroupedByCategory.uncategorized.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold text-[var(--primary-800)] md:text-xl">
                          Diğer
                        </h2>
                        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                          {productsGroupedByCategory.uncategorized.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
                        {productsGroupedByCategory.uncategorized.map((product) => (
                          <div key={product.id}>
                            <ProductCard product={product} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white p-8 text-center shadow-[var(--shadow-md)]">
                  <p className="text-sm text-[var(--neutral-600)]">Ürün bulunamadı.</p>
                  <Link
                    href="/"
                    className="mt-4 inline-flex text-sm font-semibold text-[var(--primary-800)] underline-offset-2 hover:underline"
                  >
                    Anasayfaya dön
                  </Link>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
