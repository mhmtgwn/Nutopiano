'use client';

import { useEffect, useRef } from 'react';
import { fetchProfileResponse } from '@/lib/profile-api';
import { mapProfileToUser } from '@/lib/profile-session';
import { useAppDispatch, useAppSelector } from '@/store';
import { setCredentials } from '@/store/userSlice';

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
        const profile = await fetchProfileResponse();
        if (isCancelled) return;
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
