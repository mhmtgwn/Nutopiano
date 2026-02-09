'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout, setAuthError, setCredentials, startAuth } from '@/store/userSlice';
import { getAuthToken, setAuthToken } from '@/utils/helpers';

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

interface ProfileResponse {
  userId: string;
  phone?: string;
  role: string;
  businessId?: string | null;
}

interface AdminGuardProps {
  children: ReactNode;
}

const isAdminRole = (role?: string) => role === 'ADMIN';

export default function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, status } = useAppSelector((state) => state.user);

  const token = useMemo(() => getAuthToken(), []);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const isLoading = isLoadingProfile || status === 'authenticating';

  useEffect(() => {
    if (!token) {
      router.replace('/login');
      return;
    }

    if (user) {
      if (!isAdminRole(user.role)) {
        router.replace('/');
        toast.error('Bu sayfaya erişim için admin yetkisi gerekli.');
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
              phone: profile.phone,
              role: profile.role,
              businessId: profile.businessId,
            },
            token,
          }),
        );

        if (!isAdminRole(profile.role)) {
          router.replace('/');
          toast.error('Bu sayfaya erişim için admin yetkisi gerekli.');
        }
      } catch (error: unknown) {
        const message = resolveApiErrorMessage(error, 'Yetkilendirme başarısız.');

        dispatch(setAuthError(message));
        setAuthToken(null);
        dispatch(logout());
        router.replace('/login');
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [token, user, dispatch, router]);

  if (!token) {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-[#F7F4EF]">
        <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
          <Spinner fullscreen label="Yönlendiriliyor..." />
        </div>
      </div>
    );
  }

  if (isLoading && !user) {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-[#F7F4EF]">
        <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
          <Spinner fullscreen label="Yetki kontrol ediliyor..." />
        </div>
      </div>
    );
  }

  if (!user || !isAdminRole(user.role)) {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-[#F7F4EF]">
        <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
          <Spinner fullscreen label="Yönlendiriliyor..." />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
