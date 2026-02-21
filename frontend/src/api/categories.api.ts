/**
 * Categories API endpoints
 */

import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/constants';
import type { ApiResponse, Category } from '@/types';

export interface CreateCategoryRequest {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
  isPublic?: boolean;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  id: number;
}

export interface CategoryListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  isPublic?: boolean;
  sort?: 'asc' | 'desc';
}

/**
 * Get all categories
 */
export async function getCategories(
  params: CategoryListParams = {},
): Promise<ApiResponse<Category[]>> {
  return apiClient.get<Category[]>(API_ENDPOINTS.CATEGORIES.LIST, { params });
}

/**
 * Get category by ID
 */
export async function getCategoryById(id: number): Promise<ApiResponse<Category>> {
  return apiClient.get<Category>(API_ENDPOINTS.CATEGORIES.GET(id));
}

/**
 * Create category
 */
export async function createCategory(data: CreateCategoryRequest): Promise<ApiResponse<Category>> {
  return apiClient.post<Category>(API_ENDPOINTS.CATEGORIES.CREATE, data);
}

/**
 * Update category
 */
export async function updateCategory(
  id: number,
  data: Partial<CreateCategoryRequest>,
): Promise<ApiResponse<Category>> {
  return apiClient.patch<Category>(API_ENDPOINTS.CATEGORIES.UPDATE(id), data);
}

/**
 * Delete category
 */
export async function deleteCategory(id: number): Promise<ApiResponse<null>> {
  return apiClient.delete<null>(API_ENDPOINTS.CATEGORIES.DELETE(id));
}
