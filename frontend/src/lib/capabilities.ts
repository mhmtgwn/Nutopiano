import { getEffectiveRole, type EffectiveAppRole } from './role-routing';

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

const ALL_CAPABILITIES = [...CAPABILITIES] as AppCapability[];

const ROLE_CAPABILITY_MAP: Record<EffectiveAppRole, AppCapability[]> = {
  ADMIN: [
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
  ],
  SELLER_STAFF: ['USE_POS'],
  SELLER: [
    'VIEW_FINANCE',
    'PROCESS_RETURN',
    'CLOSE_REGISTER',
    'VIEW_REPORTS',
    'USE_POS',
  ],
  CUSTOMER: [],
};

const toCapabilitySet = (role?: string | null) => {
  const normalized = getEffectiveRole(role);
  if (!normalized) {
    return new Set<AppCapability>();
  }
  const capabilities = ROLE_CAPABILITY_MAP[normalized] ?? [];
  return new Set<AppCapability>(capabilities);
};

export const getCapabilitiesForRole = (role?: string | null): AppCapability[] =>
  Array.from(toCapabilitySet(role));

export const hasCapability = (
  role: string | null | undefined,
  capability: AppCapability,
): boolean => toCapabilitySet(role).has(capability);

export const hasAllCapabilities = (
  role: string | null | undefined,
  required: AppCapability[],
): boolean => {
  const set = toCapabilitySet(role);
  return required.every((capability) => set.has(capability));
};

export const hasAnyCapability = (
  role: string | null | undefined,
  required: AppCapability[],
): boolean => {
  const set = toCapabilitySet(role);
  return required.some((capability) => set.has(capability));
};
