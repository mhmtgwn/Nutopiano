import api from '@/services/api';
import type { ProfileResponse } from '@/types/profile';

export const PROFILE_REQUEST_TIMEOUT_MS = 12000;

export const fetchProfileResponse = async () => {
  const response = await api.get<ProfileResponse>('/auth/profile', {
    timeout: PROFILE_REQUEST_TIMEOUT_MS,
  });

  return response.data;
};

