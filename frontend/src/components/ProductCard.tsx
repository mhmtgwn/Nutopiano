'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Star } from 'lucide-react';
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

	const rating = 5;

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
    <article className="group relative h-full border border-[#e5e5e5] bg-white">
      <div className="relative p-6">
        <Link href={productHref} className="block">
          <div className="relative mx-auto aspect-square w-full max-w-[220px]">
            <Image
              src={imageSrc}
              alt={product.name}
              fill
              unoptimized={isPlaceholderImage}
              className="object-contain"
            />
          </div>
        </Link>

        {variant !== 'compact' && (
          <div className="absolute left-4 top-4 rounded-sm bg-[#e53935] px-2 py-1 text-xs font-semibold text-white">
            -10%
          </div>
        )}

        {variant !== 'compact' && (
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="absolute bottom-4 right-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#00a651] text-white shadow-md hover:bg-[#008a44] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Sepete ekle"
          >
            <ShoppingBag className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="border-t border-[#e5e5e5] px-5 py-4">
        {variant !== 'compact' && (
          <div className="mb-2 flex items-center gap-1 text-[#f7b500]">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${i < rating ? 'fill-[#f7b500] text-[#f7b500]' : 'text-[#e5e5e5]'}`}
              />
            ))}
          </div>
        )}

        <Link
          href={productHref}
          className={`block font-semibold text-[#222222] hover:text-black ${
            variant === 'compact' ? 'text-sm' : 'text-base'
          }`}
        >
          {truncate(product.name, variant === 'compact' ? 38 : 48)}
        </Link>

        <div className="mt-2 flex items-end justify-between gap-3">
          <span className="text-base font-semibold text-[#e53935]">
            {formatPrice(product.price)}
          </span>
          {variant === 'compact' && (
            <Button
              size="sm"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="h-9 w-9 rounded-full px-0"
            >
              <ShoppingBag className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
