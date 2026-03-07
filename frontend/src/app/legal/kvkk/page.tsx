import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KVKK | Nutopiano",
  description: "Nutopiano KVKK aydinlatma metni ve veri isleme esaslari.",
};

export default function KvkkPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="rounded-3xl border border-[var(--neutral-200)] bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--neutral-500)]">
          Nutopiano
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[var(--primary-800)]">
          KVKK Aydınlatma Metni
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--neutral-600)]">
          Son güncelleme: 7 Mart 2026. Bu metin, 6698 sayılı Kişisel Verilerin
          Korunması Kanunu kapsamında Nutopiano tarafından yürütülen veri işleme
          faaliyetlerine ilişkin temel bilgilendirmeyi içerir.
        </p>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-[var(--primary-800)]">
            Veri kategorileri
          </h2>
          <p className="text-sm leading-6 text-[var(--neutral-700)]">
            Kimlik, iletişim, müşteri işlem, sipariş, finans, oturum güvenliği,
            destek kayıtları ve panel kullanım logları hizmetin kapsamına göre
            işlenebilir.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-[var(--primary-800)]">
            Hukuki sebepler
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--neutral-700)]">
            <li>Sözleşmenin kurulması ve ifası.</li>
            <li>Hukuki yükümlülüklerin yerine getirilmesi.</li>
            <li>Bir hakkın tesisi, kullanılması veya korunması.</li>
            <li>
              Meşru menfaat kapsamında güvenlik, denetim ve operasyon yönetimi.
            </li>
            <li>Açık rıza gereken hallerde ilgili kişinin onayı.</li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-[var(--primary-800)]">
            Aktarım ve güvenlik
          </h2>
          <p className="text-sm leading-6 text-[var(--neutral-700)]">
            Kişisel veriler; ödeme, teslimat, bildirim, altyapı ve yasal
            yükümlülüklerin yerine getirilmesi amacıyla sınırlı olarak hizmet
            sağlayıcılara ve yetkili kamu kurumlarına aktarılabilir. Erişim
            kontrolü, loglama, şifreleme ve yetki yönetimi gibi teknik ve idari
            tedbirler uygulanır.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-[var(--primary-800)]">
            İlgili kişi başvuruları
          </h2>
          <p className="text-sm leading-6 text-[var(--neutral-700)]">
            KVKK kapsamındaki başvurularınızı Nutopiano destek kanalları
            üzerinden iletebilirsiniz. Başvurular, kimlik doğrulamasının
            ardından yasal sürelerde değerlendirilir ve mevzuatın izin verdiği
            kapsamda cevaplanır.
          </p>
        </section>
      </div>
    </main>
  );
}
