import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gizlilik Politikasi | Nutopiano",
  description: "Nutopiano gizlilik politikasi ve KVKK bilgilendirmesi.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="rounded-3xl border border-[var(--neutral-200)] bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--neutral-500)]">
          Nutopiano
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[var(--primary-800)]">
          Gizlilik Politikası
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--neutral-600)]">
          Son güncelleme: 7 Mart 2026. Bu metin, Nutopiano üzerinde sunulan
          üyelik, sipariş, ödeme, panel ve destek süreçlerinde işlenen verilerin
          hangi amaçlarla kullanıldığını özetler.
        </p>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-[var(--primary-800)]">
            Hangi verileri işleriz
          </h2>
          <p className="text-sm leading-6 text-[var(--neutral-700)]">
            Hesap oluşturma ve giriş sırasında kimlik, iletişim ve oturum
            verileri; sipariş ve ödeme süreçlerinde teslimat, faturalama ve
            işlem verileri; destek taleplerinde ise mesaj kayıtları ve talep
            geçmişi işlenebilir.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-[var(--primary-800)]">
            İşleme amaçları
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--neutral-700)]">
            <li>Üyelik, giriş, güvenlik ve oturum yönetimini sağlamak.</li>
            <li>Sipariş, ödeme, teslimat ve iade süreçlerini yürütmek.</li>
            <li>
              Satıcı, müşteri ve yönetim panellerinde yetki ve işlem kayıtlarını
              tutmak.
            </li>
            <li>
              Dolandırıcılık, kötüye kullanım ve teknik arızaları tespit etmek.
            </li>
            <li>
              Mevzuattan doğan saklama, muhasebe ve raporlama yükümlülüklerini
              yerine getirmek.
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-[var(--primary-800)]">
            Saklama ve paylaşım
          </h2>
          <p className="text-sm leading-6 text-[var(--neutral-700)]">
            Veriler yalnızca hizmetin çalışması için gerekli süre boyunca ve
            ilgili mevzuatın zorunlu kıldığı kayıt süreleri kadar saklanır.
            Ödeme kuruluşları, lojistik sağlayıcılar, e-posta veya SMS hizmet
            sağlayıcıları ve yasal merciler ile yalnızca gerekli kapsamda
            paylaşım yapılır.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-[var(--primary-800)]">
            Haklarınız
          </h2>
          <p className="text-sm leading-6 text-[var(--neutral-700)]">
            Hesabınızla ilgili erişim, düzeltme, silme, işleme itiraz ve veri
            taşınabilirliği taleplerinizi Nutopiano destek kanalları üzerinden
            iletebilirsiniz. Talepler, kimlik doğrulaması sonrasında ve
            mevzuatın izin verdiği ölçüde sonuçlandırılır.
          </p>
        </section>
      </div>
    </main>
  );
}
