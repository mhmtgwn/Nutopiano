import type { Metadata } from 'next';
import HomeClient from './HomeClient';
import { getSiteUrl } from '@/utils/site';

const SITE_NAME = 'Nutopiano Store';
const SITE_DESCRIPTION =
  'Özenle seçilmiş ürünler, güvenli ödeme ve stok takibi ile Nutopiano e-ticaret deneyimi.';
const OG_IMAGE_PATH = '/nutopiano-logo.png';

const buildOgImage = (siteUrl: string) =>
  `${siteUrl}${OG_IMAGE_PATH.startsWith('/') ? '' : '/'}${OG_IMAGE_PATH}`;

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = await getSiteUrl();
  const ogImage = buildOgImage(siteUrl);
  const title = `${SITE_NAME} | Premium E-Ticaret Deneyimi`;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description: SITE_DESCRIPTION,
    alternates: {
      canonical: siteUrl,
    },
    openGraph: {
      type: 'website',
      url: siteUrl,
      siteName: SITE_NAME,
      title,
      description: SITE_DESCRIPTION,
      images: [{ url: ogImage }],
      locale: 'tr_TR',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: SITE_DESCRIPTION,
      images: [ogImage],
    },
  };
}

export default async function HomePage() {
  const siteUrl = await getSiteUrl();
  const ogImage = buildOgImage(siteUrl);
  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      url: siteUrl,
      logo: ogImage,
      description: SITE_DESCRIPTION,
      inLanguage: 'tr-TR',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: siteUrl,
      description: SITE_DESCRIPTION,
      inLanguage: 'tr-TR',
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <HomeClient />
    </>
  );
}
