'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';

interface Product {
  id: string;
  name: string;
  subtitle?: string | null;
  description?: string;
  price: number;
  imageUrl?: string | null;
  type?: string;
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
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (slug === 'all') {
      setIsRedirecting(true);
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

  const sortedProducts = useMemo(() => {
    const next = [...products];

    if (sort === 'price-asc') {
      next.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-desc') {
      next.sort((a, b) => b.price - a.price);
    }

    return next;
  }, [products, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const pagedProducts = sortedProducts.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const hasProducts = pagedProducts.length > 0;

  if (isRedirecting) {
    return null;
  }

  if (isLegacy) {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-[#F7F4EF]">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:px-6">
          <section className="rounded-[32px] border border-[#1A3C34]/10 bg-white/90 p-6 shadow-[0_30px_90px_rgba(26,60,52,0.08)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
              Shop
            </p>
            <h1 className="mt-2 text-3xl font-serif text-[#1A3C34] md:text-4xl">
              Kategori bulunamadı
            </h1>
            <p className="mt-3 text-sm text-[#5C5C5C] md:text-base">
              Bu kategori artık mevcut değil.
            </p>
            <Link
              href="/products"
              className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#1A3C34]/80 hover:text-[#1A3C34]"
            >
              Ürünlere git <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </div>
      </div>
    );
  }

  if (!category && !isLoading && !isError) {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-[#F7F4EF]">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:px-6">
          <section className="rounded-[32px] border border-[#1A3C34]/10 bg-white/90 p-6 shadow-[0_30px_90px_rgba(26,60,52,0.08)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
              Shop
            </p>
            <h1 className="mt-2 text-3xl font-serif text-[#1A3C34] md:text-4xl">
              Kategori bulunamadı
            </h1>
            <p className="mt-3 text-sm text-[#5C5C5C] md:text-base">
              Aradığınız koleksiyon bulunamadı. Tüm ürünlere göz atabilirsiniz.
            </p>
            <Link
              href="/products"
              className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#1A3C34]/80 hover:text-[#1A3C34]"
            >
              Tüm ürünlere git <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#F7F4EF]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:px-6">
        <section className="rounded-[36px] border border-[#1A3C34]/10 bg-gradient-to-br from-[#FFF9E6] via-white to-[#F3FAF5] px-6 py-8 shadow-[0_40px_120px_rgba(26,60,52,0.12)] md:px-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                Shop · Koleksiyon
              </p>
              <h1 className="text-3xl font-serif text-[#1A3C34] md:text-4xl">
                {category?.name ?? 'Koleksiyon'}
              </h1>
              <p className="text-sm text-[#5C5C5C] md:text-base">
                {'Seçili koleksiyondaki ürünleri görüntüleyin. Sıralama ve filtre ile hızlıca bulun.'}
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
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#1A3C34]/70">
            <span className="rounded-full bg-white px-4 py-2">{sortedProducts.length} ürün</span>
            <span className="rounded-full border border-[#1A3C34]/20 px-4 py-2">Hızlı teslimat</span>
            <span className="rounded-full border border-[#1A3C34]/20 px-4 py-2">Güvenli ödeme</span>
          </div>
        </section>

        <section className="rounded-[32px] border border-[#1A3C34]/10 bg-white/80 p-6 shadow-[0_20px_70px_rgba(26,60,52,0.08)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : isError ? (
            <div className="p-2 text-center">
              <p className="text-sm text-[#5C5C5C]">Ürünler yüklenirken bir hata oluştu.</p>
            </div>
          ) : hasProducts ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {pagedProducts.map((product) => (
                <ProductCard key={product.id} product={product} categoryId={slug} />
              ))}
            </div>
          ) : (
            <div className="p-2 text-center">
              <p className="text-sm text-[#5C5C5C]">Bu kategoride henüz ürün bulunmuyor.</p>
              <Link
                href="/products"
                className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#1A3C34]/80 hover:text-[#1A3C34]"
              >
                Tüm ürünleri keşfet <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </section>

        {!isLoading && !isError && totalPages > 1 && (
          <section className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#E0D7C6] pt-4 text-xs text-[#5C5C5C]">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#1A3C34]/60">
              Sayfa {safePage} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={safePage === 1}
                className="inline-flex items-center gap-2 rounded-full border border-[#1A3C34]/20 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1A3C34] shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" /> Önceki
              </button>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={safePage >= totalPages}
                className="inline-flex items-center gap-2 rounded-full bg-[#1A3C34] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow-sm hover:bg-[#3E2723] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sonraki <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
