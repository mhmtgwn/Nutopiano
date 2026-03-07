import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mesafeli Satis Sozlesmesi | Nutopiano",
  description: "Nutopiano mesafeli satis sozlesmesi metni.",
};

export default function DistanceSalesPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="rounded-3xl border border-[var(--neutral-200)] bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--neutral-500)]">
          Nutopiano
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[var(--primary-800)]">
          Mesafeli Satış Sözleşmesi Özeti
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--neutral-600)]">
          Son güncelleme: 7 Mart 2026. Bu sayfa, Nutopiano üzerinden verilen
          siparişlerde geçerli temel mesafeli satış şartlarını özetler.
          Siparişin tamamlanması ile birlikte kullanıcı, ödeme ve teslimat
          adımlarında sunulan güncel koşulları kabul etmiş sayılır.
        </p>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-[var(--primary-800)]">
            Sipariş ve ödeme
          </h2>
          <p className="text-sm leading-6 text-[var(--neutral-700)]">
            Sipariş, kullanıcı tarafından ödeme onayı verildiğinde oluşur. Ürün
            veya hizmete ait fiyat, vergi, teslimat ve varsa ek ücretler ödeme
            öncesinde kullanıcıya gösterilir.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-[var(--primary-800)]">
            Teslimat ve ifa
          </h2>
          <p className="text-sm leading-6 text-[var(--neutral-700)]">
            Fiziksel ürünlerde teslimat süresi, sipariş ekranında ve ilgili
            satıcı bilgisinde belirtilen operasyon planına göre yürütülür.
            Dijital içerik, rezervasyon veya hizmet tipindeki siparişlerde ifa
            şartları ilgili ürün açıklamasında gösterilir.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-[var(--primary-800)]">
            Cayma, iptal ve iade
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--neutral-700)]">
            <li>
              Cayma hakkı bulunan işlemlerde kullanıcı, mevzuattaki süreler
              içinde talep oluşturabilir.
            </li>
            <li>
              Hijyen, kişiselleştirme veya anında ifa edilen dijital hizmetlerde
              istisnalar uygulanabilir.
            </li>
            <li>
              İade ve iptal süreci ödeme aracına ve satıcı operasyonuna göre
              takip edilir.
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-[var(--primary-800)]">
            Uyuşmazlık yönetimi
          </h2>
          <p className="text-sm leading-6 text-[var(--neutral-700)]">
            Sipariş, teslimat veya iade süreçleriyle ilgili talepler öncelikle
            Nutopiano destek kanalları üzerinden alınır. Mevzuat kapsamındaki
            parasal sınırlar dahilinde tüketici hakem heyeti veya tüketici
            mahkemesi başvuru yolları saklıdır.
          </p>
        </section>
      </div>
    </main>
  );
}
