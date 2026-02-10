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
}

export default function ProductCard({
  product,
  categoryId,
  variant = 'default',
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
            src={product.imageUrl || '/nutopiano-logo.png'}
            alt={product.name}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        </Link>
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
        <Link
          href={productHref}
          className={`font-serif text-[#1A3C34] transition hover:text-[#3E2723] ${
            variant === 'compact' ? 'text-base' : 'text-lg'
          }`}
        >
          {truncate(product.name, 60)}
        </Link>
        {product.description && (
          <p
            className={`line-clamp-2 text-[#5C5C5C] ${
              variant === 'compact' ? 'text-xs' : 'text-sm'
            }`}
          >
            {truncate(product.description, 90)}
          </p>
        )}
        <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span
            className={`font-semibold text-[#1A3C34] ${
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
              variant === 'compact' ? 'text-xs' : ''
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            {isOutOfStock ? 'Tükendi' : 'Sepete ekle'}
          </Button>
        </div>
      </div>
    </article>
  );
}
