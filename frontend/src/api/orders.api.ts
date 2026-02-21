/**
 * Orders API endpoints
 */

import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/constants';
import type { ApiResponse, Order, OrderStatus } from '@/types';

export interface CreateOrderRequest {
  customerId: number;
  items: {
    productId: number;
    quantity: number;
    expectedUnitPriceCents?: number;
  }[];
  notes?: string;
}

export interface UpdateOrderRequest {
  // Fields that can be updated
  [key: string]: any;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
}

export interface OrderListParams {
  page?: number;
  pageSize?: number;
  status?: OrderStatus;
  customerId?: number;
  dateFrom?: string;
  dateTo?: string;
  sort?: 'asc' | 'desc';
  sortBy?: 'date' | 'amount';
}

/**
 * Get all orders
 */
export async function getOrders(
  params: OrderListParams = {},
): Promise<ApiResponse<Order[]>> {
  return apiClient.get<Order[]>(API_ENDPOINTS.ORDERS.LIST, { params });
}

/**
 * Get order by ID
 */
export async function getOrderById(id: number): Promise<ApiResponse<Order>> {
  return apiClient.get<Order>(API_ENDPOINTS.ORDERS.GET(id));
}

/**
 * Create order
 */
export async function createOrder(data: CreateOrderRequest): Promise<ApiResponse<Order>> {
  return apiClient.post<Order>(API_ENDPOINTS.ORDERS.CREATE, data);
}

/**
 * Update order
 */
export async function updateOrder(id: number, data: UpdateOrderRequest): Promise<ApiResponse<Order>> {
  return apiClient.patch<Order>(API_ENDPOINTS.ORDERS.UPDATE(id), data);
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  id: number,
  data: UpdateOrderStatusRequest,
): Promise<ApiResponse<Order>> {
  return apiClient.patch<Order>(API_ENDPOINTS.ORDERS.UPDATE_STATUS(id), data);
}

/**
 * Cancel order
 */
export async function cancelOrder(id: number): Promise<ApiResponse<Order>> {
  return apiClient.patch<Order>(API_ENDPOINTS.ORDERS.CANCEL(id));
}

/**
 * Delete order
 */
export async function deleteOrder(id: number): Promise<ApiResponse<null>> {
  return apiClient.delete<null>(API_ENDPOINTS.ORDERS.DELETE(id));
}
