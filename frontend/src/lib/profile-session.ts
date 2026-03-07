import {
  normalizeAccessPermissions,
  resolveAllowedPanels,
  resolveDefaultPanelHome,
} from '@/lib/panel-access';
import { getPanelHomePathByRole, normalizeRole } from '@/lib/role-routing';
import type { User } from '@/store/userSlice';
import type { ProfileResponse } from '@/types/profile';

export const mapProfileToUser = (profile: ProfileResponse): User => {
  const permissions = normalizeAccessPermissions(profile.permissions);
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
    panelHome:
      profile.panelHome ??
      resolveDefaultPanelHome(profile.role, allowedPanels, permissions),
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
  if (!Array.isArray(user.permissions)) return true;
  if (!Array.isArray(user.featureStatuses)) return true;

  if (normalizedRole && normalizedRole !== 'SELLER_STAFF' && user.allowedPanels.length === 0) {
    return true;
  }

  if (normalizedRole === 'SELLER_STAFF') {
    if (user.permissions.length > 0 && user.allowedPanels.length === 0) return true;
  }

  return false;
};
