/**
 * Role definitions and permissions
 */

export interface Permission {
  name: string;
  description: string;
}

export const PERMISSIONS = {
  // User management
  USER_CREATE: { name: 'USER_CREATE', description: 'Kullanıcı oluştur' },
  USER_READ: { name: 'USER_READ', description: 'Kullanıcı oku' },
  USER_UPDATE: { name: 'USER_UPDATE', description: 'Kullanıcı güncelle' },
  USER_DELETE: { name: 'USER_DELETE', description: 'Kullanıcı sil' },
  USER_LIST: { name: 'USER_LIST', description: 'Kullanıcıları listele' },

  // Customer management
  CUSTOMER_CREATE: { name: 'CUSTOMER_CREATE', description: 'Müşteri oluştur' },
  CUSTOMER_READ: { name: 'CUSTOMER_READ', description: 'Müşteri oku' },
  CUSTOMER_UPDATE: { name: 'CUSTOMER_UPDATE', description: 'Müşteri güncelle' },
  CUSTOMER_DELETE: { name: 'CUSTOMER_DELETE', description: 'Müşteri sil' },
  CUSTOMER_LIST: { name: 'CUSTOMER_LIST', description: 'Müşterileri listele' },

  // Product management
  PRODUCT_CREATE: { name: 'PRODUCT_CREATE', description: 'Ürün oluştur' },
  PRODUCT_READ: { name: 'PRODUCT_READ', description: 'Ürün oku' },
  PRODUCT_UPDATE: { name: 'PRODUCT_UPDATE', description: 'Ürün güncelle' },
  PRODUCT_DELETE: { name: 'PRODUCT_DELETE', description: 'Ürün sil' },
  PRODUCT_LIST: { name: 'PRODUCT_LIST', description: 'Ürünleri listele' },

  // Order management
  ORDER_CREATE: { name: 'ORDER_CREATE', description: 'Sipariş oluştur' },
  ORDER_READ: { name: 'ORDER_READ', description: 'Sipariş oku' },
  ORDER_UPDATE: { name: 'ORDER_UPDATE', description: 'Sipariş güncelle' },
  ORDER_DELETE: { name: 'ORDER_DELETE', description: 'Sipariş sil' },
  ORDER_LIST: { name: 'ORDER_LIST', description: 'Siparişleri listele' },
  ORDER_CONFIRM: { name: 'ORDER_CONFIRM', description: 'Siparişi onayla' },
  ORDER_CANCEL: { name: 'ORDER_CANCEL', description: 'Siparişi iptal et' },

  // Appointment management
  APPOINTMENT_CREATE: { name: 'APPOINTMENT_CREATE', description: 'Randevu oluştur' },
  APPOINTMENT_READ: { name: 'APPOINTMENT_READ', description: 'Randevu oku' },
  APPOINTMENT_UPDATE: { name: 'APPOINTMENT_UPDATE', description: 'Randevu güncelle' },
  APPOINTMENT_DELETE: { name: 'APPOINTMENT_DELETE', description: 'Randevu sil' },
  APPOINTMENT_LIST: { name: 'APPOINTMENT_LIST', description: 'Randevuları listele' },
  APPOINTMENT_CONFIRM: { name: 'APPOINTMENT_CONFIRM', description: 'Randevuyu onayla' },
  APPOINTMENT_CANCEL: { name: 'APPOINTMENT_CANCEL', description: 'Randevuyu iptal et' },

  // Category management
  CATEGORY_CREATE: { name: 'CATEGORY_CREATE', description: 'Kategori oluştur' },
  CATEGORY_READ: { name: 'CATEGORY_READ', description: 'Kategori oku' },
  CATEGORY_UPDATE: { name: 'CATEGORY_UPDATE', description: 'Kategori güncelle' },
  CATEGORY_DELETE: { name: 'CATEGORY_DELETE', description: 'Kategori sil' },
  CATEGORY_LIST: { name: 'CATEGORY_LIST', description: 'Kategorileri listele' },

  // Settings
  SETTINGS_READ: { name: 'SETTINGS_READ', description: 'Ayarları oku' },
  SETTINGS_UPDATE: { name: 'SETTINGS_UPDATE', description: 'Ayarları güncelle' },

  // Reports
  REPORT_VIEW: { name: 'REPORT_VIEW', description: 'Raporları gör' },
  REPORT_EXPORT: { name: 'REPORT_EXPORT', description: 'Raporları dışa aktar' },

  // Dashboard
  DASHBOARD_VIEW: { name: 'DASHBOARD_VIEW', description: 'Pano\'yu gör' },
};

