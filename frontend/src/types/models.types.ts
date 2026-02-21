/**
 * Data model types
 */

import { AppointmentStatus, OrderStatus, UserRole } from './enums';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  businessId: number;
  isActive: boolean;
  createdAt: Date;
}

export interface Customer {
  id: number;
  businessId: number;
  name: string;
  email?: string;
  phone: string;
  city?: string;
  address?: string;
  balance: number; // in cents
  createdAt: Date;
}

export interface Product {
  id: number;
  businessId: number;
  name: string;
  description?: string;
  price: number; // in cents
  stock?: number;
  categoryId?: number;
  imageUrl?: string;
  images?: string[];
  isActive: boolean;
  createdAt: Date;
}

export interface Category {
  id: number;
  businessId: number;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  isPublic: boolean;
  createdAt: Date;
}

export interface Order {
  id: number;
  businessId: number;
  customerId: number;
  totalAmount: number; // in cents
  status: OrderStatus;
  items: OrderItem[];
  createdAt: Date;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPrice: number; // in cents
  totalPrice: number; // in cents
}

export interface Appointment {
  id: number;
  businessId: number;
  customerId: number;
  staffId?: number;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  notes?: string;
  createdAt: Date;
}

export interface CartItem {
  productId: number;
  quantity: number;
  product?: Product;
}

export interface Cart {
  items: CartItem[];
  totalItems: number;
  totalPrice: number; // in cents
}
