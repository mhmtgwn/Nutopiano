import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAdminRole } from '@/lib/role-routing';

const ACCESS_COOKIE = 'nutopiano_access';

const isAdminOnlyPath = (pathname: string) => pathname.startsWith('/admin');
const isPlatformOnlyPath = (pathname: string) => pathname.startsWith('/platform');

const redirectPlatformPath = (req: NextRequest) => {
  const redirectUrl = req.nextUrl.clone();
  redirectUrl.pathname = req.nextUrl.pathname.replace(/^\/platform\b/, '/admin');
  return NextResponse.redirect(redirectUrl, 308);
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

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (isPlatformOnlyPath(pathname)) {
    return redirectPlatformPath(req);
  }

  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  if (token && token.trim().length > 0) {
    if (isAdminOnlyPath(pathname)) {
      const role = decodeJwtRole(token);

      if (!isAdminRole(role)) {
        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = '/';
        redirectUrl.search = '';
        return NextResponse.redirect(redirectUrl);
      }
    }

    return NextResponse.next();
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.searchParams.set('next', pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/account/:path*', '/admin/:path*', '/platform/:path*', '/seller/:path*', '/dashboard/:path*', '/pos/:path*', '/panel/:path*'],
};
