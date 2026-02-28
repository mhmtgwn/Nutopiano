import { ROLES, LEGACY_ROLE_ALIASES, type RoleType } from '../constants/roles';

const isRoleType = (value: string): value is RoleType =>
  (Object.values(ROLES) as readonly string[]).includes(value);

export const normalizeRole = (role?: string | null): RoleType | null => {
  if (!role) return null;
  const normalized = String(role).trim().toUpperCase();
  const resolved = LEGACY_ROLE_ALIASES[normalized] ?? normalized;
  return isRoleType(resolved) ? resolved : null;
};

export const toEffectiveRole = (role?: string | null): RoleType | null => {
  const normalized = normalizeRole(role);
  if (!normalized) return null;
  // SUPER_ADMIN ve SELLER_STAFF efektif rolleri
  if (normalized === ROLES.SUPER_ADMIN) return ROLES.ADMIN;
  if (normalized === ROLES.USER) return ROLES.SELLER_STAFF;
  return normalized;
};

export const isAdminRole = (role?: string | null): boolean =>
  toEffectiveRole(role) === ROLES.ADMIN;

export const isSellerRole = (role?: string | null): boolean =>
  toEffectiveRole(role) === ROLES.SELLER;

export const isStaffRole = (role?: string | null): boolean => {
  const effective = toEffectiveRole(role);
  return effective === ROLES.SELLER_STAFF || effective === ROLES.USER;
};

/** @deprecated isViewerRole yerine isStaffRole kullanın */
export const isViewerRole = isStaffRole;
