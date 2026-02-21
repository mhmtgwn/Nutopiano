/**
 * Products API endpoints
 */

import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/constants';
import type { ApiResponse, Product } from '@/types';

export interface CreateProductRequest {
  name: string;
  description?: string;
  price: number;
  stock?: number;
  categoryId?: number;
  imageUrl?: string;
  images?: string[];
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  id: number;
}

export interface ProductSearchParams {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

/**
 * Get all products
 */
export async function getProducts(
  params: ProductSearchParams = {},
): Promise<ApiResponse<Product[]>> {
  return apiClient.get<Product[]>(API_ENDPOINTS.PRODUCTS.LIST, { params });
}

/**
 * Get product by ID
 */
export async function getProductById(id: number): Promise<ApiResponse<Product>> {
  return apiClient.get<Product>(API_ENDPOINTS.PRODUCTS.GET(id));
}

/**
 * Create product
 */
export async function createProduct(data: CreateProductRequest): Promise<ApiResponse<Product>> {
  return apiClient.post<Product>(API_ENDPOINTS.PRODUCTS.CREATE, data);
}

/**
 * Update product
 */
export async function updateProduct(id: number, data: Partial<CreateProductRequest>): Promise<ApiResponse<Product>> {
  return apiClient.patch<Product>(API_ENDPOINTS.PRODUCTS.UPDATE(id), data);
}

/**
 * Delete product
 */
export async function deleteProduct(id: number): Promise<ApiResponse<null>> {
  return apiClient.delete<null>(API_ENDPOINTS.PRODUCTS.DELETE(id));
}

/**
 * Search products
 */
export async function searchProducts(
  query: string,
  params: Omit<ProductSearchParams, 'search'> = {},
): Promise<ApiResponse<Product[]>> {
  return apiClient.get<Product[]>(API_ENDPOINTS.PRODUCTS.SEARCH, {
    params: { ...params, search: query },
  });
}
