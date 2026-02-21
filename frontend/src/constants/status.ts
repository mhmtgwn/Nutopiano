/**
 * Status-related constants and helpers
 */

import { OrderStatus as OrderStatusEnum, SellerStatus, AppointmentStatus } from '../types/enums';

// Order status metadata
export const ORDER_STATUS_META = {
  [OrderStatusEnum.CREATED]: {
    label: 'Oluşturuldu',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    icon: 'clock',
    description: 'Sipariş oluşturuldu',
  },
  [OrderStatusEnum.CONFIRMED]: {
    label: 'Onaylandı',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    icon: 'check-circle',
    description: 'Sipariş onaylandı',
  },
  [OrderStatusEnum.PROCESSING]: {
    label: 'İşleniyor',
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    icon: 'hourglass',
    description: 'Sipariş işleniyor',
  },
  [OrderStatusEnum.SHIPPED]: {
    label: 'Gönderildi',
    color: 'purple',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    icon: 'truck',
    description: 'Sipariş gönderildi',
  },
  [OrderStatusEnum.DELIVERED]: {
    label: 'Teslim Edildi',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    icon: 'box-check',
    description: 'Sipariş teslim edildi',
  },
  [OrderStatusEnum.COMPLETED]: {
    label: 'Tamamlandı',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    icon: 'check',
    description: 'Sipariş tamamlandı',
  },
  [OrderStatusEnum.CANCELLED]: {
    label: 'İptal Edildi',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    icon: 'x-circle',
    description: 'Sipariş iptal edildi',
  },
  [OrderStatusEnum.REFUNDED]: {
    label: 'Para İade',
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    icon: 'undo',
    description: 'Para iade edildi',
  },
  [OrderStatusEnum.PENDING_PAYMENT]: {
    label: 'Ödeme Bekleniyor',
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    icon: 'credit-card',
    description: 'Ödeme bekleniyor',
  },
  [OrderStatusEnum.PAYMENT_FAILED]: {
    label: 'Ödeme Başarısız',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    icon: 'alert-circle',
    description: 'Ödeme başarısız oldu',
  },
} as const;

// Seller status metadata
export const SELLER_STATUS_META = {
  [SellerStatus.PENDING_APPROVAL]: {
    label: 'Onay Bekleniyor',
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    icon: 'clock',
    description: 'Satıcı onayı bekleniyor',
  },
  [SellerStatus.APPROVED]: {
    label: 'Onaylandı',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    icon: 'check-circle',
    description: 'Satıcı onaylandı',
  },
  [SellerStatus.ACTIVE]: {
    label: 'Aktif',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    icon: 'activity',
    description: 'Satıcı aktif',
  },
  [SellerStatus.SUSPENDED]: {
    label: 'Askıya Alındı',
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    icon: 'pause-circle',
    description: 'Satıcı hesabı askıya alındı',
  },
  [SellerStatus.DEACTIVATED]: {
    label: 'Deaktive Edildi',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    icon: 'slash-circle',
    description: 'Satıcı hesabı deaktive edildi',
  },
  [SellerStatus.CLOSED]: {
    label: 'Kapalı',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    icon: 'lock',
    description: 'Satıcı hesabı kapalı',
  },
} as const;

// Appointment status metadata
export const APPOINTMENT_STATUS_META = {
  [AppointmentStatus.SCHEDULED]: {
    label: 'Planlandı',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    icon: 'calendar',
    description: 'Randevu planlandı',
  },
  [AppointmentStatus.CONFIRMED]: {
    label: 'Onaylandı',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    icon: 'check-circle',
    description: 'Randevu onaylandı',
  },
  [AppointmentStatus.COMPLETED]: {
    label: 'Tamamlandı',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    icon: 'check',
    description: 'Randevu tamamlandı',
  },
  [AppointmentStatus.CANCELLED]: {
    label: 'İptal Edildi',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    icon: 'x-circle',
    description: 'Randevu iptal edildi',
  },
  [AppointmentStatus.NO_SHOW]: {
    label: 'Gelmedi',
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    icon: 'alert-circle',
    description: 'Müşteri randevuya gelmedi',
  },
} as const;

// Get status metadata
export function getOrderStatusMeta(status: OrderStatusEnum) {
  return ORDER_STATUS_META[status];
}

export function getSellerStatusMeta(status: SellerStatus) {
  return SELLER_STATUS_META[status];
}

export function getAppointmentStatusMeta(status: AppointmentStatus) {
  return APPOINTMENT_STATUS_META[status];
}

// Status progression helpers
export const VALID_ORDER_STATUS_TRANSITIONS: Record<OrderStatusEnum, OrderStatusEnum[]> = {
  [OrderStatusEnum.CREATED]: [OrderStatusEnum.CONFIRMED, OrderStatusEnum.CANCELLED],
  [OrderStatusEnum.CONFIRMED]: [OrderStatusEnum.PROCESSING, OrderStatusEnum.CANCELLED],
  [OrderStatusEnum.PROCESSING]: [OrderStatusEnum.SHIPPED, OrderStatusEnum.CANCELLED],
  [OrderStatusEnum.SHIPPED]: [OrderStatusEnum.DELIVERED],
  [OrderStatusEnum.DELIVERED]: [OrderStatusEnum.COMPLETED, OrderStatusEnum.REFUNDED],
  [OrderStatusEnum.COMPLETED]: [OrderStatusEnum.REFUNDED],
  [OrderStatusEnum.CANCELLED]: [],
  [OrderStatusEnum.REFUNDED]: [],
  [OrderStatusEnum.PENDING_PAYMENT]: [
    OrderStatusEnum.CONFIRMED,
    OrderStatusEnum.PAYMENT_FAILED,
    OrderStatusEnum.CANCELLED,
  ],
  [OrderStatusEnum.PAYMENT_FAILED]: [OrderStatusEnum.PENDING_PAYMENT, OrderStatusEnum.CANCELLED],
};

export const VALID_APPOINTMENT_STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  [AppointmentStatus.SCHEDULED]: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
  [AppointmentStatus.CONFIRMED]: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
  [AppointmentStatus.COMPLETED]: [],
  [AppointmentStatus.CANCELLED]: [],
  [AppointmentStatus.NO_SHOW]: [],
};

/**
 * Check if a status transition is valid
 */
export function isValidOrderStatusTransition(from: OrderStatusEnum, to: OrderStatusEnum): boolean {
  return VALID_ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isValidAppointmentStatusTransition(
  from: AppointmentStatus,
  to: AppointmentStatus,
): boolean {
  return VALID_APPOINTMENT_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

// Order status groups for filtering
export const ORDER_STATUS_GROUPS = {
  ACTIVE: [
    OrderStatusEnum.CREATED,
    OrderStatusEnum.CONFIRMED,
    OrderStatusEnum.PROCESSING,
    OrderStatusEnum.SHIPPED,
  ],
  COMPLETED: [OrderStatusEnum.DELIVERED, OrderStatusEnum.COMPLETED],
  CANCELLED: [OrderStatusEnum.CANCELLED, OrderStatusEnum.REFUNDED],
  PAYMENT_PENDING: [OrderStatusEnum.PENDING_PAYMENT, OrderStatusEnum.PAYMENT_FAILED],
};
