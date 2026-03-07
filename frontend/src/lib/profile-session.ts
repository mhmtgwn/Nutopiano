import { getPanelHomePathByRole, normalizeRole } from '@/lib/role-routing';
import type { User } from '@/store/userSlice';
import type { PanelKey, ProfileResponse } from '@/types/profile';

const VALID_PANEL_KEYS = new Set<PanelKey>(['ADMIN', 'SELLER', 'POS', 'CUSTOMER']);

const STAFF_ORDER_PERMISSIONS = [
  'orders.view',
  'orders.create',
  'orders.edit',
  'orders.status_update',
  'orders.cancel',
  'orders.return.process',
];

const STAFF_POS_PERMISSIONS = ['pos.sales', 'pos.orders', 'pos.reports'];

const dedupe = <T>(values: T[]) => Array.from(new Set(values));

const normalizePermissions = (permissions?: string[]) =>
  dedupe(
    Array.isArray(permissions)
      ? permissions
          .map((permission) => String(permission ?? '').trim())
          .filter(Boolean)
      : [],
  );

const normalizeAllowedPanels = (allowedPanels?: string[]): PanelKey[] =>
  dedupe(
    Array.isArray(allowedPanels)
      ? allowedPanels.filter((panel): panel is PanelKey => VALID_PANEL_KEYS.has(panel as PanelKey))
      : [],
  );

const inferAllowedPanels = (role?: string | null, permissions?: string[]): PanelKey[] => {
  const normalizedRole = normalizeRole(role);
  const permissionSet = new Set(
    normalizePermissions(permissions).map((permission) => permission.toLowerCase()),
  );

  switch (normalizedRole) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return ['ADMIN', 'SELLER', 'POS', 'CUSTOMER'];
    case 'SELLER':
      return ['SELLER', 'POS'];
    case 'CUSTOMER':
      return ['CUSTOMER'];
    case 'SELLER_STAFF': {
      const panels: PanelKey[] = [];

      if (STAFF_ORDER_PERMISSIONS.some((permission) => permissionSet.has(permission))) {
        panels.push('SELLER');
      }

      if (STAFF_POS_PERMISSIONS.some((permission) => permissionSet.has(permission))) {
        panels.push('POS');
      }

      return panels;
    }
    default:
      return [];
  }
};

const resolveAllowedPanels = (
  role?: string | null,
  allowedPanels?: string[],
  permissions?: string[],
) => {
  const direct = normalizeAllowedPanels(allowedPanels);
  if (direct.length > 0) {
    return direct;
  }

  return inferAllowedPanels(role, permissions);
};

const inferPanelHome = (role?: string | null, allowedPanels: PanelKey[] = []) => {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === 'SELLER_STAFF') {
    if (allowedPanels.includes('SELLER')) return '/dashboard/orders';
    if (allowedPanels.includes('POS')) return '/pos';
  }

  if (allowedPanels.includes('ADMIN')) return '/admin';
  if (allowedPanels.includes('SELLER')) return '/dashboard';
  if (allowedPanels.includes('POS')) return '/pos';
  if (allowedPanels.includes('CUSTOMER')) return '/account/orders';

  return getPanelHomePathByRole(role);
};

export const mapProfileToUser = (profile: ProfileResponse): User => {
  const permissions = normalizePermissions(profile.permissions);
  const allowedPanels = resolveAllowedPanels(
    profile.role,
    profile.allowedPanels,
    permissions,
  );

  return {
    id: profile.userId,
    name: profile.name,
    phone: profile.phone,
    email: profile.email,
    role: profile.role,
    effectiveRole: profile.effectiveRole,
    permissions,
    panelHome: profile.panelHome ?? inferPanelHome(profile.role, allowedPanels),
    allowedPanels,
    featureStatuses: Array.isArray(profile.featureStatuses)
      ? profile.featureStatuses
      : [],
    businessId: profile.businessId ?? null,
  };
};

export const mapUserToProfile = (user: User): ProfileResponse => ({
  userId: user.id,
  name: user.name,
  phone: user.phone,
  email: user.email,
  role: user.role,
  effectiveRole: user.effectiveRole,
  permissions: user.permissions,
  panelHome: user.panelHome,
  allowedPanels: user.allowedPanels,
  featureStatuses: user.featureStatuses,
  businessId: user.businessId,
});

export const resolveUserPanelHome = (
  user?: Pick<User, 'panelHome' | 'role'> | null,
) => {
  if (!user) return '/login';
  return user.panelHome ?? getPanelHomePathByRole(user.role);
};

export const resolveProfilePanelHome = (profile: ProfileResponse) =>
  resolveUserPanelHome(mapProfileToUser(profile));

export const isUserSessionIncomplete = (user?: User | null) => {
  if (!user) return true;

  const normalizedRole = normalizeRole(user.role);
  if (!user.panelHome) return true;
  if (!Array.isArray(user.allowedPanels)) return true;

  if (normalizedRole && normalizedRole !== 'SELLER_STAFF' && user.allowedPanels.length === 0) {
    return true;
  }

  if (normalizedRole === 'SELLER_STAFF') {
    if (!Array.isArray(user.permissions)) return true;
    if (user.permissions.length > 0 && user.allowedPanels.length === 0) return true;
  }

  return false;
};
