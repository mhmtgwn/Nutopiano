'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowUpRight,
  FolderTree,
  Package,
  Tags,
  TrendingUp,
} from 'lucide-react';

import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { formatPrice } from '@/lib/format';

interface DashboardSummary {
  activeProducts: number;
  lowStockProducts: number;
  ordersTotal: number;
  ordersToday: number;
  revenueTodayCents: number;
}

interface DashboardReportsSummary {
  range: {
    from: string;
    to: string;
    days: number;
  };
  ordersCount: number;
  revenueCents: number;
  averageOrderValueCents: number;
  topProducts: Array<{
    productId: number;
    name: string;
    quantity: number;
    revenueCents: number;
  }>;
}

interface CategoryTreeNode {
  id: number;
  name: string;
  slug: string;
  parentId?: number | null;
  orderIndex: number;
  children?: CategoryTreeNode[];
}

type ProductType = 'PHYSICAL' | 'SERVICE' | 'WEIGHT' | 'CUSTOM';

interface ProductRow {
  id: number;
  categoryId?: number | null;
  name: string;
  sku?: string | null;
  type: ProductType;
  priceCents: number;
  stock?: number | null;
  isActive: boolean;
}

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface PaginatedProducts {
  data: ProductRow[];
  meta: PaginationMeta;
}

const typeLabel: Record<ProductType, string> = {
  PHYSICAL: 'Fiziksel',
  SERVICE: 'Hizmet',
  WEIGHT: 'Kilo',
  CUSTOM: 'Özel',
};

const flattenCategories = (
  tree: CategoryTreeNode[],
  level = 0,
): Array<{ id: number; name: string; level: number }> => {
  const result: Array<{ id: number; name: string; level: number }> = [];
  for (const node of tree) {
    result.push({ id: node.id, name: node.name, level });
    if (node.children?.length) {
      result.push(...flattenCategories(node.children, level + 1));
    }
  }
  return result;
};

