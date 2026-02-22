import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import { getSiteUrl } from '@/utils/site';

interface PublicCategoryTreeNode {
  id: number;
  name: string;
  slug: string;
  parentId?: number | null;
  orderIndex: number;
  children?: PublicCategoryTreeNode[];
}

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

const getCategoryTree = async (): Promise<PublicCategoryTreeNode[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/public/categories/tree`, {
      cache: 'no-store',
    });

    if (!response.ok) return [];

    const payload = await response.json();
    const data = unwrapResponse<PublicCategoryTreeNode[]>(payload);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

const heroImages = [
  'IMG_3958.JPG',
  'IMG_3959.JPG',
  'IMG_3962.JPG',
  'IMG_3965.JPG',
  'IMG_3966.JPG',
  'IMG_3968.JPG',
  'IMG_3969.JPG',
  'IMG_3972.JPG',
  'IMG_3973.JPG',
  'IMG_3975.JPG',
];

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = await getSiteUrl();
  return {
    metadataBase: new URL(siteUrl),
    title: 'Kategoriler | Nutopiano',
    description: 'Nutopiano ürün kategorilerini keşfedin.',
    alternates: { canonical: `${siteUrl}/categories` },
    openGraph: {
      type: 'website',
      url: `${siteUrl}/categories`,
      title: 'Kategoriler | Nutopiano',
      description: 'Nutopiano ürün kategorilerini keşfedin.',
    },
  };
}

export default async function CategoriesLandingPage() {
  const categoriesTree = await getCategoryTree();

  return (
    <div className="min-h-[calc(100vh-140px)] bg-white">
      <div className="px-4 py-8 md:px-8 md:py-10">
        <div className="flex flex-col gap-6">
          <section className="space-y-4">
            <Breadcrumbs
              items={[
                { label: 'Home', href: '/' },
                { label: 'Shop' },
              ]}
            />
          </section>

          <section>
            {categoriesTree.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-3">
                {categoriesTree.map((category, index) => {
                  const hero = heroImages[index % heroImages.length];
                  const imageSrc = `/hero/${hero}`;
                  const childCount = category.children?.length ?? 0;

                  return (
                    <Link key={category.id} href={`/categories/${category.slug}`} className="block">
                      <article className="group relative h-full w-full cursor-pointer overflow-hidden rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white shadow-[var(--shadow-sm)] transition-[transform,shadow] duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]">
                        <div className="relative z-0">
                          <div className="relative aspect-[16/11] w-full overflow-hidden bg-[var(--neutral-50)]">
                            <Image src={imageSrc} alt={category.name} fill className="object-cover" />
                          </div>
                        </div>

                        <div className="relative px-2 pb-2 pt-2">
                          <p className="truncate text-xs font-semibold text-[var(--primary-800)]">
                            {category.name}
                          </p>
                        </div>
                      </article>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white p-8 text-center shadow-[var(--shadow-md)]">
                <p className="text-sm text-[var(--neutral-600)]">Kategori bulunamadı.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

