export const CHUNK_RELOAD_KEY = '__nutopiano_chunk_reload_once__';
export const EARLY_CHUNK_RELOAD_KEY = '__nutopiano_early_chunk_reload_once__';
export const CHUNK_RECOVERY_QUERY_KEY = '__np_chunk_recover';
const CHUNK_RECOVERY_TTL_MS = 30_000;

export const isChunkLoadErrorText = (text: string) => {
  const normalized = text.toLowerCase();
  return (
    normalized.includes('chunkloaderror') ||
    normalized.includes('loading chunk') ||
    normalized.includes('failed to fetch dynamically imported module')
  );
};

export const getChunkErrorText = (value: unknown) => {
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

const safeSessionStorageGet = (key: string) => {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSessionStorageSet = (key: string, value: string) => {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // no-op
  }
};

const safeSessionStorageRemove = (key: string) => {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // no-op
  }
};

export const clearChunkRecoveryMarkers = () => {
  if (typeof window === 'undefined') return;
  safeSessionStorageRemove(CHUNK_RELOAD_KEY);
  safeSessionStorageRemove(EARLY_CHUNK_RELOAD_KEY);
};

export const scheduleChunkRecoveryMarkerCleanup = () => {
  if (typeof window === 'undefined') return 0;
  return window.setTimeout(() => {
    clearChunkRecoveryMarkers();
  }, CHUNK_RECOVERY_TTL_MS);
};

const clearClientCaches = async () => {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map((registration) => registration.unregister().catch(() => false)),
    );
  }

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(
          (key) =>
            key.startsWith('nutopiano-') ||
            key.startsWith('workbox-') ||
            key.startsWith('next-'),
        )
        .map((key) => caches.delete(key).catch(() => false)),
    );
  }
};

const buildRecoveryUrl = () => {
  const url = new URL(window.location.href);
  url.searchParams.set(CHUNK_RECOVERY_QUERY_KEY, Date.now().toString());
  return url.toString();
};

export const stripChunkRecoveryQueryParam = () => {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(CHUNK_RECOVERY_QUERY_KEY)) return;
  url.searchParams.delete(CHUNK_RECOVERY_QUERY_KEY);
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, '', next);
};

export const recoverFromChunkError = async (flagKey = CHUNK_RELOAD_KEY) => {
  if (typeof window === 'undefined') return false;
  if (safeSessionStorageGet(flagKey) === '1') return false;

  safeSessionStorageSet(flagKey, '1');
  safeSessionStorageRemove(EARLY_CHUNK_RELOAD_KEY);

  await clearClientCaches().catch(() => undefined);
  window.location.replace(buildRecoveryUrl());
  return true;
};
