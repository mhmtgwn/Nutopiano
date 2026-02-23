import { SetMetadata } from '@nestjs/common';

import { type RoleType } from '../../common/constants/roles';

export const ROLES_KEY = 'roles';
export type UserRole = RoleType;

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
