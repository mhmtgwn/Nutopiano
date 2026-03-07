'use client';

import { useEffect, useRef } from 'react';
import api from '@/services/api';
import { mapProfileToUser } from '@/lib/profile-session';
import { useAppDispatch, useAppSelector } from '@/store';
import { setCredentials } from '@/store/userSlice';
import type { ProfileResponse } from '@/types/profile';

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
            user: mapProfileToUser(profile),
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
