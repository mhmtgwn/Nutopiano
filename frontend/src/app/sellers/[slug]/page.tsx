import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import api from '@/services/api';
import PaginationControls from '@/components/common/PaginationControls';
import { formatPrice } from '@/utils/helpers';
import { getSiteUrl } from '@/utils/site';

type PaginationMeta = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type SellerSummary = {
  id: number;
  slug: string;
  displayName: string;
  description?: string | null;
  logoUrl?: string | null;
};

type SellerProduct = {
  id: number;
  name: string;
  subtitle?: string | null;
  priceCents: number;
  imageUrl?: string | null;
  stock?: number | null;
};

type SellerProfileResponse = {
  seller: SellerSummary;
  products: {
    data: SellerProduct[];
    meta: PaginationMeta;
  };
};

const SITE_NAME = 'Nutopiano';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const siteUrl = await getSiteUrl();

  const title = `Satıcı | ${SITE_NAME}`;

  return {
    metadataBase: new URL(siteUrl),
    title,
    alternates: {
      canonical: `${siteUrl}/sellers/${slug}`,
    },
  };
}

export default async function SellerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};

  const pageRaw = typeof resolvedSearchParams.page === 'string' ? resolvedSearchParams.page : undefined;
  const page = pageRaw && /^[0-9]+$/.test(pageRaw) ? Number(pageRaw) : 1;
  const pageSizeRaw = typeof resolvedSearchParams.pageSize === 'string' ? resolvedSearchParams.pageSize : undefined;
  const pageSize = pageSizeRaw && /^[0-9]+$/.test(pageSizeRaw) ? Number(pageSizeRaw) : 20;

  let payload: SellerProfileResponse | null = null;
  let errorMessage: string | null = null;

  try {
    const res = await api.get<SellerProfileResponse>(`/public/sellers/${encodeURIComponent(slug)}`, {
      params: { page, pageSize },
    });
    payload = res.data;
  } catch {
    errorMessage = 'Satıcı bilgileri yüklenemedi.';
  }

  if (!payload) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:px-6 md:py-10">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-[var(--primary-800)] md:text-3xl">Satıcı</h1>
          <Link href="/products" className="text-sm font-semibold text-[var(--primary-800)] underline-offset-2 hover:underline">
            Ürünlere dön
          </Link>
        </div>
        <section className="space-y-3 rounded-[var(--radius-2xl)] border border-[var(--error-600)]/20 bg-[var(--error-100)] px-4 py-6 md:px-6">
          <p className="text-sm text-[var(--error-600)] md:text-base">{errorMessage ?? 'Bir hata oluştu.'}</p>
        </section>
      </div>
    );
  }

  const { seller, products } = payload;
  const list = products?.data ?? [];
  const meta = products?.meta;

  const siteUrl = await getSiteUrl();
  const fallbackLogo = '/nutopiano-logo.png';
  const logoSrc = seller.logoUrl ? (seller.logoUrl.startsWith('http') ? seller.logoUrl : `${siteUrl}${seller.logoUrl}`) : fallbackLogo;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10">
      <header className="flex flex-col gap-4 rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white px-4 py-6 shadow-[var(--shadow-md)] md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 overflow-hidden rounded-full border border-[var(--neutral-200)] bg-white">
            <Image src={logoSrc} alt={seller.displayName} fill className="object-cover" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--primary-800)] md:text-3xl">{seller.displayName}</h1>
            {seller.description && (
              <p className="mt-1 text-sm text-[var(--neutral-600)]">{seller.description}</p>
            )}
          </div>
        </div>
        <Link href="/products" className="text-sm font-semibold text-[var(--primary-800)] underline-offset-2 hover:underline">
          Tüm ürünler
        </Link>
      </header>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--primary-800)]">Ürünler</h2>
          {meta && (
            <p className="text-xs text-[var(--neutral-500)]">
              Toplam {meta.total} ürün
            </p>
          )}
        </div>

        {list.length === 0 ? (
          <div className="rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white px-4 py-6 shadow-[var(--shadow-md)] md:px-6">
            <p className="text-sm text-[var(--neutral-600)]">Bu satıcı için ürün bulunamadı.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
            {list.map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                className="group overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white shadow-[var(--shadow-md)] transition hover:border-[var(--neutral-300)]"
              >
                <div className="relative aspect-square overflow-hidden bg-[var(--neutral-50)]">
                  <Image
                    src={p.imageUrl ?? '/nutopiano-logo.png'}
                    alt={p.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    unoptimized={Boolean(p.imageUrl && /^https?:\/\//i.test(p.imageUrl))}
                  />
                </div>
                <div className="space-y-1 p-4">
                  <p className="text-sm font-semibold text-[var(--primary-800)] line-clamp-2">{p.name}</p>
                  {p.subtitle && <p className="text-xs text-[var(--neutral-500)] line-clamp-1">{p.subtitle}</p>}
                  <p className="pt-1 text-sm font-semibold text-[var(--primary-800)]">{formatPrice((p.priceCents ?? 0) / 100)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {meta && meta.totalPages > 1 && (
          <PaginationControls
            page={meta.page}
            totalPages={meta.totalPages}
            buildHref={(nextPage: number) => {
              const sp = new URLSearchParams();
              sp.set('page', String(nextPage));
              sp.set('pageSize', String(meta.pageSize));
              return `/sellers/${seller.slug}?${sp.toString()}`;
            }}
          />
        )}
      </section>
    </div>
  );
}