export interface RoleDefinition {
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  level: number; // Higher level = more permissions
}

export const ROLE_DEFINITIONS: Record<string, RoleDefinition> = {
  SUPER_ADMIN: {
    name: 'SUPER_ADMIN',
    displayName: 'Süper Admin',
    description: 'Sistem üzerinde tam kontrol',
    level: 100,
    permissions: Object.keys(PERMISSIONS),
  },

  ADMIN: {
    name: 'ADMIN',
    displayName: 'Admin',
    description: 'İşletme yöneticisi',
    level: 70,
    permissions: Object.keys(PERMISSIONS),
  },

  SELLER: {
    name: 'SELLER',
    displayName: 'Satıcı',
    description: 'İşletme sahibi',
    level: 50,
    permissions: [
      'DASHBOARD_VIEW',
      'CUSTOMER_CREATE',
      'CUSTOMER_READ',
      'CUSTOMER_UPDATE',
      'CUSTOMER_LIST',
      'PRODUCT_CREATE',
      'PRODUCT_READ',
      'PRODUCT_UPDATE',
      'PRODUCT_DELETE',
      'PRODUCT_LIST',
      'ORDER_READ',
      'ORDER_UPDATE',
      'ORDER_LIST',
      'ORDER_CONFIRM',
      'ORDER_CANCEL',
      'APPOINTMENT_CREATE',
      'APPOINTMENT_READ',
      'APPOINTMENT_UPDATE',
      'APPOINTMENT_LIST',
      'APPOINTMENT_CONFIRM',
      'APPOINTMENT_CANCEL',
      'CATEGORY_CREATE',
      'CATEGORY_READ',
      'CATEGORY_UPDATE',
      'CATEGORY_DELETE',
      'CATEGORY_LIST',
      'SETTINGS_READ',
      'SETTINGS_UPDATE',
      'REPORT_VIEW',
    ],
  },

  CUSTOMER: {
    name: 'CUSTOMER',
    displayName: 'Müşteri',
    description: 'Müşteri profili',
    level: 10,
    permissions: [
      'DASHBOARD_VIEW',
      'PRODUCT_READ',
      'PRODUCT_LIST',
      'ORDER_CREATE',
      'ORDER_READ',
      'ORDER_LIST',
      'APPOINTMENT_CREATE',
      'APPOINTMENT_READ',
      'APPOINTMENT_LIST',
      'CATEGORY_READ',
      'CATEGORY_LIST',
    ],
  },

  STAFF: {
    name: 'STAFF',
    displayName: 'Personel',
    description: 'İşletme personeli',
    level: 30,
    permissions: [
      'DASHBOARD_VIEW',
      'CUSTOMER_READ',
      'CUSTOMER_UPDATE',
      'CUSTOMER_LIST',
      'PRODUCT_READ',
      'PRODUCT_LIST',
      'ORDER_READ',
      'ORDER_UPDATE',
      'ORDER_LIST',
      'APPOINTMENT_CREATE',
      'APPOINTMENT_READ',
      'APPOINTMENT_UPDATE',
      'APPOINTMENT_LIST',
      'APPOINTMENT_CONFIRM',
      'APPOINTMENT_CANCEL',
      'CATEGORY_READ',
      'CATEGORY_LIST',
      'REPORT_VIEW',
    ],
  },
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: string, permission: string): boolean {
  const roleDefinition = ROLE_DEFINITIONS[role];
  if (!roleDefinition) return false;
  return roleDefinition.permissions.includes(permission);
}

/**
 * Get permissions for a role
 */
export function getPermissions(role: string): Permission[] {
  const roleDefinition = ROLE_DEFINITIONS[role];
  if (!roleDefinition) return [];
  return roleDefinition.permissions.map((permission) => PERMISSIONS[permission as keyof typeof PERMISSIONS]);
}

/**
 * Get roles that are greater than or equal to the given role level
 */
export function getRolesByLevel(level: number): RoleDefinition[] {
  return Object.values(ROLE_DEFINITIONS).filter((role) => role.level >= level);
}
