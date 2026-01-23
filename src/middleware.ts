import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SITE_SESSION_COOKIE = 'slovd_site_session';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/api/site/auth'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check for site session cookie
  const session = request.cookies.get(SITE_SESSION_COOKIE);

  if (!session?.value) {
    // Redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify session is not expired
  const [, expiresAt] = session.value.split(':');
  const expiry = parseInt(expiresAt, 10);

  if (isNaN(expiry) || Date.now() > expiry) {
    // Session expired, redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(SITE_SESSION_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
