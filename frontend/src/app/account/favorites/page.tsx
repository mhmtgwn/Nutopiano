'use client';

import toast from 'react-hot-toast';
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import ProductCard from '@/components/ProductCard';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';

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

type FavoriteRow = {
  product: {
    id: number;
    name: string;
    subtitle?: string | null;
    priceCents: number;
    imageUrl?: string | null;
    stock?: number | null;
    tags?: string[];
    isActive: boolean;
  };
  createdAt: string;
};

export default function AccountFavoritesPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery<FavoriteRow[]>({
    queryKey: ['account-favorites'],
    queryFn: async () => {
      const res = await api.get<FavoriteRow[]>('/customer/favorites');
      return res.data;
    },
  });

  const products = useMemo(() => {
    return (data ?? [])
      .map((row) => row.product)
      .filter((p) => p && p.isActive)
      .map((p) => ({
        id: String(p.id),
        name: p.name,
        subtitle: p.subtitle ?? null,
        price: (p.priceCents ?? 0) / 100,
        imageUrl: p.imageUrl ?? null,
        stock: p.stock ?? null,
        tags: p.tags ?? [],
      }));
  }, [data]);

  const removeMutation = useMutation({
    mutationFn: async (productId: number) => {
      await api.delete(`/customer/favorites/${productId}`);
      return { productId };
    },
    onSuccess: async () => {
      toast.success('Favorilerden kaldırıldı.');
      await queryClient.invalidateQueries({ queryKey: ['account-favorites'] });
    },
    onError: (err: unknown) => {
      toast.error(resolveApiErrorMessage(err, 'Favorilerden kaldırılamadı.'));
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col px-4 py-6 md:px-6 md:py-10">
        <Spinner fullscreen />
      </div>
    );
  }

  if (isError) {
    const message = resolveApiErrorMessage(error, 'Favoriler yüklenemedi.');

    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:px-6 md:py-10">
        <h1 className="text-2xl font-semibold text-[var(--primary-800)] md:text-3xl">Favorilerim</h1>
        <section className="space-y-3 rounded-[var(--radius-2xl)] border border-[var(--error-600)]/20 bg-[var(--error-100)] px-4 py-6 md:px-6">
          <p className="text-sm text-[var(--error-600)] md:text-base">{message}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--primary-800)] md:text-3xl">Favorilerim</h1>
          <p className="mt-1 text-xs text-[var(--neutral-600)] md:text-sm">
            Beğendiğiniz ürünler burada.
          </p>
        </div>
      </header>

      {products.length === 0 ? (
        <section className="space-y-3 rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white px-4 py-6 shadow-[var(--shadow-md)] md:px-6">
          <p className="text-sm text-[var(--neutral-600)] md:text-base">Favorilere eklenmiş ürün yok.</p>
          <Button type="button" variant="secondary" onClick={() => (window.location.href = '/products')}>
            Ürünlere git
          </Button>
        </section>
      ) : (
        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
          {products.map((product) => (
            <div key={product.id} className="space-y-2">
              <ProductCard product={product} />
              <button
                type="button"
                onClick={() => {
                  const ok = window.confirm('Ürün favorilerden kaldırılsın mı?');
                  if (!ok) return;
                  removeMutation.mutate(Number(product.id));
                }}
                disabled={removeMutation.isPending}
                className="w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Favorilerden kaldır
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
