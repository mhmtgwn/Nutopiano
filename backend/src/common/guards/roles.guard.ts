import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, type UserRole } from '../decorators/roles.decorator';
import { ROLES, type RoleType } from '../constants/roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  private normalize(role?: string | null): RoleType | null {
    if (!role) return null;
    return role in ROLES ? (role as RoleType) : null;
  }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: { role?: string } }>();
    const actual = this.normalize(user?.role);
    if (!actual) return false;
    if (actual === ROLES.SUPER_ADMIN) {
      return true;
    }

    const normalizedRequired = requiredRoles
      .map((r) => this.normalize(r))
      .filter((r): r is RoleType => r !== null);

    if (normalizedRequired.length === 0) {
      return true;
    }

    return normalizedRequired.includes(actual);
  }
}
