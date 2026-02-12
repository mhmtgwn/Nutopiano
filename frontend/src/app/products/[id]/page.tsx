import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductDetailClient from './ProductDetailClient';
import { getSiteUrl } from '@/utils/site';

interface ProductResponse {
  id: number;
  name: string;
  subtitle?: string | null;
  description?: string | null;
  features?: string[];
  priceCents: number;
  imageUrl?: string | null;
  images?: string[];
  stock?: number | null;
  tags?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
}

interface ProductDetail {
  id: string;
  name: string;
  subtitle?: string | null;
  description?: string | null;
  features?: string[];
  price: number;
  imageUrl?: string | null;
  images?: string[];
  stock?: number | null;
  tags?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === 'production'
    ? 'https://api.nutopiano.com/api'
    : 'http://localhost:3000/api');

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

const normalizeProduct = (product: ProductResponse): ProductDetail => ({
  id: String(product.id),
  name: product.name,
  subtitle: product.subtitle ?? null,
  description: product.description ?? null,
  features: product.features ?? [],
  price: (product.priceCents ?? 0) / 100,
  imageUrl: product.imageUrl ?? null,
  images: product.images ?? [],
  stock: product.stock ?? null,
  tags: product.tags ?? [],
  seoTitle: product.seoTitle ?? null,
  seoDescription: product.seoDescription ?? null,
});

const getProduct = async (id: string): Promise<ProductDetail | null> => {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const data = unwrapResponse<ProductResponse>(payload);

  if (!data) {
    return null;
  }

  return normalizeProduct(data);
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return {
      title: 'Ürün bulunamadı',
      description: 'Aradığınız ürün bulunamadı.',
      robots: { index: false, follow: false },
    };
  }

  const fallbackDescription = 'Nutopiano mağazasının özenle seçilmiş ürünü.';
  const title = product.seoTitle ?? product.name;
  const description =
    product.seoDescription ?? product.description ?? fallbackDescription;
  const siteUrl = await getSiteUrl();
  const canonical = `${siteUrl}/products/${product.id}`;
  const imagePath = product.imageUrl || '/nutopiano-logo.png';
  const ogImage = imagePath.startsWith('http')
    ? imagePath
    : `${siteUrl}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      url: canonical,
      title: product.name,
      description: product.description ?? description,
      images: ogImage ? [ogImage] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description ?? description,
      images: ogImage ? [ogImage] : [],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  return <ProductDetailClient product={product} />;
}
