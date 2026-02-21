'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Global error boundary:', error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-6xl flex-col items-start justify-center gap-4 px-4 py-10 md:px-6">
      <h1 className="text-2xl font-semibold text-[var(--primary-800)] md:text-3xl">
        Bir hata oluştu
      </h1>
      <p className="max-w-prose text-sm text-[var(--neutral-600)] md:text-base">
        Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-800)] px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white"
      >
        Tekrar dene
      </button>
    </main>
  );
}
