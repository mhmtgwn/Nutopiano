import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ROLES, type RoleType } from '../constants/roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  private normalize(role?: string | null): RoleType | null {
    if (!role) return null;

    // Backward-compatibility for legacy roles used across controllers.
    if (role === 'ADMIN') {
      return ROLES.SUPER_ADMIN;
    }

    // Allow passing through the new role names.
    if (role in ROLES) {
      return role as RoleType;
    }

    return null;
  }

  private expandRequiredRoles(required: string[]): RoleType[] {
    const expanded = new Set<RoleType>();

    for (const r of required) {
      if (r === 'ADMIN') {
        // Legacy "ADMIN" should authorize both platform admin and seller/business admin.
        expanded.add(ROLES.SUPER_ADMIN);
        expanded.add(ROLES.SELLER);
        continue;
      }

      if (r === 'STAFF') {
        expanded.add(ROLES.STAFF);
        continue;
      }

      if (r === 'CUSTOMER') {
        expanded.add(ROLES.CUSTOMER);
        continue;
      }

      if (r in ROLES) {
        expanded.add(r as RoleType);
      }
    }

    return [...expanded];
  }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
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

    const expandedRequired = this.expandRequiredRoles(requiredRoles);
    return expandedRequired.includes(actual);
  }
}
