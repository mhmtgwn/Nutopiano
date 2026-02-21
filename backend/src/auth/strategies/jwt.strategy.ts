import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../types/jwt-payload';

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
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ej.fromExtractors([
        ej.fromAuthHeaderAsBearerToken(),
        cookieExtractor,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'NUTOPIANO_SECRET_KEY'),
    });
  }

  validate(payload: JwtPayload) {
    return payload;
  }
}
