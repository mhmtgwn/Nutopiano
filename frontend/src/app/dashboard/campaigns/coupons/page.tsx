/* eslint-disable react/no-unescaped-entities */

export default function SellerCouponsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
          Satıcı
        </p>
        <h1 className="mt-2 text-2xl font-serif text-[var(--primary-800)]">Kuponlar</h1>
        <p className="mt-2 text-sm text-[var(--neutral-600)]">
          Bu ekran Faz 1 için iskelet olarak hazır. Sonraki adımda kupon backend endpoint'leri eklenip listeleme/CRUD yapılacak.
        </p>
      </div>

      <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
          Durum
        </p>
        <p className="mt-2 text-sm text-[var(--neutral-600)]">Henüz backend endpoint'i yok.</p>
      </div>
    </div>
  );
}
