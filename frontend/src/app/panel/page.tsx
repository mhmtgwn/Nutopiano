'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout, setAuthError, setCredentials, startAuth } from '@/store/userSlice';
import { getPanelHomePathByRole } from '@/lib/role-routing';

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

type ProfileResponse = {
  userId: string;
  name?: string;
  phone?: string;
  email?: string;
  role: string;
  businessId?: string | null;
};

export default function PanelRedirectPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, status } = useAppSelector((state) => state.user);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace(getPanelHomePathByRole(user.role));
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

        router.replace(getPanelHomePathByRole(profile.role));
      } catch (error: unknown) {
        const message = resolveApiErrorMessage(error, 'Yetkilendirme başarısız.');
        dispatch(setAuthError(message));
        dispatch(logout());
        router.replace('/login?next=/panel');
      } finally {
        setIsLoadingProfile(false);
      }
    };

    void fetchProfile();
  }, [dispatch, router, user]);

  const isLoading = isLoadingProfile || status === 'authenticating';

  return (
    <div className="min-h-[calc(100vh-140px)] bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <Spinner fullscreen label={isLoading ? 'Panel yönlendiriliyor...' : 'Hazırlanıyor...'} />
      </div>
    </div>
  );
}
