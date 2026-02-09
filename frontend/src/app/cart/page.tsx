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
    <div className="min-h-[calc(100vh-140px)] bg-[#F7F4EF]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 md:px-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
              Nutopiano Shop
            </p>
            <h1 className="text-4xl font-serif text-[#1A3C34] md:text-5xl">
              Sepetiniz
            </h1>
            <p className="text-sm text-[#5C5C5C] md:text-base">
              Ürünleri düzenleyin, teslimat seçeneklerini görün ve checkout’a geçin.
            </p>
          </div>
          {hasItems && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-2 rounded-full border border-[#1A3C34]/15 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1A3C34] shadow-sm transition hover:-translate-y-0.5"
            >
              <Trash2 className="h-4 w-4" />
              Sepeti temizle
            </button>
          )}
        </header>

        <section className="rounded-[40px] border border-[#1A3C34]/10 bg-gradient-to-br from-[#FFF9E6] via-white to-[#F3FAF5] px-6 py-8 shadow-[0_40px_120px_rgba(26,60,52,0.12)] md:px-10">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] md:items-center">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                Teslimat planı
              </p>
              <h2 className="text-2xl font-serif text-[#1A3C34] md:text-3xl">
                Bugün hazırlanır, yarın kapınızda
              </h2>
              <p className="text-sm text-[#5C5C5C] md:text-base">
                Hızlı paketleme, takipli teslimat ve WhatsApp destek bu pakette.
              </p>
              <div className="flex flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#1A3C34]/80">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#1A3C34]/15 bg-white px-4 py-2">
                  <Truck className="h-4 w-4" /> Hızlı teslimat
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#1A3C34]/15 bg-white px-4 py-2">
                  <Sparkles className="h-4 w-4" /> Premium paketleme
                </span>
              </div>
            </div>
            <div className="rounded-[28px] border border-white/60 bg-white/80 px-5 py-5">
              <div className="space-y-3 text-sm text-[#5C5C5C]">
                <div className="flex items-center justify-between">
                  <span>Ürün sayısı</span>
                  <span className="font-semibold text-[#1A3C34]">{totalQuantity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Ara toplam</span>
                  <span className="font-semibold text-[#1A3C34]">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[#E4DAC9] pt-4 text-lg font-semibold text-[#1A3C34]">
                <span>Toplam</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
              <Link
                href="/products"
                className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#1A3C34]/70 hover:text-[#1A3C34]"
              >
                Shop now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <CheckoutStepper currentStep={0} />

        {!hasItems && (
          <section className="space-y-4 rounded-[32px] border border-[#E0D7C6] bg-white/90 px-6 py-8 shadow-md backdrop-blur">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                Sepet durumu
              </p>
              <h2 className="text-2xl font-serif text-[#1A3C34]">
                Sepetiniz boş
              </h2>
              <p className="text-sm text-[#5C5C5C] md:text-base">
                Koleksiyonları keşfederek alışverişe başlayabilirsiniz.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/products">
                <Button className="rounded-full px-6">Shop now</Button>
              </Link>
              <Link
                href="/"
                className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1A3C34]/70 hover:text-[#1A3C34]"
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
                  className="group flex flex-col gap-4 rounded-[32px] border border-[#E0D7C6] bg-white/95 px-5 py-5 shadow-[0_20px_60px_rgba(26,60,52,0.08)] md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex flex-1 flex-col gap-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                      Ürün {index + 1}
                    </p>
                    <p className="text-xl font-serif text-[#1A3C34]">{item.name}</p>
                    <p className="text-xs text-[#5C5C5C] md:text-sm">
                      Birim fiyat: {formatPrice(item.price)}
                    </p>
                  </div>
                  <div className="flex flex-col-reverse gap-3 text-sm md:flex-row md:items-center">
                    <div className="flex flex-col">
                      <span className="text-[11px] uppercase tracking-[0.3em] text-[#9F8E6B]">
                        Toplam
                      </span>
                      <span className="text-lg font-semibold text-[#1A3C34]">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-[#E0D7C6] bg-[#FBF9F4] px-2 py-1">
                      <span className="text-[11px] text-[#9F8E6B]">Adet</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleQuantityChange(item.productId, item.quantity - 1)
                        }
                        className="h-8 w-8 rounded-full bg-white text-sm font-semibold text-[#1A3C34] shadow-sm hover:bg-[#fffdf7]"
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
                        className="h-8 w-16 rounded-full border border-transparent bg-white px-3 text-sm font-medium text-[#1A3C34] text-center outline-none focus-visible:border-[#1A3C34]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleQuantityChange(item.productId, item.quantity + 1)
                        }
                        className="h-8 w-8 rounded-full bg-white text-sm font-semibold text-[#1A3C34] shadow-sm hover:bg-[#fffdf7]"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.productId)}
                      className="self-start text-xs font-semibold uppercase tracking-[0.2em] text-[#B04B4B] hover:text-[#7C3A3A]"
                    >
                      Kaldır
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <aside className="space-y-5 rounded-[36px] border border-[#CAB89A] bg-gradient-to-b from-white to-[#F8F4ED] px-6 py-6 shadow-[0_30px_90px_rgba(26,60,52,0.12)]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                  Sipariş özeti
                </p>
                <h2 className="text-2xl font-serif text-[#1A3C34]">
                  Ödeme öncesi
                </h2>
              </div>
              <div className="space-y-3 text-sm text-[#5C5C5C]">
                <div className="flex items-center justify-between">
                  <span>Ürün adedi</span>
                  <span className="font-semibold text-[#1A3C34]">{totalQuantity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Ara toplam</span>
                  <span className="font-semibold text-[#1A3C34]">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
                <div className="rounded-2xl bg-[#F3EEE3] px-3 py-2 text-xs text-[#7C6A48]">
                  Kargo ve vergiler ödeme sayfasında eklenir.
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-[#E4DAC9] pt-4 text-lg font-semibold text-[#1A3C34]">
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
