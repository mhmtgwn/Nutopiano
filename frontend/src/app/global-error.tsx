'use client';

import { useEffect } from 'react';

const CHUNK_RELOAD_KEY = '__nutopiano_chunk_reload_once__';

const isChunkLoadError = (error: Error | null | undefined) => {
  if (!error) return false;
  const text = `${error.name} ${error.message}`.toLowerCase();
  return (
    text.includes('chunkloaderror') ||
    text.includes('loading chunk') ||
    text.includes('failed to fetch dynamically imported module')
  );
};

export default function RootGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Root global error boundary:', error);

    if (typeof window === 'undefined') return;
    if (!isChunkLoadError(error)) return;

    const alreadyReloaded = window.sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1';
    if (alreadyReloaded) {
      window.sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      return;
    }

    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
    window.location.reload();
  }, [error]);

  const chunkError = isChunkLoadError(error);

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
                if (typeof window !== 'undefined') {
                  window.sessionStorage.removeItem(CHUNK_RELOAD_KEY);
                }
                window.location.reload();
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
