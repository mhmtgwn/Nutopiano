/**
 * Customers API endpoints
 */

import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/constants';
import type { ApiResponse, Customer } from '@/types';

export interface CreateCustomerRequest {
  name: string;
  email?: string;
  phone: string;
  city?: string;
  address?: string;
}

export interface UpdateCustomerRequest extends Partial<CreateCustomerRequest> {
  id: number;
}

export interface CustomerListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  city?: string;
  sort?: 'asc' | 'desc';
  sortBy?: 'name' | 'createdAt';
}

/**
 * Get all customers
 */
export async function getCustomers(
  params: CustomerListParams = {},
): Promise<ApiResponse<Customer[]>> {
  return apiClient.get<Customer[]>(API_ENDPOINTS.CUSTOMERS.LIST, { params });
}

/**
 * Get customer by ID
 */
export async function getCustomerById(id: number): Promise<ApiResponse<Customer>> {
  return apiClient.get<Customer>(API_ENDPOINTS.CUSTOMERS.GET(id));
}

/**
 * Create customer
 */
export async function createCustomer(data: CreateCustomerRequest): Promise<ApiResponse<Customer>> {
  return apiClient.post<Customer>(API_ENDPOINTS.CUSTOMERS.CREATE, data);
}

/**
 * Update customer
 */
export async function updateCustomer(
  id: number,
  data: Partial<CreateCustomerRequest>,
): Promise<ApiResponse<Customer>> {
  return apiClient.patch<Customer>(API_ENDPOINTS.CUSTOMERS.UPDATE(id), data);
}

/**
 * Delete customer
 */
export async function deleteCustomer(id: number): Promise<ApiResponse<null>> {
  return apiClient.delete<null>(API_ENDPOINTS.CUSTOMERS.DELETE(id));
}

/**
 * Search customers
 */
export async function searchCustomers(
  query: string,
  params: Omit<CustomerListParams, 'search'> = {},
): Promise<ApiResponse<Customer[]>> {
  return apiClient.get<Customer[]>(API_ENDPOINTS.CUSTOMERS.LIST, {
    params: { ...params, search: query },
  });
}
