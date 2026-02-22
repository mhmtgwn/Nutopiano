import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gizlilik Politikasi | Nutopiano',
  description: 'Nutopiano gizlilik politikasi ve KVKK bilgilendirmesi.',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">KVKK & Gizlilik</h1>
      <p className="mt-4 text-sm text-[var(--neutral-600)]">
        Bu sayfa yakında güncellenecektir.
      </p>
    </main>
  );
}
