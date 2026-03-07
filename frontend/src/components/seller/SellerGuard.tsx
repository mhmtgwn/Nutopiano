'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import Spinner from '@/components/common/Spinner';
import { isUserSessionIncomplete, mapProfileToUser } from '@/lib/profile-session';
import api from '@/services/api';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout, setAuthError, setCredentials, startAuth } from '@/store/userSlice';
import { isSellerPanelRole, isSellerStaffRole } from '@/lib/role-routing';
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
  if (Array.isArray(message)) return message.map(String).join(', ');
  if (typeof message === 'string') return message;
  return fallback;
};

interface SellerGuardProps {
  children: ReactNode;
}

type StaffPanelAccess = {
  canDashboardOrders: boolean;
  canPos: boolean;
};

const isUserAllowedDashboardPath = (pathname: string) =>
  pathname === '/dashboard/orders' || pathname.startsWith('/dashboard/orders/');

const resolveStaffPanelAccess = (permissions?: string[]): StaffPanelAccess => {
  const set = new Set(
    Array.isArray(permissions)
      ? permissions.map((permission) => String(permission ?? '').trim().toLowerCase())
      : [],
  );

  const canDashboardOrders = [
    'orders.view',
    'orders.create',
    'orders.edit',
    'orders.status_update',
    'orders.cancel',
    'orders.return.process',
  ].some((permission) => set.has(permission));

  const canPos = ['pos.sales', 'pos.orders', 'pos.reports'].some((permission) =>
    set.has(permission),
  );

  return {
    canDashboardOrders,
    canPos,
  };
};

export default function SellerGuard({ children }: SellerGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { user, status } = useAppSelector((state) => state.user);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const isLoading = isLoadingProfile || status === 'authenticating';
  const hasStableUser = Boolean(user && !isUserSessionIncomplete(user));

  useEffect(() => {
    const activeUser = user && !isUserSessionIncomplete(user) ? user : null;

    if (activeUser) {
      if (!isSellerPanelRole(activeUser.role)) {
        router.replace('/forbidden');
        toast.error('Bu sayfaya erişim için panel yetkisi gerekli.');
        return;
      }
      if (isSellerStaffRole(activeUser.role)) {
        const staffAccess = resolveStaffPanelAccess(activeUser.permissions);
        if (!staffAccess.canDashboardOrders && !staffAccess.canPos) {
          router.replace('/forbidden');
          toast.error('Bu hesap icin seller panel yetkisi atanmis degil.');
          return;
        }
        if (pathname === '/dashboard') {
          router.replace(staffAccess.canDashboardOrders ? '/dashboard/orders' : '/pos');
          return;
        }
        if (!staffAccess.canDashboardOrders && isUserAllowedDashboardPath(pathname)) {
          router.replace('/forbidden');
          toast.error('Siparis ekrani icin gerekli yetki bulunmuyor.');
          return;
        }
        if (!isUserAllowedDashboardPath(pathname)) {
          router.replace('/forbidden');
          toast.error('Bu sekme sadece yetkili satici personeline aciktir.');
        }
      }
      return;
    }

    let isCancelled = false;

    const fetchProfile = async () => {
      try {
        setIsLoadingProfile(true);
        dispatch(startAuth());

        const response = await api.get<ProfileResponse>('/auth/profile');
        const nextUser = mapProfileToUser(response.data);

        if (isCancelled) return;

        dispatch(
          setCredentials({
            user: nextUser,
            token: null,
          }),
        );

        if (!isSellerPanelRole(nextUser.role)) {
          router.replace('/forbidden');
          toast.error('Bu sayfaya erişim için panel yetkisi gerekli.');
          return;
        }
        if (isSellerStaffRole(nextUser.role)) {
          const staffAccess = resolveStaffPanelAccess(nextUser.permissions);
          if (!staffAccess.canDashboardOrders && !staffAccess.canPos) {
            router.replace('/forbidden');
            toast.error('Bu hesap icin seller panel yetkisi atanmis degil.');
            return;
          }
          if (pathname === '/dashboard') {
            router.replace(staffAccess.canDashboardOrders ? '/dashboard/orders' : '/pos');
            return;
          }
          if (!staffAccess.canDashboardOrders && isUserAllowedDashboardPath(pathname)) {
            router.replace('/forbidden');
            toast.error('Siparis ekrani icin gerekli yetki bulunmuyor.');
            return;
          }
          if (!isUserAllowedDashboardPath(pathname)) {
            router.replace('/forbidden');
            toast.error('Bu sekme sadece yetkili satici personeline aciktir.');
          }
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

  if (!user || !isSellerPanelRole(user.role)) {
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
