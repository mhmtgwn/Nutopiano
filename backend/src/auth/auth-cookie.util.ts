import type { CookieOptions } from 'express';

export const ACCESS_COOKIE = 'nutopiano_access';
export const REFRESH_COOKIE = 'nutopiano_refresh';

export const buildAuthCookieOptions = (): CookieOptions => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    path: '/',
    domain: isProd ? '.nutopiano.com' : undefined,
  };
};
