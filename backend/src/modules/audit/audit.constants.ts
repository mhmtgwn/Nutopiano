export const AUDIT_ACTION_TYPES = {
  PUBLISH_FORCE: 'publish-force',
  STOCK_ADJUST_FORCE: 'stock-adjust-force',
  ROLE_CHANGE: 'role-change',
} as const;

export type AuditActionType =
  (typeof AUDIT_ACTION_TYPES)[keyof typeof AUDIT_ACTION_TYPES];
