import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip middleware for NextAuth internal routes
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    cookieName: process.env.NODE_ENV === 'production'
      ? '__Secure-authjs.session-token'
      : 'authjs.session-token',
  });

  const isLoggedIn = !!token;

  // Protect dashboard and reports
  if (['/dashboard', '/reports', '/admin'].some((p) => pathname.startsWith(p))) {
    if (!isLoggedIn) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Store referral code in cookie
  const ref = req.nextUrl.searchParams.get('ref');
  const response = NextResponse.next();
  if (ref) {
    response.cookies.set('carhaki_ref', ref.toUpperCase(), {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: false,
      path: '/',
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
