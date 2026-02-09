import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { STAFF_SELF_KEY, StaffSelfCheck } from '../decorators/staff-self.decorator';

@Injectable()
export class StaffSelfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const check = this.reflector.getAllAndOverride<StaffSelfCheck>(STAFF_SELF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!check) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload; params?: Record<string, string> }>();
    const user = request.user;

    if (!user || user.role !== 'STAFF') {
      return true;
    }

    const paramValue = request.params?.[check.param];
    if (!paramValue) {
      throw new ForbiddenException('Access denied');
    }

    if (check.type === 'id') {
      if (Number(paramValue) !== Number(user.userId)) {
        throw new ForbiddenException('Access denied');
      }
      return true;
    }

    if (paramValue !== user.phone) {
      throw new ForbiddenException('Access denied');
    }
    return true;
  }
}
