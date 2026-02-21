/**
 * Role constants and permissions
 */

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SELLER: 'SELLER',
  CUSTOMER: 'CUSTOMER',
  STAFF: 'STAFF',
} as const;

export type RoleType = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_PERMISSIONS = {
  SUPER_ADMIN: {
    description: 'Platform administrator - full access',
    canAccessPlatformAdmin: true,
    canAccessSellerPortal: false,
    canAccessCustomerPortal: true,
    canManageUsers: true,
    canManageSellers: true,
    canManageOrders: true,
    canManagePayments: true,
    canViewAnalytics: true,
  },
  SELLER: {
    description: 'Business/Seller - can manage own business',
    canAccessPlatformAdmin: false,
    canAccessSellerPortal: true,
    canAccessCustomerPortal: false,
    canManageUsers: false,
    canManageSellers: false,
    canManageOrders: true,
    canManagePayments: true,
    canViewAnalytics: true,
  },
  CUSTOMER: {
    description: 'End customer - can browse and purchase',
    canAccessPlatformAdmin: false,
    canAccessSellerPortal: false,
    canAccessCustomerPortal: true,
    canManageUsers: false,
    canManageSellers: false,
    canManageOrders: false,
    canManagePayments: false,
    canViewAnalytics: false,
  },
  STAFF: {
    description: 'Staff member - limited access to business operations',
    canAccessPlatformAdmin: false,
    canAccessSellerPortal: true,
    canAccessCustomerPortal: false,
    canManageUsers: false,
    canManageSellers: false,
    canManageOrders: true,
    canManagePayments: false,
    canViewAnalytics: false,
  },
} as const;

export const ADMIN_ROLES = [ROLES.SUPER_ADMIN] as const;
export const SELLER_ROLES = [ROLES.SELLER, ROLES.STAFF] as const;
export const CUSTOMER_ROLES = [ROLES.CUSTOMER] as const;
