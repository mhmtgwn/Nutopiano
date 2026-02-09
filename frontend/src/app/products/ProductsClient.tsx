'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronDown, ShoppingCart, SlidersHorizontal } from 'lucide-react';

import api from '@/services/api';
import ProductCard from '@/components/ProductCard';
import Spinner from '@/components/common/Spinner';
import { useAppSelector } from '@/store';

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
  const router = useRouter();
  const totalQuantity = useAppSelector((state) => state.cart.totalQuantity);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [sort, setSort] = useState<'popular' | 'price-asc' | 'price-desc'>('popular');

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

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#F7F4EF]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
        <section className="rounded-[36px] border border-[#1A3C34]/10 bg-gradient-to-br from-[#FFF9E6] via-white to-[#F3FAF5] px-5 py-7 shadow-[0_40px_120px_rgba(26,60,52,0.12)] md:px-10 md:py-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                Nutopiano Shop
              </p>
              <h1 className="text-3xl font-serif text-[#1A3C34] md:text-4xl">
                Mağaza
              </h1>
              <p className="text-sm text-[#5C5C5C] md:text-base">
                Ürünleri keşfedin, filtreleyin ve sepete ekleyin.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#1A3C34]/70">
                <SlidersHorizontal className="h-4 w-4" />
                Sırala
              </div>
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="h-10 appearance-none rounded-full border border-[#1A3C34]/20 bg-white/90 px-4 pr-10 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1A3C34] shadow-sm outline-none focus-visible:border-[#1A3C34] focus-visible:ring-2 focus-visible:ring-[#C5A059]/30"
                >
                  <option value="popular">Popüler</option>
                  <option value="price-asc">Fiyat (Artan)</option>
                  <option value="price-desc">Fiyat (Azalan)</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A3C34]/70" />
              </div>

              {totalQuantity > 0 && (
                <button
                  type="button"
                  onClick={() => router.push('/cart')}
                  className="inline-flex items-center gap-2 rounded-full bg-[#1A3C34] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow-sm hover:bg-[#3E2723]"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Sepet ({totalQuantity})
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#1A3C34]/70 sm:gap-3">
            <button
              type="button"
              onClick={() => handleCategorySelect(null)}
              className={`rounded-full px-4 py-2 transition ${
                selectedCategoryId === null
                  ? 'bg-[#1A3C34] text-white'
                  : 'border border-[#1A3C34]/20 bg-white/80 text-[#1A3C34] hover:bg-white'
              }`}
            >
              Tüm ürünler
            </button>
            {(categories ?? []).map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => handleCategorySelect(category.id)}
                className={`rounded-full px-4 py-2 transition ${
                  selectedCategoryId === category.id
                    ? 'bg-[#1A3C34] text-white'
                    : 'border border-[#1A3C34]/20 bg-white/80 text-[#1A3C34] hover:bg-white'
                }`}
              >
                {category.name}
              </button>
            ))}
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
          <section className="rounded-[32px] border border-[#1A3C34]/10 bg-white/80 p-5 shadow-[0_20px_70px_rgba(26,60,52,0.08)] md:p-6">
            {sortedProducts.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {sortedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-[#5C5C5C]">Ürün bulunamadı.</p>
                <Link
                  href="/"
                  className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#1A3C34]/70 hover:text-[#1A3C34]"
                >
                  Anasayfaya dön <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
