import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../types/jwt-payload';
import { JsonLoggerService } from '../../common/logger/json-logger.service';
import { PermissionGroupService } from '../../modules/permission-groups/permission-group.service';
import {
  normalizeRole,
  toEffectiveRole,
  toLegacyCompatRole,
} from '@common/authz';
import { ROLES } from '@common/constants/roles';

const COOKIE_ACCESS_TOKEN = 'nutopiano_access';

type JwtExtractor = (req: unknown) => string | null;
type ExtractJwtModule = {
  fromAuthHeaderAsBearerToken: () => JwtExtractor;
  fromExtractors: (extractors: JwtExtractor[]) => JwtExtractor;
};

const ej = ExtractJwt as unknown as ExtractJwtModule;

const cookieExtractor: JwtExtractor = (req: unknown): string | null => {
  try {
    const token = (req as { cookies?: Record<string, unknown> } | null)
      ?.cookies?.[COOKIE_ACCESS_TOKEN];
    if (typeof token === 'string' && token.trim().length > 0) return token;
    return null;
  } catch {
    return null;
  }
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new JsonLoggerService(JwtStrategy.name);

  constructor(
    config: ConfigService,
    private readonly permissionGroupService: PermissionGroupService,
  ) {
    super({
      jwtFromRequest: ej.fromExtractors([
        ej.fromAuthHeaderAsBearerToken(),
        cookieExtractor,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'NUTOPIANO_SECRET_KEY'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const userId = Number(payload.userId);
    const normalizedRole = normalizeRole(payload.role);
    const effectiveRole = toEffectiveRole(payload.role);
    const compatRole = toLegacyCompatRole(payload.role) ?? payload.role;
    let resolvedPermissions: string[] = [];

    if (Number.isFinite(userId) && userId > 0) {
      try {
        resolvedPermissions =
          await this.permissionGroupService.resolveForUser(userId);
      } catch (error) {
        this.logger.error(
          {
            stage: 'profile.permission_resolve',
            userId,
            businessId: payload.businessId ?? null,
          },
          error instanceof Error ? error.stack : undefined,
          JwtStrategy.name,
        );
        throw error;
      }
    }

    return {
      ...payload,
      role: compatRole === ROLES.SELLER_STAFF ? ROLES.USER : compatRole,
      normalizedRole,
      effectiveRole,
      resolvedPermissions,
    };
  }
}
