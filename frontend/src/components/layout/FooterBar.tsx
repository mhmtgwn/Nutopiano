import Link from 'next/link';
import {
  ArrowUpRight,
  BookOpen,
  Bookmark,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from 'lucide-react';

export default function FooterBar() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-[#d8d1c2] bg-gradient-to-b from-[#f2ead8] via-[#efe4cf] to-[#e7dac1] text-[#3f3222]">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
        <div className="overflow-hidden rounded-[30px] border border-[#ccbfa8] bg-gradient-to-b from-[#fffdf7] to-[#f7eedf] shadow-[0_18px_40px_rgba(69,50,31,0.16)]">
          <div className="grid gap-0 lg:grid-cols-[1.3fr_1fr]">
            <section className="border-b border-[#e4d7c0] p-6 lg:border-b-0 lg:border-r lg:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d6c8af] bg-[#f9f2e4] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7b6646]">
                <BookOpen className="h-3.5 w-3.5" />
                Nutopiano Book
              </div>
              <h2 className="mt-4 text-3xl font-serif leading-tight text-[#2e2418] md:text-4xl">
                Her sipariş bir bölüm,
                <br />
                her mağaza bir hikaye.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#5a4832] md:text-base">
                Bu sayfa seller, checkout ve POS akışını klasik bir editöryal düzene taşıyor.
                Görsel gürültü yerine okunaklı bölümler ve güçlü başlık hiyerarşisi kullanıyoruz.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full border border-[#d5c5aa] bg-[#fff9ed] px-3 py-1 font-semibold text-[#6c5538]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Üretim garantisi
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#d5c5aa] bg-[#fff9ed] px-3 py-1 font-semibold text-[#6c5538]">
                  <Bookmark className="h-3.5 w-3.5" />
                  Küratörlü koleksiyon
                </span>
              </div>
            </section>

            <section className="grid gap-0 sm:grid-cols-2">
              <div className="border-b border-[#e4d7c0] p-6 sm:border-b-0 sm:border-r sm:p-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8f7a5f]">
                  Bölümler
                </p>
                <div className="mt-4 space-y-2 text-sm">
                  <Link href="/categories" className="group flex items-center justify-between rounded-lg px-2 py-1.5 transition hover:bg-[#f5ebd9]">
                    Kategoriler <ArrowUpRight className="h-4 w-4 text-[#a08156] group-hover:text-[#6a5236]" />
                  </Link>
                  <Link href="/products" className="group flex items-center justify-between rounded-lg px-2 py-1.5 transition hover:bg-[#f5ebd9]">
                    Ürünler <ArrowUpRight className="h-4 w-4 text-[#a08156] group-hover:text-[#6a5236]" />
                  </Link>
                  <Link href="/checkout" className="group flex items-center justify-between rounded-lg px-2 py-1.5 transition hover:bg-[#f5ebd9]">
                    Checkout <ArrowUpRight className="h-4 w-4 text-[#a08156] group-hover:text-[#6a5236]" />
                  </Link>
                  <Link href="/account/orders" className="group flex items-center justify-between rounded-lg px-2 py-1.5 transition hover:bg-[#f5ebd9]">
                    Sipariş Takibi <ArrowUpRight className="h-4 w-4 text-[#a08156] group-hover:text-[#6a5236]" />
                  </Link>
                </div>
              </div>
              <div className="p-6 sm:p-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8f7a5f]">
                  İletişim
                </p>
                <div className="mt-4 space-y-2 text-sm text-[#57452f]">
                  <p className="inline-flex items-center gap-2">
                    <Phone className="h-4 w-4 text-[#8f734d]" />
                    +90 212 000 00 00
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <Mail className="h-4 w-4 text-[#8f734d]" />
                    info@nutopiano.com
                  </p>
                  <Link href="https://maps.app.goo.gl/" target="_blank" className="inline-flex items-center gap-2 transition hover:text-[#2f2518]">
                    <MapPin className="h-4 w-4 text-[#8f734d]" />
                    İstanbul / Türkiye
                  </Link>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Link href="https://instagram.com" target="_blank" aria-label="Instagram" className="rounded-full border border-[#d7c9b1] bg-[#fff9ec] p-2 transition hover:bg-[#f1e4ca]">
                    <Instagram className="h-4 w-4 text-[#6a5236]" />
                  </Link>
                  <Link href="https://facebook.com" target="_blank" aria-label="Facebook" className="rounded-full border border-[#d7c9b1] bg-[#fff9ec] p-2 transition hover:bg-[#f1e4ca]">
                    <Facebook className="h-4 w-4 text-[#6a5236]" />
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#d7c9af] pt-4 text-xs text-[#7a6446]">
          <p>© {year} Nutopiano. Tüm hakları saklıdır.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/legal/privacy" className="transition hover:text-[#302317]">
              KVKK & Gizlilik
            </Link>
            <Link href="/legal/distance-sales" className="transition hover:text-[#302317]">
              Mesafeli satış sözleşmesi
            </Link>
            <Link href="/legal/kvkk" className="transition hover:text-[#302317]">
              Kullanım koşulları
            </Link>
          </div>
        </div>
      </div>

      <Link
        href="https://wa.me/905551112233"
        target="_blank"
        className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-lg)] transition hover:scale-105 hover:shadow-[var(--shadow-xl)] z-50"
      >
        WhatsApp
      </Link>
    </footer>
  );
}
