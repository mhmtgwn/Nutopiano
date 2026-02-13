'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import api from '@/services/api';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import ProductCard from '@/components/ProductCard';
import Spinner from '@/components/common/Spinner';

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

const normalizeText = (value: string) =>
  value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, ' ')
    .trim();

function SearchPageInner() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const normalizedQuery = normalizeText(q);
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
    isLoading,
    isError,
  } = useQuery<Product[]>({
    queryKey: ['products', 'search', normalizedQuery],
    queryFn: async () => {
      const res = await api.get<ApiProduct[]>('/products');
      return res.data.map((p) => ({
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

  const results = useMemo(() => {
    const base = products ?? [];
    if (queryTokens.length === 0) return [];

    return base.filter((p) => {
      const haystack = normalizeText(p.name);
      return queryTokens.every((t) => haystack.includes(t));
    });
  }, [products, queryTokens]);

  return (
    <div className="min-h-[calc(100vh-140px)] bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
        <section className="space-y-3">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Arama' },
            ]}
          />

          <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white p-5 shadow-[var(--shadow-sm)]">
            <h1 className="text-lg font-semibold text-[var(--primary-800)]">
              Arama Sonuçları
            </h1>
            <p className="mt-1 text-sm text-[var(--neutral-600)]">
              {q ? (
                <>
                  <span className="font-semibold text-[var(--primary-800)]">{q}</span> için sonuçlar
                </>
              ) : (
                'Aramak için üst menüden bir kelime yaz.'
              )}
            </p>
          </div>
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
            {q && results.length === 0 ? (
              <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white p-8 text-center shadow-[var(--shadow-md)]">
                <p className="text-sm text-[var(--neutral-600)]">Sonuç bulunamadı.</p>
                <Link
                  href="/products"
                  className="mt-4 inline-flex text-sm font-semibold text-[var(--primary-800)] underline-offset-2 hover:underline"
                >
                  Mağazaya dön
                </Link>
              </div>
            ) : null}

            {results.length > 0 && (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
                {results.map((product) => (
                  <div key={product.id}>
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageInner />
    </Suspense>
  );
}
