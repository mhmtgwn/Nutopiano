'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-6xl flex-col items-start justify-center gap-4 px-4 py-10 md:px-6">
      <h1 className="text-2xl font-semibold text-[var(--primary-800)] md:text-3xl">
        Sayfa bulunamadı
      </h1>
      <p className="max-w-prose text-sm text-[var(--neutral-600)] md:text-base">
        Aradığın sayfa kaldırılmış olabilir veya adres yanlış yazılmış olabilir.
      </p>
      <Link
        href="/"
        className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-800)] px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white"
      >
        Anasayfaya dön
      </Link>
    </main>
  );
}
