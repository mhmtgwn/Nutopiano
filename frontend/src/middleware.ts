import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ACCESS_COOKIE = 'nutopiano_access';

const isProtectedPath = (pathname: string) => {
  if (pathname.startsWith('/account')) return true;
  if (pathname.startsWith('/platform')) return true;
  if (pathname.startsWith('/seller')) return true;
  if (pathname.startsWith('/dashboard')) return true;
  if (pathname.startsWith('/pos')) return true;
  return false;
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  if (token && token.trim().length > 0) {
    return NextResponse.next();
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.searchParams.set('next', pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/account/:path*', '/platform/:path*', '/seller/:path*', '/dashboard/:path*', '/pos/:path*'],
};
