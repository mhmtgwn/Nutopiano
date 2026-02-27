import type { RoleType } from '../../common/constants/roles';

export interface JwtPayload {
  userId: string;
  phone?: string;
  role: RoleType;
  businessId?: string | null;
}
