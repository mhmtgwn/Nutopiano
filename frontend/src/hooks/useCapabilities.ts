'use client';

import { useMemo } from 'react';
import { useAppSelector } from '@/store';
import {
  getCapabilitiesForRole,
  hasAllCapabilities,
  hasAnyCapability,
  hasCapability,
  type AppCapability,
} from '@/lib/capabilities';

export const useCapabilities = () => {
  const user = useAppSelector((state) => state.user.user);

  return useMemo(
    () => ({
      role: user?.role,
      capabilities: getCapabilitiesForRole(user),
      can: (capability: AppCapability) => hasCapability(user, capability),
      canAll: (required: AppCapability[]) => hasAllCapabilities(user, required),
      canAny: (required: AppCapability[]) => hasAnyCapability(user, required),
    }),
    [user],
  );
};
