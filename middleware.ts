import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// App running mode: HUB, FREE, STANDARD, or ENTERPRISE (defaults to FREE)
// HUB: registration portal is publicly accessible; other modes require auth for app routes
// Backwards-compat: respect legacy IS_HUB=true if APP_MODE is not set
const APP_MODE = (
  process.env.APP_MODE || (process.env.IS_HUB === 'true' ? 'HUB' : 'FREE')
).toUpperCase();
// Helper boolean for convenience
const IS_HUB = APP_MODE === 'HUB';

// Hub mode routes (tenant registration wizard)
const hubOnlyPaths = [
  '/register/plan',
  '/register/organization',
  '/register/admin',
  '/register/success',
];

// Always public paths (both modes)
const alwaysPublicPaths = ['/api', '/_next', '/favicon'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow API routes, static files, and Next.js internals in all modes
  if (
    alwaysPublicPaths.some((path) => pathname.startsWith(path)) ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  if (IS_HUB) {
    // ==================== HUB MODE ====================
    // Only allow registration wizard routes + root redirect

    // Root redirects to registration start
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/register/plan', request.url));
    }

    // Allow hub-only paths (registration wizard)
    if (hubOnlyPaths.some((path) => pathname.startsWith(path))) {
      return NextResponse.next();
    }

    // Block all other routes in hub mode - redirect to registration
    return NextResponse.redirect(new URL('/register/plan', request.url));
  }

// ==================== NON-HUB MODES (FREE/STANDARD/ENTERPRISE) ====================
// Normal app behavior with authentication (registration wizard blocked)

  // Registration routes behavior:
  // - `/register` (index) is allowed in non-HUB modes (e.g., FREE) for a lightweight entry page.
  // - subpaths `/register/*` (wizard steps) are only allowed in HUB mode.
  // NOTE: API proxies under `/api/register/*` and `/api/auth/register` remain public and should be handled safely by backend services.
  if (pathname === '/register') {
    return NextResponse.next();
  }

  // Block wizard pages in non-HUB modes
  if (pathname.startsWith('/register/') && !IS_HUB) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Allow login page without auth
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // Check for JWT token in cookies for protected routes
  const token = request.cookies.get('token');
  if (!token) {
    // Redirect to /login if not authenticated
    return NextResponse.redirect(new URL('/login', request.url));
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
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'
  ],
};
