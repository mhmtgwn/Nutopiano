import { SetMetadata } from '@nestjs/common';

import { type RoleType } from '../../common/constants/roles';

export const ROLES_KEY = 'roles';
// Backward-compatible role type. Prefer RoleType values, keep 'ADMIN' for legacy controllers.
export type UserRole = RoleType | 'ADMIN';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
