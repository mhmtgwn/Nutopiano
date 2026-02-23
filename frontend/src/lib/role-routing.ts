export const APP_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'SELLER',
  'STAFF',
  'CUSTOMER',
] as const;

export type AppRole = (typeof APP_ROLES)[number];

const APP_ROLE_SET = new Set<string>(APP_ROLES);

export const isAppRole = (role?: string | null): role is AppRole =>
  typeof role === 'string' && APP_ROLE_SET.has(role);

export const isAdminRole = (
  role?: string | null,
): role is Extract<AppRole, 'SUPER_ADMIN' | 'ADMIN'> =>
  role === 'SUPER_ADMIN' || role === 'ADMIN';

export const isSuperAdminRole = (
  role?: string | null,
): role is Extract<AppRole, 'SUPER_ADMIN'> => role === 'SUPER_ADMIN';

export const isSellerPanelRole = (
  role?: string | null,
): role is Extract<AppRole, 'SUPER_ADMIN' | 'ADMIN' | 'SELLER' | 'STAFF'> =>
  role === 'SUPER_ADMIN' ||
  role === 'ADMIN' ||
  role === 'SELLER' ||
  role === 'STAFF';

export const isPosRoleAllowed = (
  role?: string | null,
): role is Extract<AppRole, 'SUPER_ADMIN' | 'ADMIN' | 'SELLER' | 'STAFF'> =>
  role === 'SUPER_ADMIN' ||
  role === 'ADMIN' ||
  role === 'SELLER' ||
  role === 'STAFF';

export const getPanelHomePathByRole = (role?: string | null): string => {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/platform';
    case 'ADMIN':
      return '/admin';
    case 'SELLER':
    case 'STAFF':
      return '/dashboard';
    case 'CUSTOMER':
      return '/account/orders';
    default:
      return '/shop';
  }
};

export const getPanelLabelByRole = (role?: string | null): string => {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Platform Paneli';
    case 'ADMIN':
      return 'Admin Paneli';
    case 'SELLER':
      return 'Satıcı Paneli';
    case 'STAFF':
      return 'Personel Paneli';
    case 'CUSTOMER':
      return 'Hesabım';
    default:
      return 'Panelim';
  }
};
