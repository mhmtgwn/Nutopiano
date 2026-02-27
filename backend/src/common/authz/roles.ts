import { ROLES, type RoleType } from '../constants/roles';

const LEGACY_ROLE_ALIASES: Record<string, RoleType> = {
  STAFF: ROLES.USER,
};

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
  return normalized === ROLES.SUPER_ADMIN ? ROLES.ADMIN : normalized;
};

export const isAdminRole = (role?: string | null): boolean =>
  toEffectiveRole(role) === ROLES.ADMIN;

export const isSellerRole = (role?: string | null): boolean =>
  toEffectiveRole(role) === ROLES.SELLER;

export const isViewerRole = (role?: string | null): boolean =>
  toEffectiveRole(role) === ROLES.USER;
