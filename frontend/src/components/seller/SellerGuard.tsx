'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout, setAuthError, setCredentials, startAuth } from '@/store/userSlice';

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

interface ProfileResponse {
  userId: string;
  name?: string;
  phone?: string;
  email?: string;
  role: string;
  businessId?: string | null;
}

interface SellerGuardProps {
  children: ReactNode;
}

const isSellerRole = (role?: string) =>
  role === 'ADMIN' ||
  role === 'STAFF' ||
  role === 'SELLER' ||
  role === 'SUPER_ADMIN';

export default function SellerGuard({ children }: SellerGuardProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, status } = useAppSelector((state) => state.user);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const isLoading = isLoadingProfile || status === 'authenticating';

  useEffect(() => {
    if (user) {
      if (!isSellerRole(user.role)) {
        router.replace('/');
        toast.error('Bu sayfaya erişim için panel yetkisi gerekli.');
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
              businessId: profile.businessId,
            },
            token: null,
          }),
        );

        if (!isSellerRole(profile.role)) {
          router.replace('/');
          toast.error('Bu sayfaya erişim için panel yetkisi gerekli.');
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
  }, [user, dispatch, router]);

  if (isLoading && !user) {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
          <Spinner fullscreen label="Yetki kontrol ediliyor..." />
        </div>
      </div>
    );
  }

  if (!user || !isSellerRole(user.role)) {
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
