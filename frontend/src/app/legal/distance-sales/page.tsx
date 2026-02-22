import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mesafeli Satis Sozlesmesi | Nutopiano',
  description: 'Nutopiano mesafeli satis sozlesmesi metni.',
};

export default function DistanceSalesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Mesafeli Satış Sözleşmesi</h1>
      <p className="mt-4 text-sm text-[var(--neutral-600)]">
        Bu sayfa yakında güncellenecektir.
      </p>
    </main>
  );
}
