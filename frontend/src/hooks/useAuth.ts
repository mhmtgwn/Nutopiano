/**
 * Authentication hook
 */

import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/store';

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const dispatch = useDispatch();
  const { user, token, status, error } = useSelector((state: RootState) => state.user);
  const isLoading = status === 'authenticating';

  const login = useCallback(
    async (email: string, password: string) => {
      // Will be implemented with Redux dispatch
      console.log('Login:', email);
    },
    [dispatch],
  );

  const logout = useCallback(() => {
    // Will be implemented with Redux dispatch
    console.log('Logout');
  }, [dispatch]);

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      // Will be implemented with Redux dispatch
      console.log('Register:', email);
    },
    [dispatch],
  );

  const isAuthenticated = !!token && !!user;

  return {
    user,
    token,
    isLoading,
    error,
    isAuthenticated,
    login,
    logout,
    register,
  };
}
