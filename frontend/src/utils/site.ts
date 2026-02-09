import { headers } from 'next/headers';

export const getSiteUrl = async () => {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (envUrl && typeof envUrl === 'string') {
    return envUrl.replace(/\/+$/, '');
  }

  const headerList = await headers();
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host');
  const protocol = headerList.get('x-forwarded-proto') ?? 'http';

  if (!host) {
    return 'http://localhost:3000';
  }

  return `${protocol}://${host}`;
};

export const buildAbsoluteUrl = (siteUrl: string, path: string) => {
  const normalizedSiteUrl = siteUrl.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedSiteUrl}${normalizedPath}`;
};
