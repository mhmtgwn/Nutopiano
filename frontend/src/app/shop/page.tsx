import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Mağaza | Nutopiano',
  robots: { index: false, follow: true },
};

export default function ShopPage() {
  redirect('/categories');
}
