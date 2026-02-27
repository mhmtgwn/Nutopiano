export const POS_PERMISSION_KEYS = [
  'pos.sales',
  'pos.orders',
  'pos.reports',
] as const;

export type PosPermissionKey = (typeof POS_PERMISSION_KEYS)[number];
export type PosTabId =
  | 'home'
  | 'categories'
  | 'customers'
  | 'finance'
  | 'orders'
  | 'settings';

const POS_PERMISSION_SET = new Set<string>(POS_PERMISSION_KEYS);

const LEGACY_ALIAS_MAP: Record<string, PosPermissionKey> = {
  'tab.sales': 'pos.sales',
  'pos.sale.create': 'pos.sales',
  'tab.orders': 'pos.orders',
  'orders.read': 'pos.orders',
  'orders.updateStatus': 'pos.orders',
  'tab.reports': 'pos.reports',
};

const POS_TAB_PERMISSION_MAP: Record<PosTabId, PosPermissionKey> = {
  home: 'pos.sales',
  categories: 'pos.sales',
  customers: 'pos.sales',
  finance: 'pos.reports',
  orders: 'pos.orders',
  settings: 'pos.reports',
};

export const canonicalizePosPermission = (
  permission?: string | null,
): PosPermissionKey | null => {
  if (!permission) return null;
  const normalized = String(permission).trim().toLowerCase();
  if (!normalized) return null;
  const resolved = LEGACY_ALIAS_MAP[normalized] ?? normalized;
  return POS_PERMISSION_SET.has(resolved)
    ? (resolved as PosPermissionKey)
    : null;
};

export const normalizePosPermissions = (
  permissions?: string[] | null,
): PosPermissionKey[] => {
  if (!Array.isArray(permissions)) return [];
  return Array.from(
    new Set(
      permissions
        .map((permission) => canonicalizePosPermission(permission))
        .filter((permission): permission is PosPermissionKey => permission !== null),
    ),
  );
};

export const hasPosPermission = (
  permissions: string[] | null | undefined,
  permission: PosPermissionKey,
) => normalizePosPermissions(permissions).includes(permission);

export const filterAllowedPosTabs = (
  permissions: string[] | null | undefined,
  tabs: PosTabId[],
): PosTabId[] => {
  const normalized = normalizePosPermissions(permissions);
  if (normalized.length === 0) return [];

  return tabs.filter((tab) =>
    normalized.includes(POS_TAB_PERMISSION_MAP[tab]),
  );
};
