'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, Heart, ShoppingBag, Star } from 'lucide-react';
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

  const handleWishlist = () => {
    toast('Favoriler yakında.');
  };

  const handleQuickView = () => {
    router.push(productHref);
  };

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-3xl border border-[#E0D7C6] bg-[#FDFCF8] shadow-[0_15px_40px_rgba(26,60,52,0.08)] transition hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(26,60,52,0.12)] ${
        variant === 'compact' ? 'rounded-2xl' : ''
      }`}
    >
      <div className="relative">
        <Link
          href={productHref}
          className={`relative block w-full overflow-hidden ${
            variant === 'compact' ? 'aspect-[1/1]' : 'aspect-[4/3]'
          }`}
        >
          <Image
            src={imageSrc}
            alt={product.name}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        </Link>
        {variant !== 'compact' && (
          <div className="absolute left-3 top-3 rounded-sm bg-[#e53935] px-2 py-1 text-[11px] font-semibold text-white">
            -10%
          </div>
        )}
        {variant !== 'compact' && (
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="absolute bottom-4 right-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#00a651] text-white shadow-md hover:bg-[#008a44] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Sepete ekle"
          >
            <ShoppingBag className="h-5 w-5" />
          </button>
        )}
        {showHoverActions && variant !== 'compact' && (
          <div className="pointer-events-none absolute inset-0">
            <div className="pointer-events-auto absolute right-3 top-3 flex flex-col gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <button
                type="button"
                onClick={handleWishlist}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#1A3C34] shadow-md hover:bg-white"
                aria-label="Favorilere ekle"
              >
                <Heart className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleQuickView}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#1A3C34] shadow-md hover:bg-white"
                aria-label="Hızlı görüntüle"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
            <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#00a651] px-4 text-xs font-semibold uppercase tracking-[0.22em] text-white shadow-lg hover:bg-[#008a44] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ShoppingBag className="h-4 w-4" />
                {isOutOfStock ? 'Tükendi' : 'Sepete ekle'}
              </button>
            </div>
          </div>
        )}
        <div
          className={`absolute left-4 top-4 flex flex-wrap gap-2 font-semibold uppercase tracking-[0.2em] text-white ${
            variant === 'compact' ? 'text-[10px]' : 'text-[11px]'
          }`}
        >
          {product.tags?.slice(0, 2).map((tag) => (
            <span key={tag} className="rounded-full bg-black/40 px-3 py-1">
              {tag}
            </span>
          ))}
        </div>
        {typeof product.stock === 'number' && (
          <span
            className={`absolute right-4 top-4 rounded-full px-3 py-1 font-semibold uppercase tracking-[0.18em] ${
              variant === 'compact' ? 'text-[10px]' : 'text-[11px]'
            } ${
              isOutOfStock
                ? 'bg-[#3E2723] text-white'
                : lowStock
                ? 'bg-[#C5A059] text-[#3E2723]'
                : 'bg-white/80 text-[#1A3C34]'
            }`}
          >
            {isOutOfStock ? 'Stok yok' : lowStock ? `Son ${product.stock}` : 'Stokta'}
          </span>
        )}
      </div>
      <div
        className={`flex flex-1 flex-col gap-3 ${
          variant === 'compact' ? 'px-4 pb-4 pt-3' : 'px-5 pb-5 pt-4'
        }`}
      >
        {variant !== 'compact' && (
          <div className="flex items-center gap-1 text-[#f7b500]">
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
          className={`font-serif text-[#222222] transition hover:text-black ${
            variant === 'compact' ? 'text-base' : 'text-lg'
          }`}
        >
          {truncate(product.name, 60)}
        </Link>
        {product.description && (
          <p
            className={`line-clamp-2 text-[#777777] ${
              variant === 'compact' ? 'text-xs' : 'text-sm'
            }`}
          >
            {truncate(product.description, 90)}
          </p>
        )}
        <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span
            className={`font-semibold text-[#222222] ${
              variant === 'compact' ? 'text-lg' : 'text-xl'
            }`}
          >
            {formatPrice(product.price)}
          </span>
          <Button
            size="sm"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-4 sm:w-auto ${
              variant === 'compact' ? 'w-10 px-0' : ''
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            {variant === 'compact' ? null : isOutOfStock ? 'Tükendi' : 'Sepete ekle'}
          </Button>
        </div>
      </div>
    </article>
  );
}
