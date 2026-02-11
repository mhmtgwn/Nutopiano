'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles, Trash2, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/common/Button';
import CheckoutStepper from '@/components/checkout/CheckoutStepper';
import { useAppDispatch, useAppSelector } from '@/store';
import { clearCart, removeItem, updateQuantity } from '@/store/cartSlice';
import { formatPrice } from '@/utils/helpers';

export default function CartPage() {
  const { items, totalPrice, totalQuantity } = useAppSelector(
    (state) => state.cart,
  );
  const dispatch = useAppDispatch();

  const handleRemove = (productId: string) => {
    dispatch(removeItem(productId));
    toast.success('Ürün sepetten kaldırıldı');
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    dispatch(updateQuantity({ productId, quantity }));
  };

  const handleClear = () => {
    dispatch(clearCart());
    toast.success('Sepet temizlendi');
  };

  const hasItems = items.length > 0;

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[var(--neutral-50)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 md:px-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              Nutopiano Shop
            </p>
            <h1 className="text-4xl font-serif text-[var(--primary-800)] md:text-5xl">
              Sepetiniz
            </h1>
            <p className="text-sm text-[var(--neutral-600)] md:text-base">
              Ürünleri düzenleyin, teslimat seçeneklerini görün ve checkout’a geçin.
            </p>
          </div>
          {hasItems && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--primary-800)]/15 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] shadow-sm transition hover:-translate-y-0.5"
            >
              <Trash2 className="h-4 w-4" />
              Sepeti temizle
            </button>
          )}
        </header>

        <section className="rounded-[var(--radius-3xl)] border border-[var(--primary-800)]/10 bg-gradient-to-br from-[var(--accent-100)] via-white to-[var(--success-100)] px-6 py-8 shadow-[var(--shadow-2xl)] md:px-10">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] md:items-center">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                Teslimat planı
              </p>
              <h2 className="text-2xl font-serif text-[var(--primary-800)] md:text-3xl">
                Bugün hazırlanır, yarın kapınızda
              </h2>
              <p className="text-sm text-[var(--neutral-600)] md:text-base">
                Hızlı paketleme, takipli teslimat ve WhatsApp destek bu pakette.
              </p>
              <div className="flex flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)]/80">
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--primary-800)]/15 bg-white px-4 py-2">
                  <Truck className="h-4 w-4" /> Hızlı teslimat
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--primary-800)]/15 bg-white px-4 py-2">
                  <Sparkles className="h-4 w-4" /> Premium paketleme
                </span>
              </div>
            </div>
            <div className="rounded-[var(--radius-2xl)] border border-white/60 bg-white/80 px-5 py-5">
              <div className="space-y-3 text-sm text-[var(--neutral-600)]">
                <div className="flex items-center justify-between">
                  <span>Ürün sayısı</span>
                  <span className="font-semibold text-[var(--primary-800)]">{totalQuantity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Ara toplam</span>
                  <span className="font-semibold text-[var(--primary-800)]">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[var(--neutral-200)] pt-4 text-lg font-semibold text-[var(--primary-800)]">
                <span>Toplam</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
              <Link
                href="/products"
                className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--primary-800)]/70 hover:text-[var(--primary-800)]"
              >
                Shop now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <CheckoutStepper currentStep={0} />

        {!hasItems && (
          <section className="space-y-4 rounded-[var(--radius-3xl)] border border-[var(--neutral-200)] bg-white/90 px-6 py-8 shadow-[var(--shadow-md)] backdrop-blur">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                Sepet durumu
              </p>
              <h2 className="text-2xl font-serif text-[var(--primary-800)]">
                Sepetiniz boş
              </h2>
              <p className="text-sm text-[var(--neutral-600)] md:text-base">
                Koleksiyonları keşfederek alışverişe başlayabilirsiniz.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/products">
                <Button className="rounded-full px-6">Shop now</Button>
              </Link>
              <Link
                href="/"
                className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--primary-800)]/70 hover:text-[var(--primary-800)]"
              >
                Anasayfaya dön
              </Link>
            </div>
          </section>
        )}

        {hasItems && (
          <section className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,0.95fr)]">
            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.productId}
                  className="group flex flex-col gap-4 rounded-[var(--radius-3xl)] border border-[var(--neutral-200)] bg-white/95 px-5 py-5 shadow-[var(--shadow-lg)] md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex flex-1 flex-col gap-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                      Ürün {index + 1}
                    </p>
                    <p className="text-xl font-serif text-[var(--primary-800)]">{item.name}</p>
                    <p className="text-xs text-[var(--neutral-600)] md:text-sm">
                      Birim fiyat: {formatPrice(item.price)}
                    </p>
                  </div>
                  <div className="flex flex-col-reverse gap-3 text-sm md:flex-row md:items-center">
                    <div className="flex flex-col">
                      <span className="text-[11px] uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                        Toplam
                      </span>
                      <span className="text-lg font-semibold text-[var(--primary-800)]">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-2 py-1">
                      <span className="text-[11px] text-[var(--neutral-500)]">Adet</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleQuantityChange(item.productId, item.quantity - 1)
                        }
                        className="h-8 w-8 rounded-full bg-white text-sm font-semibold text-[var(--primary-800)] shadow-sm hover:bg-[var(--neutral-50)]"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={item.quantity}
                        onChange={(e) =>
                          handleQuantityChange(item.productId, Number(e.target.value))
                        }
                        className="h-8 w-16 rounded-full border border-transparent bg-white px-3 text-sm font-medium text-[var(--primary-800)] text-center outline-none focus-visible:border-[var(--primary-800)]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleQuantityChange(item.productId, item.quantity + 1)
                        }
                        className="h-8 w-8 rounded-full bg-white text-sm font-semibold text-[var(--primary-800)] shadow-sm hover:bg-[var(--neutral-50)]"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.productId)}
                      className="self-start text-xs font-semibold uppercase tracking-[0.2em] text-[var(--error-600)] hover:text-[var(--error-600)]/80"
                    >
                      Kaldır
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <aside className="space-y-5 rounded-[var(--radius-3xl)] border border-[var(--neutral-200)] bg-gradient-to-b from-white to-[var(--neutral-100)] px-6 py-6 shadow-[var(--shadow-2xl)]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                  Sipariş özeti
                </p>
                <h2 className="text-2xl font-serif text-[var(--primary-800)]">
                  Ödeme öncesi
                </h2>
              </div>
              <div className="space-y-3 text-sm text-[var(--neutral-600)]">
                <div className="flex items-center justify-between">
                  <span>Ürün adedi</span>
                  <span className="font-semibold text-[var(--primary-800)]">{totalQuantity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Ara toplam</span>
                  <span className="font-semibold text-[var(--primary-800)]">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
                <div className="rounded-[var(--radius-md)] bg-[var(--neutral-100)] px-3 py-2 text-xs text-[var(--neutral-700)]">
                  Kargo ve vergiler ödeme sayfasında eklenir.
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--neutral-200)] pt-4 text-lg font-semibold text-[var(--primary-800)]">
                <span>Ödenecek</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
              <Link href="/checkout" className="block pt-2">
                <Button className="w-full rounded-full py-3 text-base">
                  Ödeme adımına geç
                </Button>
              </Link>
            </aside>
          </section>
        )}
      </div>
    </div>
  );
}
