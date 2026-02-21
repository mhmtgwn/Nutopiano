'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import api from '@/services/api';
import Spinner from '@/components/common/Spinner';

type SellerDetailPayload = {
  seller: {
    id: number;
    userId: number;
    slug: string;
    displayName: string;
    description?: string | null;
    logoUrl?: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  stats: {
    productCount: number;
  };
};

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
  if (Array.isArray(message)) return message.map(String).join(', ');
  if (typeof message === 'string') return message;
  return fallback;
};

export default function AdminSellerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const id = Number(params.id);

  const {
    data: payload,
    isLoading,
    isError,
  } = useQuery<SellerDetailPayload>({
    queryKey: ['platform-seller-detail', id],
    enabled: Number.isFinite(id),
    queryFn: async () => {
      const res = await api.get<SellerDetailPayload>(`/platform/sellers/${id}`);
      return res.data;
    },
  });

  const seller = payload?.seller;

  const toggleActiveMutation = useMutation({
    mutationFn: async (nextIsActive: boolean) => {
      await api.patch(`/platform/sellers/${id}/active`, { isActive: nextIsActive });
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, 'Durum güncellenemedi.'));
    },
    onSuccess: async () => {
      toast.success('Durum güncellendi.');
      await queryClient.invalidateQueries({ queryKey: ['platform-seller-detail', id] });
      await queryClient.invalidateQueries({ queryKey: ['platform-sellers'] });
      await queryClient.invalidateQueries({ queryKey: ['platform-seller-applications'] });
    },
  });

  return (
    <div className="space-y-6">
      <section className="border-b border-[var(--neutral-200)] pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              Platform
            </p>
            <h1 className="mt-2 text-2xl font-serif text-[var(--primary-800)] md:text-3xl lg:text-4xl">
              Satıcı detayı
            </h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">Satıcı profilini inceleyin.</p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/sellers/applications"
              className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)]"
            >
              Başvurular
            </Link>
            <button
              type="button"
              onClick={() => router.push('/admin/sellers')}
              className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)]"
            >
              Liste
            </button>
          </div>
        </div>
      </section>

      {isLoading && (
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
          <Spinner fullscreen label="Yükleniyor..." />
        </div>
      )}

      {isError && !isLoading && (
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6 text-sm text-[var(--neutral-600)]">
          Satıcı detayı alınamadı.
        </div>
      )}

      {!isLoading && !isError && seller && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
          <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">Profil</p>
            <h2 className="mt-2 text-2xl font-serif text-[var(--primary-800)]">{seller.displayName}</h2>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">{seller.description || 'Açıklama yok.'}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[11px] text-[var(--neutral-500)]">Seller ID</p>
                <p className="mt-1 text-sm font-semibold text-[var(--primary-800)]">{seller.id}</p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--neutral-500)]">User ID</p>
                <p className="mt-1 text-sm font-semibold text-[var(--primary-800)]">{seller.userId}</p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--neutral-500)]">Slug</p>
                <p className="mt-1 font-mono text-xs text-[var(--neutral-600)]">{seller.slug}</p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--neutral-500)]">Durum</p>
                <p className="mt-1 text-sm font-semibold text-[var(--primary-800)]">{seller.isActive ? 'Aktif' : 'Pasif'}</p>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href={`/sellers/${seller.slug}`}
                target="_blank"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white px-5 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)]"
              >
                Public profili aç
              </Link>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">İstatistik</p>
              <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">{payload.stats.productCount}</p>
              <p className="mt-1 text-sm text-[var(--neutral-600)]">Ürün sayısı</p>
            </section>

            <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">Aksiyon</p>
              <p className="mt-2 text-sm text-[var(--neutral-600)]">Satıcı hesabını aktif/pasif yapın.</p>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={toggleActiveMutation.isPending}
                  onClick={() => toggleActiveMutation.mutate(true)}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--primary-800)] bg-[var(--primary-800)] px-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-white transition hover:opacity-95 disabled:opacity-60"
                >
                  Aktifleştir
                </button>
                <button
                  type="button"
                  disabled={toggleActiveMutation.isPending}
                  onClick={() => toggleActiveMutation.mutate(false)}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white px-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)] disabled:opacity-60"
                >
                  Pasife al
                </button>
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
