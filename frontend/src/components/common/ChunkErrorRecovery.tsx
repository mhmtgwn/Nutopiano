'use client';

import { useEffect } from 'react';

const CHUNK_RELOAD_KEY = '__nutopiano_chunk_reload_once__';

const isChunkLoadErrorText = (text: string) => {
  const normalized = text.toLowerCase();
  return (
    normalized.includes('chunkloaderror') ||
    normalized.includes('loading chunk') ||
    normalized.includes('failed to fetch dynamically imported module')
  );
};

const getErrorText = (value: unknown) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Error) return `${value.name} ${value.message}`;
  if (typeof value === 'object') {
    const candidate = value as { message?: unknown; reason?: unknown };
    const message = typeof candidate.message === 'string' ? candidate.message : '';
    const reason = typeof candidate.reason === 'string' ? candidate.reason : '';
    return `${message} ${reason}`.trim();
  }
  return String(value);
};

const reloadOnceForChunkError = () => {
  if (typeof window === 'undefined') return;
  const alreadyReloaded = window.sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1';
  if (alreadyReloaded) return;
  window.sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
  window.location.reload();
};

export default function ChunkErrorRecovery() {
  useEffect(() => {
    const clearMarkerTimeout = window.setTimeout(() => {
      window.sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    }, 30_000);

    const onWindowError = (event: ErrorEvent) => {
      const combinedText = `${event.message} ${event.filename}`;
      if (isChunkLoadErrorText(combinedText)) {
        reloadOnceForChunkError();
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const text = getErrorText(event.reason);
      if (isChunkLoadErrorText(text)) {
        reloadOnceForChunkError();
      }
    };

    window.addEventListener('error', onWindowError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.clearTimeout(clearMarkerTimeout);
      window.removeEventListener('error', onWindowError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}
