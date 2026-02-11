import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import CategoryClient from './CategoryClient';
import { getSiteUrl } from '@/utils/site';

interface ApiProduct {
  id: number;
  name: string;
  imageUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

interface ApiCategoryDetail {
  id: number;
  name: string;
  slug: string;
  products: ApiProduct[];
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === 'production'
    ? 'https://api.nutopiano.com/api'
    : 'http://localhost:3000/api');
const OG_IMAGE_PATH = '/nutopiano-logo.png';
const SITE_NAME = 'Nutopiano';

const LEGACY_STORE_CATEGORY_IDS = new Set(['service', 'physical', 'weight', 'custom']);

const unwrapResponse = <T,>(payload: unknown): T | null => {
  if (!payload) return null;
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'success' in payload &&
    'data' in payload
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
};

const buildOgImage = (siteUrl: string) =>
  `${siteUrl}${OG_IMAGE_PATH.startsWith('/') ? '' : '/'}${OG_IMAGE_PATH}`;

const getCategory = async (slug: string): Promise<ApiCategoryDetail | null> => {
  const response = await fetch(`${API_BASE_URL}/public/categories/${slug}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const data = unwrapResponse<ApiCategoryDetail>(payload);
  return data;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  if (id === 'all') {
    return {
      title: `Shop | ${SITE_NAME}`,
      robots: { index: false, follow: true },
    };
  }

  if (LEGACY_STORE_CATEGORY_IDS.has(id)) {
    return {
      title: 'Kategori bulunamadı',
      description: 'Aradığınız kategori bulunamadı.',
      robots: { index: false, follow: false },
    };
  }

  const siteUrl = await getSiteUrl();
  const ogImage = buildOgImage(siteUrl);
  const category = await getCategory(id);

  if (!category) {
    return {
      title: 'Kategori bulunamadı',
      description: 'Aradığınız kategori bulunamadı.',
      robots: { index: false, follow: false },
    };
  }

  const hasProducts = (category.products ?? []).length > 0;
  const description = `Nutopiano ${category.name} kategorisindeki tüm ürünleri keşfedin.`;
  const title = `${category.name} | ${SITE_NAME}`;
  const canonical = `${siteUrl}/categories/${category.slug}`;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical,
    },
    robots: hasProducts ? undefined : { index: false, follow: true },
    openGraph: {
      type: 'website',
      url: canonical,
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

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (id === 'all') {
    redirect('/products');
  }

  if (LEGACY_STORE_CATEGORY_IDS.has(id)) {
    notFound();
  }

  const siteUrl = await getSiteUrl();
  const category = await getCategory(id);

  if (!category) {
    notFound();
  }

  const canonical = `${siteUrl}/categories/${category.slug}`;

  const itemList =
    category.products.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: category.name,
          url: canonical,
          itemListElement: category.products.map((product, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: {
              '@type': 'Product',
              name: product.name,
              url: `${siteUrl}/products/${product.id}`,
              image: product.imageUrl ?? undefined,
            },
          })),
        }
      : null;

  return (
    <>
      {itemList && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
        />
      )}
      <CategoryClient />
    </>
  );
}
