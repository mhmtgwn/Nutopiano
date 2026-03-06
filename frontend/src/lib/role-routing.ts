export const APP_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'SELLER',
  'SELLER_STAFF',
  'CUSTOMER',
] as const;

export type AppRole = (typeof APP_ROLES)[number];
export type EffectiveAppRole =
  | 'ADMIN'
  | 'SELLER'
  | 'SELLER_STAFF'
  | 'CUSTOMER';

const APP_ROLE_SET = new Set<string>(APP_ROLES);
const LEGACY_ROLE_ALIASES: Record<string, AppRole> = {
  STAFF: 'SELLER_STAFF',
  USER: 'SELLER_STAFF',
};

export const normalizeRole = (role?: string | null): AppRole | null => {
  if (!role) return null;
  const normalized = String(role).trim().toUpperCase();
  const resolved = LEGACY_ROLE_ALIASES[normalized] ?? normalized;
  return APP_ROLE_SET.has(resolved) ? (resolved as AppRole) : null;
};

export const getEffectiveRole = (
  role?: string | null,
): EffectiveAppRole | null => {
  const normalized = normalizeRole(role);
  if (!normalized) return null;
  if (normalized === 'SUPER_ADMIN') return 'ADMIN';
  return normalized;
};

export const isAppRole = (role?: string | null): role is AppRole =>
  normalizeRole(role) !== null;

export const isAdminRole = (role?: string | null): boolean =>
  getEffectiveRole(role) === 'ADMIN';

export const isSuperAdminRole = (role?: string | null): boolean =>
  normalizeRole(role) === 'SUPER_ADMIN';

export const isSellerStaffRole = (role?: string | null): boolean =>
  normalizeRole(role) === 'SELLER_STAFF';

export const isSellerPanelRole = (role?: string | null): boolean => {
  const normalized = normalizeRole(role);
  return (
    normalized === 'SUPER_ADMIN' ||
    normalized === 'ADMIN' ||
    normalized === 'SELLER' ||
    normalized === 'SELLER_STAFF'
  );
};

export const isPosRoleAllowed = (role?: string | null): boolean => {
  const normalized = normalizeRole(role);
  return (
    normalized === 'SUPER_ADMIN' ||
    normalized === 'ADMIN' ||
    normalized === 'SELLER' ||
    normalized === 'SELLER_STAFF'
  );
};

export const getPanelHomePathByRole = (role?: string | null): string => {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return '/admin';
    case 'SELLER':
      return '/dashboard';
    case 'SELLER_STAFF':
      return '/dashboard/orders';
    case 'CUSTOMER':
      return '/account/orders';
    default:
      return '/shop';
  }
};

export const getPanelLabelByRole = (role?: string | null): string => {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return 'Admin Paneli';
    case 'SELLER':
      return 'Satıcı Paneli';
    case 'SELLER_STAFF':
      return 'Personel Paneli';
    case 'CUSTOMER':
      return 'Hesabım';
    default:
      return 'Panelim';
  }
};
