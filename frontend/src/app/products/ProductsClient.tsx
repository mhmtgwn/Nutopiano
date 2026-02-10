'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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

export default function ProductsClient() {
  const searchParams = useSearchParams();
  const [sort, setSort] = useState<'popular' | 'price-asc' | 'price-desc'>('popular');

  const query = (searchParams?.get('q') ?? '').trim().toLowerCase();

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

    const filtered = query
      ? base.filter((p) => {
          const haystack = `${p.name} ${p.description ?? ''}`.toLowerCase();
          return haystack.includes(query);
        })
      : base;

    const next = filtered.slice();

    if (sort === 'price-asc') {
      next.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-desc') {
      next.sort((a, b) => b.price - a.price);
    }

    return next;
  }, [products, sort, query]);

  const handleSortChange = (value: string) => {
    if (value === 'price-asc' || value === 'price-desc' || value === 'popular') {
      setSort(value);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
        <section className="space-y-4">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Shop' },
            ]}
          />
          <h1 className="text-3xl font-serif text-[#222222]">Shop</h1>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e5e5] pb-4">
            <div className="relative ml-auto">
              <select
                value={sort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="h-10 min-w-[220px] appearance-none rounded-sm border border-[#e5e5e5] bg-white px-3 pr-9 text-sm text-[#777777] shadow-sm outline-none"
              >
                <option value="popular">Default sorting</option>
                <option value="price-asc">Sort by price: low to high</option>
                <option value="price-desc">Sort by price: high to low</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777777]" />
            </div>
          </div>
        </section>

        {isLoading && (
          <section>
            <Spinner fullscreen />
          </section>
        )}

        {hasError && !isLoading && (
          <section className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Ürünler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.
          </section>
        )}

        {!isLoading && !hasError && (
          <section>
            {sortedProducts.length > 0 ? (
              <div
                className="grid grid-cols-2 gap-0 border-l border-t border-[#e5e5e5] md:grid-cols-3 lg:grid-cols-4"
              >
                {sortedProducts.map((product) => (
                  <div key={product.id} className="border-b border-r border-[#e5e5e5] p-4">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-[#e5e5e5] bg-white p-8 text-center">
                <p className="text-sm text-[#777777]">Ürün bulunamadı.</p>
                <Link href="/" className="mt-4 inline-flex text-sm font-semibold text-[#222222]">
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
