'use client';

import { ReactNode, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Provider as ReduxProvider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { store } from '@/store';
import { loadCartState } from '@/store';
import { hydrateCart } from '@/store/cartSlice';
import AuthBootstrap from '@/components/auth/AuthBootstrap';

const ReactQueryDevtools = dynamic(
  () =>
    import('@tanstack/react-query-devtools').then(
      (mod) => mod.ReactQueryDevtools,
    ),
  { ssr: false },
);

const queryClient = new QueryClient();

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  useEffect(() => {
    const cart = loadCartState();
    if (cart) {
      store.dispatch(hydrateCart(cart));
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const syncServiceWorkerScope = async () => {
      const isPosRoute = window.location.pathname.startsWith('/pos');
      const registrations = await navigator.serviceWorker.getRegistrations();
      const isPosScope = (scope: string) => {
        try {
          return new URL(scope).pathname.startsWith('/pos');
        } catch {
          return false;
        }
      };

      // Remove old root-scoped workers that can cache stale HTML/chunks.
      await Promise.all(
        registrations
          .filter((registration) => {
            if (isPosRoute) {
              return !isPosScope(registration.scope);
            }
            return true;
          })
          .map((registration) => registration.unregister()),
      );

      if (isPosRoute) {
        await navigator.serviceWorker
          .register('/sw.js', { scope: '/pos' })
          .catch(() => undefined);
        return;
      }

      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => key.startsWith('nutopiano-pwa-'))
            .map((key) => caches.delete(key)),
        );
      }
    };

    syncServiceWorkerScope().catch(() => undefined);
  }, []);

  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <AuthBootstrap />
        {children}
        {process.env.NODE_ENV === 'development' ? (
          <ReactQueryDevtools initialIsOpen={false} />
        ) : null}
        <Toaster position="top-right" />
      </QueryClientProvider>
    </ReduxProvider>
  );
}
