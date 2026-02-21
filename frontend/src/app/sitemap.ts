import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/utils/site';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.API_URL ??
  (process.env.NODE_ENV === 'production'
    ? 'https://api.nutopiano.com/api/v1'
    : 'http://localhost:3001/api/v1');

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

interface PaginatedPayload<T> {
  data: T[];
  meta?: unknown;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = await getSiteUrl();
  const now = new Date();

  const [categories, products] = await Promise.all([
    fetch(`${API_BASE_URL}/public/categories`, { cache: 'no-store' })
      .then(async (res) => (res.ok ? unwrapResponse<ApiCategory[]>(await res.json()) : null))
      .catch(() => null),
    fetch(`${API_BASE_URL}/products`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) return null;
        const payload = unwrapResponse<unknown>(await res.json());
        if (Array.isArray(payload)) return payload as ApiProduct[];
        const paginated = payload as PaginatedPayload<ApiProduct>;
        if (Array.isArray(paginated?.data)) return paginated.data;
        return null;
      })
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