export default function AdminCatalogPage() {
  const summaryQuery = useQuery<DashboardSummary>({
    queryKey: ['admin-catalog-summary'],
    queryFn: async () => {
      const res = await api.get<DashboardSummary>('/dashboard/summary');
      return res.data;
    },
  });

  const reportsQuery = useQuery<DashboardReportsSummary>({
    queryKey: ['admin-catalog-reports'],
    queryFn: async () => {
      const res = await api.get<DashboardReportsSummary>('/dashboard/reports/summary');
      return res.data;
    },
  });

  const categoriesQuery = useQuery<CategoryTreeNode[]>({
    queryKey: ['admin-catalog-categories-tree'],
    queryFn: async () => {
      const res = await api.get<CategoryTreeNode[]>('/categories/tree');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const productsQuery = useQuery<PaginatedProducts>({
    queryKey: ['admin-catalog-products-preview'],
    queryFn: async () => {
      const res = await api.get<PaginatedProducts>('/products', {
        params: {
          page: 1,
          pageSize: 8,
        },
      });
      return res.data;
    },
  });

  const isLoading =
    summaryQuery.isLoading ||
    reportsQuery.isLoading ||
    categoriesQuery.isLoading ||
    productsQuery.isLoading;

  const isError =
    summaryQuery.isError ||
    reportsQuery.isError ||
    categoriesQuery.isError ||
    productsQuery.isError;

  const flattenedCategories = useMemo(
    () => flattenCategories(categoriesQuery.data ?? []),
    [categoriesQuery.data],
  );

  const rootCategoryCount = useMemo(
    () => (categoriesQuery.data ?? []).filter((c) => !c.parentId).length,
    [categoriesQuery.data],
  );

  const topProduct = reportsQuery.data?.topProducts?.[0];
  const productPreview = productsQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-gradient-to-br from-[#F7F1E5] via-white to-[#ECF6F3] px-6 py-6 shadow-[0_20px_60px_rgba(26,60,52,0.08)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              Katalog
            </p>
            <h1 className="mt-2 text-3xl font-serif text-[var(--primary-800)] md:text-4xl">
              Katalog yönetimi
            </h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Ürün ve kategori yapısını gerçek verilerle izleyin, hızlı aksiyon alın.
            </p>
          </div>
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--neutral-200)] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)]"
          >
            Ürünlere git <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {isLoading ? (
        <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-10">
          <Spinner label="Katalog verileri yükleniyor..." />
        </section>
      ) : null}

      {isError ? (
        <section className="rounded-[var(--radius-xl)] border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          Katalog verileri alınamadı. Oturumu yenileyip tekrar deneyin.
        </section>
      ) : null}

      {!isLoading && !isError ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
              <Package className="h-5 w-5 text-[var(--primary-800)]/70" />
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Aktif ürün
              </p>
              <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
                {summaryQuery.data?.activeProducts ?? 0}
              </p>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
              <AlertTriangle className="h-5 w-5 text-[var(--primary-800)]/70" />
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Düşük stok
              </p>
              <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
                {summaryQuery.data?.lowStockProducts ?? 0}
              </p>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
              <Tags className="h-5 w-5 text-[var(--primary-800)]/70" />
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Toplam kategori
              </p>
              <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
                {flattenedCategories.length}
              </p>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
              <FolderTree className="h-5 w-5 text-[var(--primary-800)]/70" />
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Ana kategori
              </p>
              <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">{rootCategoryCount}</p>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <Link
              href="/admin/products"
              className="group rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6 transition hover:bg-[var(--neutral-50)]"
            >
              <Package className="h-5 w-5 text-[var(--primary-800)]/70" />
              <h2 className="mt-4 text-2xl font-serif text-[var(--primary-800)]">Ürün yönetimi</h2>
              <p className="mt-2 text-sm text-[var(--neutral-600)]">
                Fiyat, stok, varyant, görsel ve CSV import/export akışını yönetin.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)]">
                Ürün ekranını aç <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </div>
            </Link>

            <Link
              href="/admin/categories"
              className="group rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6 transition hover:bg-[var(--neutral-50)]"
            >
              <Tags className="h-5 w-5 text-[var(--primary-800)]/70" />
              <h2 className="mt-4 text-2xl font-serif text-[var(--primary-800)]">Kategori yönetimi</h2>
              <p className="mt-2 text-sm text-[var(--neutral-600)]">
                Kategori ağacını ve vitrin sıralamasını düzenleyin.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)]">
                Kategori ekranını aç <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-2xl font-serif text-[var(--primary-800)]">Katalog önizleme</h2>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                  İlk 8 ürün
                </span>
              </div>

              {productPreview.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--neutral-600)]">Ürün kaydı bulunamadı.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-[10px] uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                      <tr>
                        <th className="pb-3 pr-4">Ürün</th>
                        <th className="pb-3 pr-4">Tip</th>
                        <th className="pb-3 pr-4">Stok</th>
                        <th className="pb-3">Fiyat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productPreview.map((product) => (
                        <tr key={product.id} className="border-t border-[var(--neutral-200)]">
                          <td className="py-3 pr-4">
                            <p className="font-semibold text-[var(--primary-800)]">{product.name}</p>
                            <p className="text-xs text-[var(--neutral-600)]">#{product.id}</p>
                          </td>
                          <td className="py-3 pr-4 text-[var(--neutral-700)]">{typeLabel[product.type]}</td>
                          <td className="py-3 pr-4 text-[var(--neutral-700)]">
                            {typeof product.stock === 'number' ? product.stock : '-'}
                          </td>
                          <td className="py-3 text-[var(--primary-800)]">
                            {formatPrice(product.priceCents / 100)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-2xl font-serif text-[var(--primary-800)]">Top ürün</h2>
                  <TrendingUp className="h-5 w-5 text-[var(--primary-800)]/70" />
                </div>
                {!topProduct ? (
                  <p className="mt-4 text-sm text-[var(--neutral-600)]">Satış verisi bulunamadı.</p>
                ) : (
                  <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-4">
                    <p className="font-semibold text-[var(--primary-800)]">{topProduct.name}</p>
                    <p className="mt-1 text-xs text-[var(--neutral-600)]">
                      {topProduct.quantity} adet • {formatPrice(topProduct.revenueCents / 100)}
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
                <h2 className="text-2xl font-serif text-[var(--primary-800)]">Kategori ağacı</h2>
                {flattenedCategories.length === 0 ? (
                  <p className="mt-4 text-sm text-[var(--neutral-600)]">Kategori bulunamadı.</p>
                ) : (
                  <div className="mt-4 space-y-2">
                    {flattenedCategories.slice(0, 10).map((category) => (
                      <div
                        key={category.id}
                        className="rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-2 text-sm text-[var(--primary-800)]"
                        style={{ marginLeft: `${category.level * 12}px` }}
                      >
                        {category.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
