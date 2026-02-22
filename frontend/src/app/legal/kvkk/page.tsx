import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KVKK | Nutopiano',
  description: 'Nutopiano KVKK aydinlatma metni ve veri isleme esaslari.',
};

export default function KvkkPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Üretim Güvencesi</h1>
      <p className="mt-4 text-sm text-[var(--neutral-600)]">
        Bu sayfa yakında güncellenecektir.
      </p>
    </main>
  );
}
