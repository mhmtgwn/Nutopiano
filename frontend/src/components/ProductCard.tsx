'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch } from '@/store';
import { addItem } from '@/store/cartSlice';
import { formatPrice, truncate } from '@/utils/helpers';

export interface ProductCardProps {
  product: {
    id: string;
    name: string;
    subtitle?: string | null;
    description?: string;
    price: number;
    imageUrl?: string | null;
    stock?: number | null;
    tags?: string[];
  };
  categoryId?: string;
  variant?: 'default' | 'compact';
}

export default function ProductCard({
  product,
  categoryId,
  variant = 'default',
}: ProductCardProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isOutOfStock = typeof product.stock === 'number' && product.stock <= 0;
  const lowStock =
    typeof product.stock === 'number' && product.stock > 0 && product.stock <= 5;
  const hasDiscountTag = (product.tags ?? []).some((tag) => {
    const normalized = String(tag).toLowerCase();
    return normalized.includes('indirim') || normalized.includes('sale') || normalized.includes('kampanya');
  });
  const productHref = categoryId
    ? `/categories/${categoryId}/products/${product.id}`
    : `/products/${product.id}`;

  const placeholderSeed = Number.parseInt(String(product.id), 10);
  const placeholderId = Number.isFinite(placeholderSeed)
    ? Math.abs(placeholderSeed % 1000)
    : 1;
  const imageSrc =
    product.imageUrl || `https://picsum.photos/seed/nutopiano-${placeholderId}/800/800`;
  const isPlaceholderImage = !product.imageUrl;
  const isCompact = variant === 'compact';

  const handleAddToCart = () => {
    dispatch(
      addItem({
        item: {
          lineId: product.id,
          productId: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl ?? undefined,
        },
      }),
    );

    toast.success('Ürün sepete eklendi');
  };

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={() => router.push(productHref)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') router.push(productHref);
      }}
      className={`group relative h-full cursor-pointer overflow-hidden rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white shadow-[var(--shadow-sm)] transition-[transform,shadow] duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)] ${
        isCompact ? 'rounded-[var(--radius-xl)]' : ''
      }`}
    >
      <div className="relative z-0">
        <div className="relative aspect-square w-full overflow-hidden bg-[var(--neutral-50)]">
          <Image
            src={imageSrc}
            alt={product.name}
            fill
            unoptimized={isPlaceholderImage}
            className="object-cover"
          />

          {(hasDiscountTag || (lowStock && !isOutOfStock)) && (
            <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
              {hasDiscountTag && (
                <span className="inline-flex items-center rounded-full bg-[var(--accent-600)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                  İndirim
                </span>
              )}
              {lowStock && !isOutOfStock && (
                <span className="inline-flex items-center rounded-full bg-[var(--warning-100)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--warning-600)]">
                  Kritik stok
                </span>
              )}
            </div>
          )}
        </div>

        <div className={`relative px-4 ${isCompact ? 'pb-3 pt-3' : 'pb-4 pt-4'}`}>
          <p className={`${isCompact ? 'text-[13px]' : 'text-sm'} font-semibold text-[var(--primary-800)]`}>
            {truncate(product.name, isCompact ? 34 : 44)}
          </p>
          <p
            className={`mt-1 ${isCompact ? 'text-[11px]' : 'text-xs'} text-[var(--neutral-600)] ${
              product.subtitle ? '' : 'invisible'
            }`}
          >
            {truncate(product.subtitle ?? ' ', isCompact ? 42 : 54)}
          </p>
          <div className={`flex items-center justify-between gap-3 ${isCompact ? 'mt-2.5' : 'mt-3'}`}>
            <div className="flex items-center gap-1 text-[var(--accent-600)]">
              <Star className="h-4 w-4 fill-current" />
              <span className="text-xs font-semibold text-[var(--neutral-700)]">0.0</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`${isCompact ? 'text-sm' : 'text-base'} font-semibold text-[var(--primary-800)]`}>
                {formatPrice(product.price)}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddToCart();
                }}
                disabled={isOutOfStock}
                className={`inline-flex items-center justify-center rounded-full border border-transparent bg-transparent text-[var(--primary-800)] transition hover:border-[var(--neutral-200)] hover:bg-[var(--neutral-50)] hover:shadow-[var(--shadow-sm)] active:scale-95 disabled:cursor-not-allowed disabled:text-[var(--neutral-400)] disabled:opacity-70 ${
                  isCompact ? 'h-9 w-9' : 'h-10 w-10'
                }`}
                aria-label="Sepete ekle"
              >
                <ShoppingBag className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
