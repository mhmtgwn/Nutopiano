import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Magaza | Nutopiano',
  robots: { index: false, follow: true },
};

export default function MagazaPage() {
  redirect('/categories');
}
