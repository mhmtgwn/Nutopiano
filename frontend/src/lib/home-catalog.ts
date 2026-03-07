import { API_BASE_URL } from '@/constants/api.constants';

export interface HomeProduct {
  id: string;
  name: string;
  subtitle?: string | null;
  description?: string;
  price: number;
  imageUrl?: string | null;
  stock?: number | null;
  tags?: string[];
}

export interface HomeCategory {
  slug: string;
  name: string;
  description?: string;
}

interface ApiSuccessEnvelope<T> {
  success?: boolean;
  data: T;
  message?: string | null;
}

interface ApiProduct {
  id: number;
  name: string;
  subtitle?: string | null;
  description?: string | null;
  priceCents: number;
  imageUrl?: string | null;
  stock?: number | null;
  tags?: string[];
}

interface ApiCategory {
  id: number;
  name: string;
  slug: string;
  orderIndex: number;
}

interface MarketplaceResponse {
  data: ApiProduct[];
  meta?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

const mapProduct = (product: ApiProduct): HomeProduct => ({
  id: String(product.id),
  name: product.name,
  subtitle: product.subtitle ?? null,
  description: product.description ?? undefined,
  price: (product.priceCents ?? 0) / 100,
  imageUrl: product.imageUrl ?? null,
  stock: product.stock ?? null,
  tags: product.tags ?? [],
});

const mapCategory = (category: ApiCategory): HomeCategory => ({
  slug: category.slug,
  name: category.name,
});

const unwrapEnvelope = <T>(payload: ApiSuccessEnvelope<T> | T): T => {
  if (
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    'data' in payload
  ) {
    return (payload as ApiSuccessEnvelope<T>).data;
  }

  return payload as T;
};

const fetchJson = async <T>(path: string) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    next: { revalidate: 120 },
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${path} (${response.status})`);
  }

  return response.json() as Promise<T>;
};

export const fetchHomeCatalog = async () => {
  const [productsResult, categoriesResult] = await Promise.allSettled([
    fetchJson<ApiSuccessEnvelope<MarketplaceResponse>>(
      '/marketplace/search?page=1&pageSize=12&sort=newest',
    ),
    fetchJson<ApiSuccessEnvelope<ApiCategory[]>>('/public/categories'),
  ]);

  const products =
    productsResult.status === 'fulfilled'
      ? unwrapEnvelope(productsResult.value).data.map(mapProduct)
      : [];

  const categories =
    categoriesResult.status === 'fulfilled'
      ? unwrapEnvelope(categoriesResult.value)
          .slice()
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map(mapCategory)
      : [];

  return {
    products,
    categories,
  };
};
