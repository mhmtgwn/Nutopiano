'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronDown,
  Grid2X2,
  Grid3X3,
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

interface ApiCategory {
  id: number;
  name: string;
  slug: string;
  orderIndex: number;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

export default function ProductsClient() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [sort, setSort] = useState<'popular' | 'price-asc' | 'price-desc'>('popular');
  const [gridColumns, setGridColumns] = useState<3 | 4>(4);

  const {
    data: categories,
    isLoading: categoriesLoading,
    isError: categoriesError,
  } = useQuery<Category[]>({
    queryKey: ['public-categories'],
    queryFn: async () => {
      const res = await api.get<ApiCategory[]>('/public/categories');
      return res.data
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((c) => ({ id: c.id, name: c.name, slug: c.slug }));
    },
  });

  const {
    data: products,
    isLoading: productsLoading,
    isError: productsError,
  } = useQuery<Product[]>({
    queryKey: ['products', { selectedCategoryId }],
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

  const isLoading = categoriesLoading || productsLoading;
  const hasError = categoriesError || productsError;

  const filteredProducts = useMemo(() => {
    const list = products ?? [];
    if (!selectedCategoryId) return list;
    return list.filter((p) => p.categoryId === selectedCategoryId);
  }, [products, selectedCategoryId]);

  const sortedProducts = useMemo(() => {
    const next = filteredProducts.slice();

    if (sort === 'price-asc') {
      next.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-desc') {
      next.sort((a, b) => b.price - a.price);
    }

    return next;
  }, [filteredProducts, sort]);

  const handleCategorySelect = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
  };

  const handleSortChange = (value: string) => {
    if (value === 'price-asc' || value === 'price-desc' || value === 'popular') {
      setSort(value);
    }
  };

  const totalResults = sortedProducts.length;
  const showingFrom = totalResults > 0 ? 1 : 0;
  const showingTo = totalResults;

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
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E5E5E0] pb-4">
            <div className="space-y-1">
              <h1 className="text-4xl font-serif text-[#1A3C34]">Shop</h1>
              <p className="text-sm text-[#5C5C5C]">Ürünleri keşfedin.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="h-10 appearance-none rounded-md border border-[#E5E5E0] bg-white px-3 pr-9 text-sm text-[#1A3C34] shadow-sm outline-none focus-visible:border-[#1A3C34]"
                >
                  <option value="popular">Sort by popularity</option>
                  <option value="price-asc">Sort by price: low to high</option>
                  <option value="price-desc">Sort by price: high to low</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A3C34]/60" />
              </div>

              <button
                type="button"
                onClick={() => setGridColumns(3)}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-md border shadow-sm transition ${
                  gridColumns === 3
                    ? 'border-[#1A3C34] bg-[#1A3C34] text-white'
                    : 'border-[#E5E5E0] bg-white text-[#1A3C34] hover:bg-[#1A3C34]/5'
                }`}
                aria-label="3 kolon"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setGridColumns(4)}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-md border shadow-sm transition ${
                  gridColumns === 4
                    ? 'border-[#1A3C34] bg-[#1A3C34] text-white'
                    : 'border-[#E5E5E0] bg-white text-[#1A3C34] hover:bg-[#1A3C34]/5'
                }`}
                aria-label="4 kolon"
              >
                <Grid2X2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#5C5C5C]">
            <p>
              Showing {showingFrom}–{showingTo} of {totalResults} results
            </p>
            <button
              type="button"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#1A3C34]"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>
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
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleCategorySelect(null)}
                className={`rounded-md border px-3 py-2 text-sm transition ${
                  selectedCategoryId === null
                    ? 'border-[#1A3C34] bg-[#1A3C34] text-white'
                    : 'border-[#E5E5E0] bg-white text-[#1A3C34] hover:bg-[#1A3C34]/5'
                }`}
              >
                All
              </button>
              {(categories ?? []).map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategorySelect(category.id)}
                  className={`rounded-md border px-3 py-2 text-sm transition ${
                    selectedCategoryId === category.id
                      ? 'border-[#1A3C34] bg-[#1A3C34] text-white'
                      : 'border-[#E5E5E0] bg-white text-[#1A3C34] hover:bg-[#1A3C34]/5'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {sortedProducts.length > 0 ? (
              <div
                className={`grid gap-6 ${
                  gridColumns === 3
                    ? 'grid-cols-2 md:grid-cols-3'
                    : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                }`}
              >
                {sortedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    showHoverActions
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-[#E5E5E0] bg-white p-8 text-center">
                <p className="text-sm text-[#5C5C5C]">Ürün bulunamadı.</p>
                <Link href="/" className="mt-4 inline-flex text-sm font-semibold text-[#1A3C34]">
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
