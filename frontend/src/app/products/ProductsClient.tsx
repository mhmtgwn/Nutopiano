'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronDown,
} from 'lucide-react';

import api from '@/services/api';
import ProductCard from '@/components/ProductCard';
import Spinner from '@/components/common/Spinner';
import Breadcrumbs from '@/components/common/Breadcrumbs';

interface ApiProduct {
  id: number;
  categoryId?: number | null;
  name: string;
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
  description?: string;
  price: number;
  imageUrl?: string | null;
  stock?: number | null;
  tags?: string[];
}

export default function ProductsClient({
  query,
}: {
  query?: string;
}) {
  const [sort, setSort] = useState<'popular' | 'price-asc' | 'price-desc'>('popular');

  const normalizedQuery = (query ?? '').trim().toLowerCase();

  const {
    data: products,
    isLoading: productsLoading,
    isError: productsError,
  } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await api.get<ApiProduct[]>('/products');
      return res.data.map((p) => ({
        id: String(p.id),
        categoryId: p.categoryId ?? null,
        name: p.name,
        description: p.description ?? undefined,
        price: (p.priceCents ?? 0) / 100,
        imageUrl: p.imageUrl ?? null,
        stock: p.stock ?? null,
        tags: p.tags ?? [],
      }));
    },
  });

  const isLoading = productsLoading;
  const hasError = productsError;

  const sortedProducts = useMemo(() => {
    const base = (products ?? []).slice();

    const filtered = normalizedQuery
      ? base.filter((p) => {
        const haystack = `${p.name} ${p.description ?? ''}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      : base;

    const next = filtered.slice();

    if (sort === 'price-asc') {
      next.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-desc') {
      next.sort((a, b) => b.price - a.price);
    }

    return next;
  }, [products, sort, normalizedQuery]);

  const handleSortChange = (value: string) => {
    if (value === 'price-asc' || value === 'price-desc' || value === 'popular') {
      setSort(value);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[var(--neutral-50)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
        <section className="space-y-4">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Shop' },
            ]}
          />
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                Shop
              </p>
              <h1 className="mt-1 text-3xl font-serif text-[var(--primary-800)] md:text-4xl">
                Ürünler
              </h1>
            </div>
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
          <div className="border-b border-[var(--neutral-200)]" />
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
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
                {sortedProducts.map((product) => (
                  <div key={product.id}>
                    <ProductCard product={product} />
                  </div>
                ))}
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
  );
}
