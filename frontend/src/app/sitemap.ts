import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/utils/site';

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

interface ApiCategory {
  id: number;
  name: string;
  slug: string;
  orderIndex: number;
}

interface ApiProduct {
  id: number;
  name: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = await getSiteUrl();
  const now = new Date();

  const [categories, products] = await Promise.all([
    fetch(`${API_BASE_URL}/public/categories`, { cache: 'no-store' })
      .then(async (res) => (res.ok ? unwrapResponse<ApiCategory[]>(await res.json()) : null))
      .catch(() => null),
    fetch(`${API_BASE_URL}/products`, { cache: 'no-store' })
      .then(async (res) => (res.ok ? unwrapResponse<ApiProduct[]>(await res.json()) : null))
      .catch(() => null),
  ]);

  const base: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${siteUrl}/products`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  const categoryEntries: MetadataRoute.Sitemap = (categories ?? []).map((c) => ({
    url: `${siteUrl}/categories/${c.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const productEntries: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
    url: `${siteUrl}/products/${p.id}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...base, ...categoryEntries, ...productEntries];
}
