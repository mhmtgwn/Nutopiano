'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronRight, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAppDispatch } from '@/store';
import { useAppSelector } from '@/store';
import { addItem } from '@/store/cartSlice';
import { formatPrice } from '@/utils/helpers';
import Button from '@/components/common/Button';

interface ProductDetail {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  stock?: number | null;
  tags?: string[];
}

export interface ProductDetailClientProps {
  product: ProductDetail;
  categoryId?: string;
}

export default function ProductDetailClient({
  product,
  categoryId,
}: ProductDetailClientProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(
    (state) => state.user.status === 'authenticated',
  );
  const isOutOfStock = typeof product.stock === 'number' && product.stock <= 0;
  const lowStock =
    typeof product.stock === 'number' && product.stock > 0 && product.stock <= 5;
  const breadcrumbLabel = categoryId ? 'Kategori' : 'Shop';
  const breadcrumbHref = categoryId ? `/categories/${categoryId}` : '/products';

  const placeholderSeed = Number.parseInt(String(product.id), 10);
  const placeholderId = Number.isFinite(placeholderSeed)
    ? Math.abs(placeholderSeed % 1000)
    : 1;
  const imageSrc =
    product.imageUrl || `https://picsum.photos/seed/nutopiano-${placeholderId}/1000/1000`;

  const maxQuantity = useMemo(() => {
    if (typeof product.stock === 'number' && product.stock > 0) {
      return product.stock;
    }
    return 99;
  }, [product.stock]);

  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = () => {
    if (isOutOfStock) {
      toast.error('Ürün stokta yok.');
      return;
    }

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
        quantity,
      }),
    );

    toast.success('Sepete eklendi');
  };

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#F7F4EF]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 md:px-6">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#1A3C34]/60">
          <Link href="/" className="hover:text-[#1A3C34]">
            Anasayfa
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link href={breadcrumbHref} className="hover:text-[#1A3C34]">
            {breadcrumbLabel}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-[#1A3C34]">Ürün</span>
        </div>

        <section className="grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-start">
          <div className="overflow-hidden rounded-[36px] border border-[#1A3C34]/10 bg-white shadow-[0_40px_120px_rgba(26,60,52,0.1)]">
            <div className="relative aspect-square w-full">
              <Image
                src={imageSrc}
                alt={product.name}
                fill
                className="object-cover"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                Nutopiano Shop
              </p>
              <h1 className="text-3xl font-serif text-[#1A3C34] md:text-4xl">
                {product.name}
              </h1>
              {product.description && (
                <p className="text-sm text-[#5C5C5C] md:text-base">
                  {product.description}
                </p>
              )}
            </div>

            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.2em]">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[#1A3C34]/20 bg-white px-3 py-1 text-[#1A3C34]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-[#E0D7C6] bg-white/90 px-5 py-4">
              <p className="text-2xl font-semibold text-[#1A3C34]">
                {formatPrice(product.price)}
              </p>
              {typeof product.stock === 'number' && (
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                    isOutOfStock
                      ? 'bg-[#3E2723] text-white'
                      : lowStock
                      ? 'bg-[#C5A059] text-[#3E2723]'
                      : 'bg-[#F3EEE3] text-[#3E2723]'
                  }`}
                >
                  {isOutOfStock ? 'Stok yok' : lowStock ? `Son ${product.stock}` : 'Stokta'}
                </span>
              )}
            </div>

            <div className="grid gap-3 text-sm text-[#1A3C34] md:grid-cols-2">
              <div className="flex items-center gap-3 rounded-2xl border border-[#E0D7C6] bg-white/90 px-4 py-3">
                <ShieldCheck className="h-5 w-5 text-[#C5A059]" />
                <span>Güvenli ödeme</span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-[#E0D7C6] bg-white/90 px-4 py-3">
                <Truck className="h-5 w-5 text-[#C5A059]" />
                <span>Hızlı teslimat</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center overflow-hidden rounded-full border border-[#1A3C34]/20 bg-white/80">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-4 py-2 text-sm font-semibold text-[#1A3C34] hover:bg-white"
                >
                  -
                </button>
                <span className="min-w-[3rem] px-3 py-2 text-center text-sm font-semibold text-[#1A3C34]">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                  className="px-4 py-2 text-sm font-semibold text-[#1A3C34] hover:bg-white"
                >
                  +
                </button>
              </div>
              <Button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 sm:w-auto"
              >
                <ShoppingBag className="h-4 w-4" />
                {isOutOfStock ? 'Tükendi' : 'Sepete ekle'}
              </Button>
              <Link
                href="/cart"
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#1A3C34]/70 hover:text-[#1A3C34]"
              >
                Sepete git <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#1A3C34]/70 hover:text-[#1A3C34]"
              >
                Mağazaya dön <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
