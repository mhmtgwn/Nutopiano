import type { UserRole } from '../../core/decorators/roles.decorator';

export interface JwtPayload {
  userId: string;
  phone?: string;
  role: UserRole;
  businessId?: string | null;
}
