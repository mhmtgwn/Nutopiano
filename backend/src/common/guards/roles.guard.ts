import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, type UserRole } from '../decorators/roles.decorator';
import { toEffectiveRole } from '../authz';
import { type RoleType } from '../constants/roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

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
    const actual = toEffectiveRole(user?.role);
    if (!actual) return false;

    const normalizedRequired = requiredRoles
      .map((r) => toEffectiveRole(r))
      .filter((r): r is RoleType => r !== null);

    if (normalizedRequired.length === 0) {
      return true;
    }

    return normalizedRequired.includes(actual);
  }
}
