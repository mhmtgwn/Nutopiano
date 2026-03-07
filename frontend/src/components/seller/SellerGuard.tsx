'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import Spinner from '@/components/common/Spinner';
import {
  canAccessSellerPath,
  createPanelAccessManifest,
  resolveSellerRouteFallback,
} from '@/lib/panel-access';
import { fetchProfileResponse } from '@/lib/profile-api';
import { isUserSessionIncomplete, mapProfileToUser } from '@/lib/profile-session';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout, setAuthError, setCredentials } from '@/store/userSlice';

const resolveApiErrorMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== 'object') return fallback;
  if (!('response' in error)) return fallback;
  const response = (error as { response?: unknown }).response;
  if (!response || typeof response !== 'object') return fallback;
  if (!('data' in response)) return fallback;
  const data = (response as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return fallback;
  if (!('message' in data)) return fallback;
  const message = (data as { message?: unknown }).message;
  if (Array.isArray(message)) return message.map(String).join(', ');
  if (typeof message === 'string') return message;
  return fallback;
};

interface SellerGuardProps {
  children: ReactNode;
}

export default function SellerGuard({ children }: SellerGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.user);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const isLoading = isLoadingProfile;
  const hasStableUser = Boolean(user && !isUserSessionIncomplete(user));
  const manifest = createPanelAccessManifest(user);

  useEffect(() => {
    const activeUser = user && !isUserSessionIncomplete(user) ? user : null;

    if (activeUser) {
      const activeManifest = createPanelAccessManifest(activeUser);
      if (!activeManifest.sellerPanelEnabled) {
        router.replace('/forbidden');
        toast.error('Bu sayfaya erişim için panel yetkisi gerekli.');
        return;
      }
      if (pathname === '/dashboard') {
        const target = resolveSellerRouteFallback(activeManifest);
        if (target !== pathname) {
          router.replace(target);
          return;
        }
      }
      if (!canAccessSellerPath(activeManifest, pathname)) {
        router.replace(resolveSellerRouteFallback(activeManifest));
        toast.error('Bu seller modulu icin gerekli yetki bulunmuyor.');
      }
      return;
    }

    let isCancelled = false;

    const fetchProfile = async () => {
      try {
        setIsLoadingProfile(true);

        const nextUser = mapProfileToUser(await fetchProfileResponse());

        if (isCancelled) return;

        dispatch(
          setCredentials({
            user: nextUser,
            token: null,
          }),
        );

        const nextManifest = createPanelAccessManifest(nextUser);
        if (!nextManifest.sellerPanelEnabled) {
          router.replace('/forbidden');
          toast.error('Bu sayfaya erişim için panel yetkisi gerekli.');
          return;
        }
        if (pathname === '/dashboard') {
          const target = resolveSellerRouteFallback(nextManifest);
          if (target !== pathname) {
            router.replace(target);
            return;
          }
        }
        if (!canAccessSellerPath(nextManifest, pathname)) {
          router.replace(resolveSellerRouteFallback(nextManifest));
          toast.error('Bu seller modulu icin gerekli yetki bulunmuyor.');
        }
      } catch (error: unknown) {
        const message = resolveApiErrorMessage(error, 'Yetkilendirme başarısız.');
        dispatch(setAuthError(message));
        dispatch(logout());
        router.replace('/login');
      } finally {
        if (!isCancelled) {
          setIsLoadingProfile(false);
        }
      }
    };

    void fetchProfile();
    return () => {
      isCancelled = true;
    };
  }, [user, dispatch, router, pathname]);

  if (isLoading || !hasStableUser) {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
          <Spinner fullscreen label="Yetki kontrol ediliyor..." />
        </div>
      </div>
    );
  }

  if (!user || !manifest.sellerPanelEnabled) {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
          <Spinner fullscreen label="Yönlendiriliyor..." />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
