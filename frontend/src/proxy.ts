import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAdminRole } from '@/lib/role-routing';

const ACCESS_COOKIE = 'nutopiano_access';
const NO_STORE_CACHE_CONTROL = 'no-store, must-revalidate, no-cache, max-age=0, private';

const isAdminOnlyPath = (pathname: string) => pathname.startsWith('/admin');
const isPlatformOnlyPath = (pathname: string) => pathname.startsWith('/platform');
const STATIC_PATH_PREFIXES = ['/_next/', '/api/'];
const STATIC_EXACT_PATHS = ['/favicon.ico', '/manifest.webmanifest', '/robots.txt', '/sitemap.xml'];

const redirectPlatformPath = (req: NextRequest) => {
  const redirectUrl = req.nextUrl.clone();
  redirectUrl.pathname = req.nextUrl.pathname.replace(/^\/platform\b/, '/admin');
  return NextResponse.redirect(redirectUrl, 308);
};

const hasFileExtension = (pathname: string) => /\.[A-Za-z0-9]+$/.test(pathname);

const isStaticRequestPath = (pathname: string) => {
  if (STATIC_EXACT_PATHS.includes(pathname)) return true;
  if (STATIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return hasFileExtension(pathname);
};

const isDocumentRequest = (request: NextRequest) => {
  const destination = request.headers.get('sec-fetch-dest');
  if (destination === 'document') return true;

  const accept = request.headers.get('accept') ?? '';
  return accept.includes('text/html');
};

const decodeJwtRole = (token: string): string | null => {
  try {
    const segments = token.split('.');
    if (segments.length < 2) return null;

    const base64Url = segments[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const paddingLength = (4 - (base64.length % 4)) % 4;
    const padded = `${base64}${'='.repeat(paddingLength)}`;
    const decoded = atob(padded);
    const payload = JSON.parse(decoded) as { role?: unknown };

    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
};

const isProtectedPath = (pathname: string) => {
  if (pathname.startsWith('/account')) return true;
  if (pathname.startsWith('/admin')) return true;
  if (pathname.startsWith('/platform')) return true;
  if (pathname.startsWith('/seller')) return true;
  if (pathname.startsWith('/dashboard')) return true;
  if (pathname.startsWith('/pos')) return true;
  if (pathname.startsWith('/panel')) return true;
  return false;
};

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isStaticRequestPath(pathname)) {
    return NextResponse.next();
  }

  let response: NextResponse;

  if (!isProtectedPath(pathname)) {
    response = NextResponse.next();
  } else if (isPlatformOnlyPath(pathname)) {
    response = redirectPlatformPath(req);
  } else {
    const token = req.cookies.get(ACCESS_COOKIE)?.value;
    if (token && token.trim().length > 0) {
      if (isAdminOnlyPath(pathname)) {
        const role = decodeJwtRole(token);

        if (!isAdminRole(role)) {
          const redirectUrl = req.nextUrl.clone();
          redirectUrl.pathname = '/';
          redirectUrl.search = '';
          response = NextResponse.redirect(redirectUrl);
        } else {
          response = NextResponse.next();
        }
      } else {
        response = NextResponse.next();
      }
    } else {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('next', pathname);
      response = NextResponse.redirect(loginUrl);
    }
  }

  if (isDocumentRequest(req)) {
    response.headers.set('Cache-Control', NO_STORE_CACHE_CONTROL);
  }

  return response;
}

export const config = {
  matcher: '/:path*',
};
