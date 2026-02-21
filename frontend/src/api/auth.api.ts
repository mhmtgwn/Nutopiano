/**
 * Authentication API endpoints
 */

import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/constants';
import type { ApiResponse, User } from '@/types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Login user
 */
export async function login(data: LoginRequest): Promise<ApiResponse<LoginResponse>> {
  return apiClient.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, data);
}

/**
 * Register new user
 */
export async function register(data: RegisterRequest): Promise<ApiResponse<User>> {
  return apiClient.post<User>(API_ENDPOINTS.AUTH.REGISTER, data);
}

/**
 * Logout user
 */
export async function logout(): Promise<ApiResponse<null>> {
  return apiClient.post<null>(API_ENDPOINTS.AUTH.LOGOUT);
}

/**
 * Verify email
 */
export async function verifyEmail(data: VerifyEmailRequest): Promise<ApiResponse<{ verified: boolean }>> {
  return apiClient.post<{ verified: boolean }>(API_ENDPOINTS.AUTH.VERIFY, data);
}

/**
 * Refresh access token
 */
export async function refreshToken(): Promise<ApiResponse<{ accessToken: string }>> {
  return apiClient.post<{ accessToken: string }>(API_ENDPOINTS.AUTH.REFRESH);
}

/**
 * Reset password
 */
export async function resetPassword(data: ResetPasswordRequest): Promise<ApiResponse<null>> {
  return apiClient.post<null>(API_ENDPOINTS.AUTH.RESET_PASSWORD, data);
}

/**
 * Forgot password (request reset email)
 */
export async function forgotPassword(data: ForgotPasswordRequest): Promise<ApiResponse<null>> {
  return apiClient.post<null>(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, data);
}

/**
 * Change password
 */
export async function changePassword(data: ChangePasswordRequest): Promise<ApiResponse<null>> {
  return apiClient.post<null>(API_ENDPOINTS.USERS.CHANGE_PASSWORD, data);
}
