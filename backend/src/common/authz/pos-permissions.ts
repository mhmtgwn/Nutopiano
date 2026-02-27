import type { Prisma } from '@prisma/client';

export const POS_PERMISSION_KEYS = [
  'pos.sales',
  'pos.orders',
  'pos.reports',
] as const;

export type PosPermissionKey = (typeof POS_PERMISSION_KEYS)[number];
export type PosPermissionPreset = 'sales' | 'orders' | 'reports' | 'full_pos';

const POS_PERMISSION_SET = new Set<string>(POS_PERMISSION_KEYS);

const LEGACY_PERMISSION_ALIASES: Record<string, PosPermissionKey> = {
  'tab.sales': 'pos.sales',
  'pos.sale.create': 'pos.sales',
  'tab.orders': 'pos.orders',
  'orders.read': 'pos.orders',
  'orders.updateStatus': 'pos.orders',
  'tab.reports': 'pos.reports',
};

const PRESET_MAP: Record<PosPermissionPreset, PosPermissionKey[]> = {
  sales: ['pos.sales'],
  orders: ['pos.orders'],
  reports: ['pos.reports'],
  full_pos: [...POS_PERMISSION_KEYS],
};

const isPosPermissionKey = (value: string): value is PosPermissionKey =>
  (POS_PERMISSION_KEYS as readonly string[]).includes(value);

const dedupe = (items: PosPermissionKey[]) =>
  Array.from(new Set(items));

export const canonicalizePosPermission = (
  permission?: string | null,
): PosPermissionKey | null => {
  if (!permission) return null;
  const normalized = String(permission).trim();
  if (!normalized) return null;
  const lowered = normalized.toLowerCase();
  const mapped = LEGACY_PERMISSION_ALIASES[lowered] ?? lowered;
  return POS_PERMISSION_SET.has(mapped) && isPosPermissionKey(mapped)
    ? mapped
    : null;
};

export const permissionsFromPreset = (
  preset: PosPermissionPreset = 'full_pos',
): PosPermissionKey[] => dedupe([...(PRESET_MAP[preset] ?? PRESET_MAP.full_pos)]);

export const normalizePosPermissions = (
  permissions?: string[] | null,
  fallbackPreset: PosPermissionPreset = 'full_pos',
): PosPermissionKey[] => {
  if (!Array.isArray(permissions)) {
    return permissionsFromPreset(fallbackPreset);
  }

  const canonical = permissions
    .map((permission) => canonicalizePosPermission(permission))
    .filter((permission): permission is PosPermissionKey => permission !== null);

  if (canonical.length === 0) {
    return permissionsFromPreset(fallbackPreset);
  }

  return dedupe(canonical);
};

export const normalizePosPermissionsJson = (
  value: Prisma.JsonValue | unknown,
): PosPermissionKey[] => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }

  const maybePermissions = (value as { permissions?: unknown }).permissions;
  if (!Array.isArray(maybePermissions)) {
    return [];
  }

  return normalizePosPermissions(
    maybePermissions.map((item) => String(item ?? '').trim()),
    'sales',
  );
};

export const createPosPermissionsJson = (
  permissions?: string[] | null,
  preset: PosPermissionPreset = 'full_pos',
): { permissions: PosPermissionKey[] } => ({
  permissions: normalizePosPermissions(permissions, preset),
});

export const hasPosPermission = (
  permissions: Iterable<string>,
  requiredPermission: string,
): boolean => {
  const canonicalRequired = canonicalizePosPermission(requiredPermission);
  if (!canonicalRequired) return false;

  for (const permission of permissions) {
    if (canonicalizePosPermission(permission) === canonicalRequired) {
      return true;
    }
  }

  return false;
};
