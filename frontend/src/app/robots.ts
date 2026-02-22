import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/utils/site';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = await getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/account',
          '/admin',
          '/dashboard',
          '/platform',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/checkout',
          '/cart',
          '/search',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
