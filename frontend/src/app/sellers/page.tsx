import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import api from '@/services/api';
import PaginationControls from '@/components/common/PaginationControls';

type PaginationMeta = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type PublicSellerDirectoryItem = {
  id: number;
  slug: string;
  displayName: string;
  description?: string | null;
  logoUrl?: string | null;
  productCount: number;
  categories: Array<{
    id: number;
    name: string;
    productCount: number;
  }>;
};

type PublicSellerDirectoryResponse = {
  data: PublicSellerDirectoryItem[];
  meta: PaginationMeta;
};

export const metadata: Metadata = {
  title: 'Saticilar | Nutopiano',
  description: 'Nutopiano marketplace satici magazalari ve kategori girisleri.',
};

export default async function SellersDirectoryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const pageRaw = typeof resolvedSearchParams.page === 'string' ? resolvedSearchParams.page : undefined;
  const page = pageRaw && /^[0-9]+$/.test(pageRaw) ? Number(pageRaw) : 1;
  const pageSizeRaw = typeof resolvedSearchParams.pageSize === 'string' ? resolvedSearchParams.pageSize : undefined;
  const pageSize = pageSizeRaw && /^[0-9]+$/.test(pageSizeRaw) ? Number(pageSizeRaw) : 24;

  let payload: PublicSellerDirectoryResponse | null = null;
  let loadError = false;

  try {
    const res = await api.get<PublicSellerDirectoryResponse>('/public/sellers', {
      params: { page, pageSize },
    });
    payload = res.data;
  } catch {
    loadError = true;
  }

  const rows = (payload?.data ?? []).filter((row) => Number(row.productCount ?? 0) > 0);
  const meta = payload?.meta;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--neutral-500)]">
          Marketplace
        </p>
        <h1 className="text-3xl font-semibold text-[var(--primary-800)]">Satici Magazalari</h1>
        <p className="max-w-3xl text-sm text-[var(--neutral-600)]">
          Once saticiyi secin, sonra kategoriye girerek alisverise devam edin.
        </p>
      </header>

      {loadError ? (
        <section className="rounded-[var(--radius-2xl)] border border-[var(--error-600)]/20 bg-[var(--error-100)] px-4 py-6 md:px-6">
          <p className="text-sm text-[var(--error-600)]">
            Satici listesi su anda yuklenemedi.
          </p>
        </section>
      ) : rows.length === 0 ? (
        <section className="rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white px-4 py-6 shadow-[var(--shadow-md)] md:px-6">
          <p className="text-sm text-[var(--neutral-600)]">
            Yayinlanmis urunu olan aktif satici bulunamadi.
          </p>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((seller) => (
            <article
              key={seller.id}
              className="rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white p-4 shadow-[var(--shadow-md)]"
            >
              <div className="flex items-start gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-[var(--neutral-200)] bg-white">
                  <Image
                    src={seller.logoUrl ?? '/nutopiano-logo.png'}
                    alt={seller.displayName}
                    fill
                    className="object-cover"
                    unoptimized={Boolean(seller.logoUrl && /^https?:\/\//i.test(seller.logoUrl))}
                  />
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/magaza/${seller.slug}`}
                    className="text-base font-semibold text-[var(--primary-800)] underline-offset-2 hover:underline"
                  >
                    {seller.displayName}
                  </Link>
                  <p className="mt-1 text-xs text-[var(--neutral-500)]">
                    {seller.productCount} urun
                  </p>
                  {seller.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--neutral-600)]">
                      {seller.description}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {seller.categories.length > 0 ? (
                  seller.categories.slice(0, 8).map((category) => (
                    <Link
                      key={`${seller.id}-${category.id}`}
                      href={`/magaza/${seller.slug}?category=${category.id}`}
                      className="rounded-full border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--primary-800)]/85 hover:bg-[var(--neutral-100)]"
                    >
                      {category.name} ({category.productCount})
                    </Link>
                  ))
                ) : (
                  <span className="text-xs text-[var(--neutral-500)]">Kategori bulunamadi.</span>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      {meta && meta.totalPages > 1 ? (
        <PaginationControls
          page={meta.page}
          totalPages={meta.totalPages}
          buildHref={(nextPage: number) => {
            const sp = new URLSearchParams();
            sp.set('page', String(nextPage));
            sp.set('pageSize', String(meta.pageSize));
            return `/sellers?${sp.toString()}`;
          }}
        />
      ) : null}
    </div>
  );
}
