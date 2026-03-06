import type { RoleType } from '../../common/constants/roles';

export interface JwtPayload {
  userId: string;
  phone?: string;
  role: RoleType;
  businessId?: string | null;
  normalizedRole?: RoleType | null;
  effectiveRole?: RoleType | null;
  resolvedPermissions?: string[];
}
