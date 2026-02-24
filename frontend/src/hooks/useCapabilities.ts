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
  const role = useAppSelector((state) => state.user.user?.role);

  return useMemo(
    () => ({
      role,
      capabilities: getCapabilitiesForRole(role),
      can: (capability: AppCapability) => hasCapability(role, capability),
      canAll: (required: AppCapability[]) => hasAllCapabilities(role, required),
      canAny: (required: AppCapability[]) => hasAnyCapability(role, required),
    }),
    [role],
  );
};
