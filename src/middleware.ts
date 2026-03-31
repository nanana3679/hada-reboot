import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

const PROTECTED_PATHS = ['/settings', '/study'];

function isProtectedPath(pathname: string): boolean {
  const segments = pathname.split('/');
  return PROTECTED_PATHS.some((path) => segments.includes(path.slice(1)));
}

export default async function middleware(request: NextRequest) {
  if (isProtectedPath(request.nextUrl.pathname)) {
    const sessionToken =
      request.cookies.get('authjs.session-token') ??
      request.cookies.get('__Secure-authjs.session-token');

    if (!sessionToken) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlMiddleware(request);
}

export const runtime = 'edge';

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)',],
};
