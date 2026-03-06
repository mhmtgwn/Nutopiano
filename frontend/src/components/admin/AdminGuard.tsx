'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout, setAuthError, setCredentials, startAuth } from '@/store/userSlice';
import { isAdminRole, isSuperAdminRole } from '@/lib/role-routing';
import type { ProfileResponse } from '@/types/profile';

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
  const { user, status } = useAppSelector((state) => state.user);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const isLoading = isLoadingProfile || status === 'authenticating';
  const hasAccess = (role?: string) =>
    requireSuperAdmin ? isSuperAdminRole(role) : isAdminRole(role);
  const deniedMessage = requireSuperAdmin
    ? 'Bu sayfaya erişim için super admin yetkisi gerekli.'
    : 'Bu sayfaya erişim için admin yetkisi gerekli.';

  useEffect(() => {
    if (user) {
      if (!hasAccess(user.role)) {
        router.replace('/forbidden');
        toast.error(deniedMessage);
      }

      return;
    }

    const fetchProfile = async () => {
      try {
        setIsLoadingProfile(true);
        dispatch(startAuth());

        const response = await api.get<ProfileResponse>('/auth/profile');
        const profile = response.data;

        dispatch(
          setCredentials({
            user: {
              id: profile.userId,
              name: profile.name,
              phone: profile.phone,
              email: profile.email,
              role: profile.role,
              effectiveRole: profile.effectiveRole,
              permissions: profile.permissions,
              panelHome: profile.panelHome,
              allowedPanels: profile.allowedPanels,
              featureStatuses: profile.featureStatuses,
              businessId: profile.businessId,
            },
            token: null,
          }),
        );

        if (!hasAccess(profile.role)) {
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

    fetchProfile();
  }, [user, dispatch, router, requireSuperAdmin]);

  if (isLoading && !user) {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
          <Spinner fullscreen label="Yetki kontrol ediliyor..." />
        </div>
      </div>
    );
  }

  if (!user || !hasAccess(user.role)) {
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
