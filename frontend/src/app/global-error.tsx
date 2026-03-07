'use client';

import { useEffect } from 'react';
import {
  clearChunkRecoveryMarkers,
  isChunkLoadErrorText,
  recoverFromChunkError,
} from '@/lib/chunk-recovery';

export default function RootGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Root global error boundary:', error);

    if (typeof window === 'undefined') return;
    if (!isChunkLoadErrorText(`${error.name} ${error.message}`)) return;

    void recoverFromChunkError();
  }, [error]);

  const chunkError = isChunkLoadErrorText(`${error.name} ${error.message}`);

  return (
    <html lang="tr">
      <body>
        <main className="mx-auto flex min-h-screen max-w-6xl flex-col items-start justify-center gap-4 bg-white px-4 py-10 md:px-6">
          <h1 className="text-2xl font-semibold text-[var(--primary-800)] md:text-3xl">
            Bir hata olustu
          </h1>
          <p className="max-w-prose text-sm text-[var(--neutral-600)] md:text-base">
            {chunkError
              ? 'Uygulama yeni bir surume gecti. Sayfayi yenileyip tekrar deneyin.'
              : 'Beklenmeyen bir hata olustu. Lutfen tekrar deneyin.'}
          </p>
          <button
            type="button"
            onClick={() => {
              if (chunkError) {
                clearChunkRecoveryMarkers();
                void recoverFromChunkError();
                return;
              }
              reset();
            }}
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-800)] px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white"
          >
            {chunkError ? 'Sayfayi Yenile' : 'Tekrar dene'}
          </button>
        </main>
      </body>
    </html>
  );
}
