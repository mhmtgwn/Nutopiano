'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch } from '@/store';
import { useAppSelector } from '@/store';
import { addItem } from '@/store/cartSlice';
import { formatPrice, truncate } from '@/utils/helpers';
import Button from './common/Button';

export interface ProductCardProps {
  product: {
    id: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string | null;
    stock?: number | null;
    tags?: string[];
  };
  categoryId?: string;
  variant?: 'default' | 'compact';
  showHoverActions?: boolean;
}

export default function ProductCard({
  product,
  categoryId,
  variant = 'default',
  showHoverActions = false,
}: ProductCardProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.user.status === 'authenticated');
  const isOutOfStock = typeof product.stock === 'number' && product.stock <= 0;
  const lowStock =
    typeof product.stock === 'number' && product.stock > 0 && product.stock <= 5;
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

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    dispatch(
      addItem({
        item: {
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
    <article className="group relative h-full bg-white border border-[var(--neutral-200)] rounded-[var(--radius-lg)] overflow-hidden transition-all duration-300 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-lg)] hover:-translate-y-1">
      <div className="relative p-6">
        <Link href={productHref} className="block">
          <div className="relative mx-auto aspect-square w-full max-w-[220px] overflow-hidden rounded-[var(--radius-md)]">
            <Image
              src={imageSrc}
              alt={product.name}
              fill
              unoptimized={isPlaceholderImage}
              className="object-contain transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        </Link>

        {variant !== 'compact' && (
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="absolute bottom-4 right-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--primary-800)] text-white shadow-[var(--shadow-md)] transition-all duration-200 hover:bg-[var(--primary-900)] hover:shadow-[var(--shadow-lg)] hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            aria-label="Sepete ekle"
          >
            <ShoppingBag className="h-5 w-5" />
          </button>
        )}

        {lowStock && !isOutOfStock && (
          <span className="absolute top-4 left-4 inline-flex items-center rounded-full bg-[var(--warning-100)] px-3 py-1 text-xs font-semibold text-[var(--warning-600)]">
            {product.stock} adet kaldı
          </span>
        )}

        {isOutOfStock && (
          <span className="absolute top-4 left-4 inline-flex items-center rounded-full bg-[var(--error-100)] px-3 py-1 text-xs font-semibold text-[var(--error-600)]">
            Stokta yok
          </span>
        )}
      </div>

      <div className="px-5 py-4 bg-[var(--neutral-50)] border-t border-[var(--neutral-200)]">
        <Link
          href={productHref}
          className={`block font-semibold text-[var(--neutral-900)] hover:text-[var(--primary-800)] transition-colors ${variant === 'compact' ? 'text-sm' : 'text-base'
            }`}
        >
          {truncate(product.name, variant === 'compact' ? 38 : 48)}
        </Link>

        <div className="mt-2 flex items-end justify-between gap-3">
          <span className="text-lg font-semibold text-[var(--primary-800)]">
            {formatPrice(product.price)}
          </span>
          {variant === 'compact' && (
            <Button
              size="sm"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="h-9 w-9 rounded-full px-0 transition-all hover:scale-105 active:scale-95"
            >
              <ShoppingBag className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
