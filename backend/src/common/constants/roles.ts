/**
 * Role constants and permissions
 */

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  SELLER: 'SELLER',
  CUSTOMER: 'CUSTOMER',
  USER: 'USER',           // Geriye uyumluluk - SELLER_STAFF takma adı
  SELLER_STAFF: 'SELLER_STAFF', // Yeni rol: satıcı personeli
} as const;

export type RoleType = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_PERMISSIONS = {
  SUPER_ADMIN: {
    description: 'Platform administrator - full access',
    canAccessPlatformAdmin: true,
    canAccessSellerPortal: true,
    canAccessCustomerPortal: true,
    canManageUsers: true,
    canManageSellers: true,
    canManageOrders: true,
    canManagePayments: true,
    canViewAnalytics: true,
  },
  ADMIN: {
    description: 'Business admin - full access in own business',
    canAccessPlatformAdmin: true,
    canAccessSellerPortal: true,
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
  USER: {
    description: 'Staff member (legacy alias for SELLER_STAFF)',
    canAccessPlatformAdmin: false,
    canAccessSellerPortal: true,
    canAccessCustomerPortal: false,
    canManageUsers: false,
    canManageSellers: false,
    canManageOrders: true,
    canManagePayments: false,
    canViewAnalytics: false,
  },
  SELLER_STAFF: {
    description: 'Seller staff member - permission group controlled',
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

export const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN] as const;
export const PLATFORM_ADMIN_ROLES = [ROLES.SUPER_ADMIN] as const;
export const BUSINESS_ADMIN_ROLES = [ROLES.ADMIN] as const;
export const SELLER_ROLES = [ROLES.SELLER, ROLES.USER, ROLES.SELLER_STAFF] as const;
export const SELLER_STAFF_ROLES = [ROLES.USER, ROLES.SELLER_STAFF] as const;
export const CUSTOMER_ROLES = [ROLES.CUSTOMER] as const;

/**
 * Legacy role alias mapping — USER → SELLER_STAFF geriye uyumluluk
 */
export const LEGACY_ROLE_ALIASES: Record<string, RoleType> = {
  STAFF: ROLES.SELLER_STAFF,
  USER: ROLES.SELLER_STAFF,
};
