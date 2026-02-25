import type { Request, Response } from 'express';
import csurf from 'csurf';

const CSRF_TOKEN_COOKIE = '__csrf';
const CSRF_SECRET_COOKIE = '__csrf_secret';

export function csrfMiddleware() {
  if (process.env.NODE_ENV === 'test') {
    return [
      (req: Request, _res: Response, next: (err?: unknown) => void) => next(),
    ];
  }

  const isProd = process.env.NODE_ENV === 'production';
  const cookieDomain = isProd ? '.nutopiano.com' : undefined;

  const csurfProtection = csurf({
    cookie: {
      key: CSRF_SECRET_COOKIE,
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      path: '/',
      domain: cookieDomain,
    },
  });

  return [
    (req: Request, _res: Response, next: (err?: unknown) => void) => {
      const url = req.originalUrl ?? '';
      const method = String(req.method ?? 'GET').toUpperCase();
      const isUnsafeMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

      // CSRF is relevant for cookie-based browser sessions.
      // If request uses Authorization bearer token, skip CSRF.
      const authHeader = req.headers['authorization'];
      if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
        return next();
      }

      // Auth mutation endpoints (login/register/refresh/logout/forgot/reset) must work without CSRF.
      // Safe auth requests (e.g. GET /auth/profile) should pass through csurf to mint token cookies.
      if (
        isUnsafeMethod &&
        (url.includes('/auth/') ||
          url.startsWith('/api/auth/') ||
          url.startsWith('/api/v1/auth/'))
      ) {
        return next();
      }

      // Third-party webhooks cannot provide CSRF token.
      if (
        url.startsWith('/api/payments/webhooks') ||
        url.startsWith('/api/v1/payments/webhooks')
      ) {
        return next();
      }
      return csurfProtection(req, _res, next);
    },
    (req: Request, res: Response, next: (err?: unknown) => void) => {
      try {
        const fn = (req as Request & { csrfToken?: () => string }).csrfToken;
        if (typeof fn !== 'function') {
          return next();
        }

        const token = fn();
        res.cookie(CSRF_TOKEN_COOKIE, token, {
          httpOnly: false,
          secure: isProd,
          sameSite: isProd ? 'strict' : 'lax',
          path: '/',
          domain: cookieDomain,
        });
        next();
      } catch (err: unknown) {
        next(err);
      }
    },
  ];
}
