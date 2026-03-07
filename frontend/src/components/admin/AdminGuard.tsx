'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import Spinner from '@/components/common/Spinner';
import { canAccessAdminRoute, createPanelAccessManifest } from '@/lib/panel-access';
import { fetchProfileResponse } from '@/lib/profile-api';
import { isUserSessionIncomplete, mapProfileToUser } from '@/lib/profile-session';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout, setAuthError, setCredentials } from '@/store/userSlice';
import { isSuperAdminRole } from '@/lib/role-routing';

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
  if (Array.isArray(message)) {
    return message.map(String).join(', ');
  }
  if (typeof message === 'string') return message;
  return fallback;
};

interface AdminGuardProps {
  children: ReactNode;
  requireSuperAdmin?: boolean;
}

export default function AdminGuard({
  children,
  requireSuperAdmin = false,
}: AdminGuardProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.user);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const stableUser = user && !isUserSessionIncomplete(user) ? user : null;
  const isLoading = isLoadingProfile;
  const manifest = useMemo(() => createPanelAccessManifest(stableUser), [stableUser]);
  const hasAccess = requireSuperAdmin
    ? isSuperAdminRole(stableUser?.role)
    : canAccessAdminRoute(manifest);
  const deniedMessage = requireSuperAdmin
    ? 'Bu sayfaya erişim için super admin yetkisi gerekli.'
    : 'Bu sayfaya erişim için admin yetkisi gerekli.';

  useEffect(() => {
    if (stableUser) {
      if (!hasAccess) {
        router.replace('/forbidden');
        toast.error(deniedMessage);
      }

      return;
    }

    const fetchProfile = async () => {
      try {
        setIsLoadingProfile(true);

        const nextUser = mapProfileToUser(await fetchProfileResponse());

        dispatch(
          setCredentials({
            user: nextUser,
            token: null,
          }),
        );

        if (
          (requireSuperAdmin && !isSuperAdminRole(nextUser.role)) ||
          (!requireSuperAdmin && !canAccessAdminRoute(createPanelAccessManifest(nextUser)))
        ) {
          router.replace('/forbidden');
          toast.error(deniedMessage);
        }
      } catch (error: unknown) {
        const message = resolveApiErrorMessage(error, 'Yetkilendirme başarısız.');

        dispatch(setAuthError(message));
        dispatch(logout());
        router.replace('/login');
      } finally {
        setIsLoadingProfile(false);
      }
    };

    void fetchProfile();
  }, [stableUser, dispatch, router, requireSuperAdmin, deniedMessage, hasAccess]);

  if (isLoading && !stableUser) {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
          <Spinner fullscreen label="Yetki kontrol ediliyor..." />
        </div>
      </div>
    );
  }

  if (!stableUser || !hasAccess) {
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
