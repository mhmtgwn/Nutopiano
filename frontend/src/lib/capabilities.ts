import { createPanelAccessManifest, type AccessSubject } from '@/lib/panel-access';
import { getEffectiveRole, normalizeRole, type EffectiveAppRole } from '@/lib/role-routing';

export const CAPABILITIES = [
  'VIEW_FINANCE',
  'EXECUTE_OVERRIDE',
  'VIEW_AUDIT',
  'MANAGE_SELLERS',
  'PROCESS_RETURN',
  'CLOSE_REGISTER',
  'FORCE_PUBLISH',
  'FORCE_STOCK',
  'VIEW_OUTBOX',
  'MANAGE_PAYOUT',
  'VIEW_REPORTS',
  'USE_POS',
  'VIEW_SUPPORT_MODE',
  'EXECUTE_BULK_ACTIONS',
] as const;

export type AppCapability = (typeof CAPABILITIES)[number];

type CapabilitySource = string | null | undefined | AccessSubject;

const ALL_CAPABILITIES = [...CAPABILITIES] as AppCapability[];

const CAPABILITY_PERMISSION_MAP: Record<AppCapability, string[]> = {
  VIEW_FINANCE: [
    'finance.view',
    'finance.ledger.view',
    'finance.wallets.view',
    'finance.refund.process',
  ],
  EXECUTE_OVERRIDE: [
    'users.impersonate',
    'support.impersonate',
    'finance.manual_adjustment',
    'pos.override_price',
  ],
  VIEW_AUDIT: ['audit.view', 'audit.export'],
  MANAGE_SELLERS: [
    'sellers.view',
    'sellers.create',
    'sellers.edit',
    'sellers.activate',
    'sellers.applications.view',
    'sellers.applications.approve',
    'sellers.team.view',
    'sellers.team.manage',
  ],
  PROCESS_RETURN: ['orders.return.process', 'pos.return', 'finance.refund.process'],
  CLOSE_REGISTER: ['pos.register.close'],
  FORCE_PUBLISH: ['products.force_publish'],
  FORCE_STOCK: ['products.force_stock'],
  VIEW_OUTBOX: ['outbox.view', 'outbox.retry'],
  MANAGE_PAYOUT: ['finance.payout.approve', 'finance.payout.reject'],
  VIEW_REPORTS: ['reports.view', 'finance.report.export', 'pos.reports'],
  USE_POS: ['pos.sales', 'pos.orders', 'pos.reports'],
  VIEW_SUPPORT_MODE: ['support.impersonate', 'support.pii_view'],
  EXECUTE_BULK_ACTIONS: ['products.import', 'products.archive', 'orders.status_update'],
};

const ROLE_CAPABILITY_MAP: Record<EffectiveAppRole, AppCapability[]> = {
  ADMIN: [
    'VIEW_FINANCE',
    'VIEW_AUDIT',
    'MANAGE_SELLERS',
    'PROCESS_RETURN',
    'CLOSE_REGISTER',
    'VIEW_OUTBOX',
    'MANAGE_PAYOUT',
    'VIEW_REPORTS',
    'USE_POS',
    'VIEW_SUPPORT_MODE',
    'EXECUTE_BULK_ACTIONS',
  ],
  SELLER: [
    'VIEW_FINANCE',
    'PROCESS_RETURN',
    'CLOSE_REGISTER',
    'VIEW_REPORTS',
    'USE_POS',
    'EXECUTE_BULK_ACTIONS',
  ],
  SELLER_STAFF: [],
  CUSTOMER: [],
};

const resolveRole = (source: CapabilitySource) => {
  if (typeof source === 'string' || source == null) {
    return getEffectiveRole(source);
  }

  const manifest = createPanelAccessManifest(source);
  return manifest.effectiveRole ?? getEffectiveRole(source.role);
};

const resolvePermissionBackedCapabilities = (source: AccessSubject) => {
  const manifest = createPanelAccessManifest(source);
  if (manifest.permissions.length === 0) {
    return new Set<AppCapability>();
  }
  const capabilities = new Set<AppCapability>();

  for (const capability of CAPABILITIES) {
    if (
      CAPABILITY_PERMISSION_MAP[capability].some((permission) =>
        manifest.permissionSet.has(permission),
      )
    ) {
      capabilities.add(capability);
    }
  }

  if (manifest.role === 'SUPER_ADMIN') {
    return new Set<AppCapability>(ALL_CAPABILITIES);
  }

  return capabilities;
};

const toCapabilitySet = (source?: CapabilitySource) => {
  if (source && typeof source === 'object') {
    const resolved = resolvePermissionBackedCapabilities(source);
    if (resolved.size > 0) {
      return resolved;
    }
  }

  const normalized = resolveRole(source);
  if (!normalized) {
    return new Set<AppCapability>();
  }

  const roleCapabilities = ROLE_CAPABILITY_MAP[normalized] ?? [];
  return new Set<AppCapability>(roleCapabilities);
};

export const getCapabilitiesForRole = (source?: CapabilitySource): AppCapability[] =>
  Array.from(toCapabilitySet(source));

export const hasCapability = (
  source: CapabilitySource,
  capability: AppCapability,
): boolean => toCapabilitySet(source).has(capability);

export const hasAllCapabilities = (
  source: CapabilitySource,
  required: AppCapability[],
): boolean => {
  const set = toCapabilitySet(source);
  return required.every((capability) => set.has(capability));
};

export const hasAnyCapability = (
  source: CapabilitySource,
  required: AppCapability[],
): boolean => {
  const set = toCapabilitySet(source);
  return required.some((capability) => set.has(capability));
};

export const getNormalizedCapabilityRole = (source?: CapabilitySource) =>
  typeof source === 'string' || source == null
    ? normalizeRole(source)
    : normalizeRole(source.role);
