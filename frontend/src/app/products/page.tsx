import type { Metadata } from 'next';
import ProductsClient from './ProductsClient';
import { getSiteUrl } from '@/utils/site';

const SITE_NAME = 'Nutopiano';
const OG_IMAGE_PATH = '/nutopiano-logo.png';

const buildOgImage = (siteUrl: string) =>
  `${siteUrl}${OG_IMAGE_PATH.startsWith('/') ? '' : '/'}${OG_IMAGE_PATH}`;

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = await getSiteUrl();
  const ogImage = buildOgImage(siteUrl);
  const title = `Shop | ${SITE_NAME}`;
  const description =
    'Nutopiano mağazası. Stokta olan ürünleri keşfedin ve güvenli ödeme ile alışverişinizi tamamlayın.';

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/products`,
    },
    openGraph: {
      type: 'website',
      url: `${siteUrl}/products`,
      title,
      description,
      images: [{ url: ogImage }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const qRaw = typeof resolvedSearchParams?.q === 'string' ? resolvedSearchParams.q : undefined;
  const q = qRaw;
  const categoryRaw =
    typeof resolvedSearchParams?.category === 'string' ? resolvedSearchParams.category : undefined;
  const categoryId = categoryRaw && /^[0-9]+$/.test(categoryRaw) ? Number(categoryRaw) : undefined;
  return <ProductsClient query={q} categoryId={categoryId} />;
}
