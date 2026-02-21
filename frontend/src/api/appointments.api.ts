/**
 * Appointments API endpoints
 */

import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/constants';
import type { ApiResponse, Appointment, AppointmentStatus } from '@/types';

export interface CreateAppointmentRequest {
  customerId: number;
  staffId?: number;
  startAt: string; // ISO string
  endAt: string; // ISO string
  notes?: string;
}

export interface UpdateAppointmentRequest extends Partial<CreateAppointmentRequest> {
  id: number;
}

export interface UpdateAppointmentStatusRequest {
  status: AppointmentStatus;
}

export interface AppointmentListParams {
  page?: number;
  pageSize?: number;
  status?: AppointmentStatus;
  customerId?: number;
  staffId?: number;
  dateFrom?: string;
  dateTo?: string;
  sort?: 'asc' | 'desc';
}

/**
 * Get all appointments
 */
export async function getAppointments(
  params: AppointmentListParams = {},
): Promise<ApiResponse<Appointment[]>> {
  return apiClient.get<Appointment[]>(API_ENDPOINTS.APPOINTMENTS.LIST, { params });
}

/**
 * Get appointment by ID
 */
export async function getAppointmentById(id: number): Promise<ApiResponse<Appointment>> {
  return apiClient.get<Appointment>(API_ENDPOINTS.APPOINTMENTS.GET(id));
}

/**
 * Create appointment
 */
export async function createAppointment(data: CreateAppointmentRequest): Promise<ApiResponse<Appointment>> {
  return apiClient.post<Appointment>(API_ENDPOINTS.APPOINTMENTS.CREATE, data);
}

/**
 * Update appointment
 */
export async function updateAppointment(
  id: number,
  data: Partial<CreateAppointmentRequest>,
): Promise<ApiResponse<Appointment>> {
  return apiClient.patch<Appointment>(API_ENDPOINTS.APPOINTMENTS.UPDATE(id), data);
}

/**
 * Change appointment status
 */
export async function updateAppointmentStatus(
  id: number,
  data: UpdateAppointmentStatusRequest,
): Promise<ApiResponse<Appointment>> {
  return apiClient.patch<Appointment>(API_ENDPOINTS.APPOINTMENTS.UPDATE(id), data);
}

/**
 * Cancel appointment
 */
export async function cancelAppointment(id: number): Promise<ApiResponse<Appointment>> {
  return apiClient.patch<Appointment>(API_ENDPOINTS.APPOINTMENTS.CANCEL(id), {
    status: 'CANCELLED' as AppointmentStatus,
  });
}

/**
 * Delete appointment
 */
export async function deleteAppointment(id: number): Promise<ApiResponse<null>> {
  return apiClient.delete<null>(API_ENDPOINTS.APPOINTMENTS.DELETE(id));
}
