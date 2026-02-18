'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/common/Button';
import { useAppDispatch, useAppSelector } from '@/store';
import { clearCart, removeItem, updateQuantity } from '@/store/cartSlice';
import { formatPrice } from '@/utils/helpers';

export default function CartPage() {
  const { items, totalPrice, totalQuantity } = useAppSelector(
    (state) => state.cart,
  );
  const dispatch = useAppDispatch();

  const handleRemove = (lineId: string) => {
    dispatch(removeItem(lineId));
    toast.success('Ürün sepetten kaldırıldı');
  };

  const handleQuantityChange = (lineId: string, quantity: number) => {
    dispatch(updateQuantity({ lineId, quantity }));
  };

  const handleClear = () => {
    dispatch(clearCart());
    toast.success('Sepet temizlendi');
  };

  const hasItems = items.length > 0;

  return (
    <div className="min-h-[calc(100vh-140px)] bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
              Sepet
            </p>
            <h1 className="mt-2 text-3xl font-serif leading-tight text-[var(--primary-800)] md:text-4xl">
              Sepetiniz
            </h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              {hasItems
                ? `${totalQuantity} ürün • ${formatPrice(totalPrice)}`
                : 'Sepetiniz şu an boş.'}
            </p>
          </div>

          {hasItems && (
            <button
              type="button"
              onClick={handleClear}
              className="mt-3 inline-flex items-center gap-2 self-start rounded-full border border-[var(--neutral-200)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)] md:mt-0"
            >
              <Trash2 className="h-4 w-4" />
              Temizle
            </button>
          )}
        </div>

        {!hasItems && (
          <div className="mt-10">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-2xl font-serif text-[var(--primary-800)]">
                Sepetiniz boş
              </h2>
              <p className="mt-2 text-sm text-[var(--neutral-600)]">
                Ürünleri keşfet ve sepete ekleyerek devam et.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link href="/categories">
                  <Button className="w-full rounded-full px-6 sm:w-auto">Ürünlere git</Button>
                </Link>
                <Link
                  href="/"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white px-6 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-800)]"
                >
                  Anasayfa
                </Link>
              </div>
            </div>
          </div>
        )}

        {hasItems && (
          <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,380px)] md:items-start">
            <section className="bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--neutral-200)] pb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                  Ürünler
                </p>
                <p className="text-sm font-semibold text-[var(--primary-800)]">
                  {totalQuantity}
                </p>
              </div>
              <div className="divide-y divide-[var(--neutral-200)]">
                {items.map((item) => (
                  <div key={item.lineId} className="py-5">
                    <div className="flex gap-4">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[var(--neutral-200)] bg-[var(--neutral-50)]">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        ) : (
                          <div className="h-full w-full" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-lg font-serif text-[var(--primary-800)]">
                              {item.name}
                            </p>
                            {item.variant && (
                              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                                {item.variant}
                              </p>
                            )}
                            <p className="mt-2 text-xs text-[var(--neutral-600)]">
                              Birim: {formatPrice(item.price)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemove(item.lineId)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white text-[var(--neutral-700)] shadow-[var(--shadow-xs)] transition hover:text-[var(--error-600)]"
                            aria-label="Kaldır"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <div className="inline-flex items-center rounded-full border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-2 py-1 shadow-[var(--shadow-xs)]">
                            <button
                              type="button"
                              onClick={() =>
                                handleQuantityChange(item.lineId, item.quantity - 1)
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--primary-800)] shadow-[var(--shadow-xs)]"
                              aria-label="Azalt"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <input
                              type="number"
                              min={0}
                              value={item.quantity}
                              onChange={(e) =>
                                handleQuantityChange(item.lineId, Number(e.target.value))
                              }
                              className="h-9 w-16 bg-transparent text-center text-sm font-semibold text-[var(--primary-800)] outline-none"
                              aria-label="Adet"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleQuantityChange(item.lineId, item.quantity + 1)
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--primary-800)] shadow-[var(--shadow-xs)]"
                              aria-label="Arttır"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="text-right">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                              Toplam
                            </p>
                            <p className="mt-1 text-lg font-semibold text-[var(--primary-800)]">
                              {formatPrice(item.price * item.quantity)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <aside className="md:sticky md:top-24">
              <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                  Sipariş özeti
                </p>
                <div className="mt-4 space-y-3 text-sm text-[var(--neutral-600)]">
                  <div className="flex items-center justify-between">
                    <span>Ürün adedi</span>
                    <span className="font-semibold text-[var(--primary-800)]">
                      {totalQuantity}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Ara toplam</span>
                    <span className="font-semibold text-[var(--primary-800)]">
                      {formatPrice(totalPrice)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--neutral-500)]">
                    Kargo ve vergiler ödeme adımında hesaplanır.
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-[var(--neutral-200)] pt-4 text-lg font-semibold text-[var(--primary-800)]">
                  <span>Ödenecek</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>

                <Link href="/checkout" className="mt-5 block">
                  <Button className="w-full rounded-full py-3 text-base">
                    Ödeme adımına geç
                  </Button>
                </Link>

                <Link
                  href="/categories"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-800)]"
                >
                  Alışverişe devam et
                </Link>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
