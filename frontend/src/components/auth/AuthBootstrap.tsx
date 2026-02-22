'use client';

import { useEffect, useRef } from 'react';
import api from '@/services/api';
import { useAppDispatch, useAppSelector } from '@/store';
import { setCredentials } from '@/store/userSlice';

interface ProfileResponse {
  userId: string;
  name?: string;
  phone?: string;
  email?: string;
  role: string;
  businessId?: string | null;
}

export default function AuthBootstrap() {
  const dispatch = useAppDispatch();
  const { user, status } = useAppSelector((state) => state.user);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (hasCheckedRef.current) return;
    if (status === 'authenticating') return;

    hasCheckedRef.current = true;
    if (user) return;

    let isCancelled = false;

    const bootstrapSession = async () => {
      try {
        const response = await api.get<ProfileResponse>('/auth/profile');
        if (isCancelled) return;

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
      } catch {
        // No active session cookie (or expired session). Keep guest state.
      }
    };

    void bootstrapSession();

    return () => {
      isCancelled = true;
    };
  }, [dispatch, status, user]);

  return null;
}
