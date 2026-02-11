'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '@/components/common/Button';
import CheckoutStepper from '@/components/checkout/CheckoutStepper';
import { useAppDispatch, useAppSelector } from '@/store';
import { clearCart } from '@/store/cartSlice';
import api from '@/services/api';
import { formatPrice } from '@/utils/helpers';

const resolveApiErrorMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== 'object') return fallback;
  if (!('response' in error)) return fallback;
  const response = (error as { response?: unknown }).response;
  if (!response || typeof response !== 'object') return fallback;
  if (!('data' in response)) return fallback;
  const data = (response as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return fallback;
  if (!('message' in data)) return fallback;
  const message = (data as { message?: unknown }).message;
  if (Array.isArray(message)) {
    return message.map(String).join(', ');
  }
  if (typeof message === 'string') return message;
  return fallback;
};

interface CreateOrderItemPayload {
  productId: number;
  quantity: number;
}

interface CreateOrderPayload {
  customerId: number;
  notes?: string;
  items: CreateOrderItemPayload[];
}

interface FieldErrors {
  customerId?: string;
  phone?: string;
}

const PHONE_PATTERN = /^(?:\+?90|0)?5\d{9}$/;
const normalizePhone = (value: string) => value.replace(/[^\d+]/g, '');

export default function CheckoutPage() {
  const { items, totalPrice, totalQuantity } = useAppSelector(
    (state) => state.cart,
  );
  const isAuthenticated = useAppSelector(
    (state) => state.user.status === 'authenticated',
  );
  const dispatch = useAppDispatch();
  const router = useRouter();

  const [customerId, setCustomerId] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<{
    orderId?: number;
    total?: number;
  } | null>(null);

  const hasItems = items.length > 0;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!hasItems) {
      const message = 'Sepetiniz boş. Ödeme adımına geçmeden önce ürün ekleyin.';
      setFormError(message);
      toast.error(message);
      return;
    }

    const nextErrors: FieldErrors = {};
    const parsedCustomerId = Number(customerId);
    const normalizedPhone = normalizePhone(phone);

    if (!parsedCustomerId || Number.isNaN(parsedCustomerId) || parsedCustomerId < 1) {
      nextErrors.customerId = 'Lütfen geçerli bir müşteri ID girin.';
    }

    if (!normalizedPhone) {
      nextErrors.phone = 'Telefon numarası zorunludur.';
    } else if (!PHONE_PATTERN.test(normalizedPhone)) {
      nextErrors.phone = 'Telefon formatı geçersiz. Örn: 5XXXXXXXXX veya +90 5XXXXXXXXX';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    const combinedNotes = [
      normalizedPhone ? `Telefon: ${normalizedPhone}` : null,
      notes.trim() || null,
    ]
      .filter(Boolean)
      .join('\n');

    const payload: CreateOrderPayload = {
      customerId: parsedCustomerId,
      notes: combinedNotes || undefined,
      items: items.map((item) => ({
        productId: Number(item.productId),
        quantity: item.quantity,
      })),
    };

    try {
      setIsSubmitting(true);
      const response = await api.post('/orders', payload);

      const orderId = (response.data && (response.data.id as number | undefined)) ?? undefined;

      toast.success('Sipariş başarıyla oluşturuldu.');
      setOrderSuccess({
        orderId,
        total: totalPrice,
      });
      dispatch(clearCart());
    } catch (error: unknown) {
      const message = resolveApiErrorMessage(
        error,
        'Sipariş oluşturulurken bir hata oluştu.',
      );

      setFormError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-[#F7F4EF]">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 md:px-6 md:py-14">
          <header className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
              Nutopiano Shop
            </p>
            <h1 className="text-4xl font-serif text-[#1A3C34] md:text-5xl">
              Siparişiniz onaylandı
            </h1>
            <p className="text-sm text-[#5C5C5C] md:text-base">
              Siparişiniz hazırlanıyor. Detayları aşağıda bulabilirsiniz.
            </p>
          </header>

          <CheckoutStepper currentStep={3} />

          <section className="space-y-5 rounded-[36px] border border-[#D9CEBD] bg-white/90 px-6 py-7 shadow-[0_30px_90px_rgba(26,60,52,0.12)] md:px-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="mt-1 h-6 w-6 text-[#C5A059]" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                    Durum
                  </p>
                  <h2 className="text-2xl font-serif text-[#1A3C34]">
                    Siparişiniz alındı
                  </h2>
                  <p className="text-sm text-[#5C5C5C] md:text-base">
                    Ekibimiz siparişinizi hazırlıyor, teslimat bilgisini paylaşacağız.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-[#E5DACB] bg-white px-4 py-3 text-sm text-[#1A3C34]">
                {orderSuccess.orderId && (
                  <p className="font-semibold">Sipariş No: #{orderSuccess.orderId}</p>
                )}
                {typeof orderSuccess.total === 'number' && (
                  <p className="text-xs text-[#5C5C5C]">
                    Toplam: {formatPrice(orderSuccess.total)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/account/orders">
                <Button className="rounded-full px-6">Siparişlerime git</Button>
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#1A3C34]/70 hover:text-[#1A3C34]"
              >
                Alışverişe devam et <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (!hasItems) {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-[#F7F4EF]">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-8 md:px-6 md:py-14">
          <header className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
              Checkout
            </p>
            <h1 className="text-4xl font-serif text-[#1A3C34] md:text-5xl">
              Ödeme adımı
            </h1>
            <p className="text-sm text-[#5C5C5C] md:text-base">
              Sepetiniz boş görünüyor. Ödeme akışına geçmek için ürün ekleyin.
            </p>
          </header>

          <CheckoutStepper currentStep={0} />

          <section className="space-y-4 rounded-[32px] border border-[#E0D7C6] bg-white/95 px-6 py-7 shadow-md backdrop-blur">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                Sepet durumu
              </p>
              <h2 className="text-2xl font-serif text-[#1A3C34]">Sepetiniz boş</h2>
              <p className="text-sm text-[#5C5C5C] md:text-base">
                Ödeme akışına geçmek için önce sepetinize ürün ekleyin.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/products">
                <Button className="rounded-full px-6">Shop now</Button>
              </Link>
              <Link
                href="/cart"
                className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1A3C34]/70 hover:text-[#1A3C34]"
              >
                Sepete git
              </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#F7F4EF]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-6 md:py-14">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
              Nutopiano Shop
            </p>
            <h1 className="text-4xl font-serif text-[#1A3C34] md:text-5xl">Checkout</h1>
            <p className="text-sm text-[#5C5C5C] md:text-base">
              Teslimat ve ödeme bilgilerini girin, ardından siparişi oluşturun.
            </p>
          </div>
          <div className="rounded-full border border-[#1A3C34]/15 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1A3C34] shadow-sm">
            Sepet: {totalQuantity} ürün
          </div>
        </header>

        <section className="rounded-[40px] border border-[#1A3C34]/10 bg-gradient-to-br from-[#FFF9E6] via-white to-[#F3FAF5] px-6 py-8 shadow-[0_40px_120px_rgba(26,60,52,0.12)] md:px-10">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:items-center">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                Teslimat planı
              </p>
              <h2 className="text-2xl font-serif text-[#1A3C34] md:text-3xl">
                Adım adım güvenli ödeme
              </h2>
              <p className="text-sm text-[#5C5C5C] md:text-base">
                Sepet → Müşteri → Ödeme → Onay akışıyla hızlıca ilerleyin.
              </p>
              <div className="flex flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#1A3C34]/80">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#1A3C34]/15 bg-white px-4 py-2">
                  <ShieldCheck className="h-4 w-4" /> Güvenli ödeme
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#1A3C34]/15 bg-white px-4 py-2">
                  <Truck className="h-4 w-4" /> Hızlı teslimat
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#1A3C34]/15 bg-white px-4 py-2">
                  <Sparkles className="h-4 w-4" /> Kişisel destek
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
                href="/cart"
                className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#1A3C34]/70 hover:text-[#1A3C34]"
              >
                Sepeti güncelle <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <CheckoutStepper currentStep={2} />

        <section className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-[36px] border border-[#E0D7C6] bg-white/95 px-6 py-6 shadow-[0_30px_90px_rgba(26,60,52,0.12)]"
          >
            {formError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                {formError}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                Müşteri bilgileri
              </p>
              <h2 className="text-2xl font-serif text-[#1A3C34]">
                Teslimat detayları
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label
                  htmlFor="customerId"
                  className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]"
                >
                  Müşteri ID
                </label>
                <input
                  id="customerId"
                  type="number"
                  min={1}
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value);
                    if (fieldErrors.customerId) {
                      setFieldErrors((prev) => ({ ...prev, customerId: undefined }));
                    }
                  }}
                  className={`h-11 w-full rounded-2xl border bg-white px-3 text-sm text-[#1A3C34] shadow-sm outline-none focus-visible:ring-2 md:h-11 ${fieldErrors.customerId
                      ? 'border-red-300 focus-visible:border-red-400 focus-visible:ring-red-200'
                      : 'border-[#E5E5E0] focus-visible:border-[#1A3C34] focus-visible:ring-[#C4E5D0]'
                    }`}
                  placeholder="Örn: 1"
                  required
                  aria-invalid={!!fieldErrors.customerId}
                />
                {fieldErrors.customerId ? (
                  <p className="text-[11px] text-red-600 md:text-xs">
                    {fieldErrors.customerId}
                  </p>
                ) : (
                  <p className="text-[11px] text-[#8A8A8A] md:text-xs">
                    Backend tarafında kayıtlı bir müşteri kimliği olmalıdır. Gerekirse test için
                    1 değerini kullanabilirsiniz.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="phone"
                  className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]"
                >
                  Müşteri telefonu
                </label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (fieldErrors.phone) {
                      setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                    }
                  }}
                  className={`h-11 w-full rounded-2xl border bg-white px-3 text-sm text-[#1A3C34] shadow-sm outline-none focus-visible:ring-2 md:h-11 ${fieldErrors.phone
                      ? 'border-red-300 focus-visible:border-red-400 focus-visible:ring-red-200'
                      : 'border-[#E5E5E0] focus-visible:border-[#1A3C34] focus-visible:ring-[#C4E5D0]'
                    }`}
                  placeholder="5XXXXXXXXX"
                  required
                  aria-invalid={!!fieldErrors.phone}
                />
                {fieldErrors.phone ? (
                  <p className="text-[11px] text-red-600 md:text-xs">{fieldErrors.phone}</p>
                ) : (
                  <p className="text-[11px] text-[#8A8A8A] md:text-xs">
                    Telefon numarası satış sonrası iletişim için kullanılır.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="notes"
                className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]"
              >
                Notlar (isteğe bağlı)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-[#E5E5E0] bg-white px-3 py-3 text-sm text-[#1A3C34] shadow-sm outline-none focus-visible:border-[#1A3C34] focus-visible:ring-2 focus-visible:ring-[#C4E5D0]"
                placeholder="Teslimat veya sipariş ile ilgili notlarınızı ekleyin."
              />
            </div>

            <div className="rounded-2xl border border-[#F1E7D8] bg-[#FFFBF5] px-4 py-3 text-[11px] text-[#7C6A48]">
              Sipariş oluşturulduktan sonra destek ekibimiz ödeme ve teslimat detaylarını
              sizinle kesinleştirir.
            </div>

            <div className="pt-1">
              <Button
                type="submit"
                className="w-full rounded-full py-3 text-base"
                disabled={isSubmitting}
                isLoading={isSubmitting}
              >
                Siparişi oluştur
              </Button>
            </div>
          </form>

          <aside className="space-y-5 rounded-[36px] border border-[#CAB89A] bg-gradient-to-b from-white to-[#F8F4ED] px-6 py-6 shadow-[0_30px_90px_rgba(26,60,52,0.12)]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                Sipariş özeti
              </p>
              <h2 className="text-2xl font-serif text-[#1A3C34]">Kontrol edin</h2>
            </div>
            <div className="space-y-3 text-sm text-[#5C5C5C]">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between gap-2 rounded-2xl bg-[#F7F2EA] px-3 py-2"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[#1A3C34] md:text-sm">
                      {item.name}
                    </span>
                    <span className="text-[11px] md:text-xs">
                      {item.quantity} x {formatPrice(item.price)}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[#1A3C34] md:text-sm">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-[#E4DAC9] bg-white px-4 py-3 text-sm text-[#5C5C5C]">
              Kargo ve vergiler son adımda eklenir. Sipariş özeti sadece ürün tutarını gösterir.
            </div>
            <div className="border-t border-[#E4DAC9] pt-4 text-lg font-semibold text-[#1A3C34]">
              <div className="flex items-center justify-between">
                <span>Toplam</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
            </div>
            <p className="text-[11px] text-[#8A8A8A] md:text-xs">
              Ödeme işlemi backend tarafındaki sipariş ve ödeme akışına göre yönetilecektir.
              Bu adım siparişi oluşturur ve toplam tutarı kaydeder.
            </p>
          </aside>
        </section>
      </div>
    </div>
  );
}
