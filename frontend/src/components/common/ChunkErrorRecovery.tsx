'use client';

import { useEffect } from 'react';
import {
  getChunkErrorText,
  isChunkLoadErrorText,
  recoverFromChunkError,
  scheduleChunkRecoveryMarkerCleanup,
  stripChunkRecoveryQueryParam,
} from '@/lib/chunk-recovery';

export default function ChunkErrorRecovery() {
  useEffect(() => {
    stripChunkRecoveryQueryParam();
    const clearMarkerTimeout = scheduleChunkRecoveryMarkerCleanup();

    const onWindowError = (event: ErrorEvent) => {
      const combinedText = `${event.message} ${event.filename}`;
      if (isChunkLoadErrorText(combinedText)) {
        void recoverFromChunkError();
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const text = getChunkErrorText(event.reason);
      if (isChunkLoadErrorText(text)) {
        void recoverFromChunkError();
      }
    };

    window.addEventListener('error', onWindowError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      if (clearMarkerTimeout) {
        window.clearTimeout(clearMarkerTimeout);
      }
      window.removeEventListener('error', onWindowError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}
