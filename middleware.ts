import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Rate limiting store (in-memory, use Redis in production)
const ipRequestCounts = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute per IP

// Security headers
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// Paths that require authentication
const protectedPaths = ['/dashboard', '/conversations', '/groups', '/profile'];

// Paths that are public (auth routes where logged-in users should be redirected away)
const authPaths = ['/auth/signin', '/auth/register'];

function isProtectedPath(pathname: string): boolean {
  return protectedPaths.some((path) => pathname.startsWith(path));
}

function isAuthPath(pathname: string): boolean {
  return authPaths.some((path) => pathname.startsWith(path));
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const requestData = ipRequestCounts.get(ip);

  if (!requestData || now - requestData.timestamp > RATE_LIMIT_WINDOW) {
    ipRequestCounts.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (requestData.count >= RATE_LIMIT_MAX) {
    return false;
  }

  requestData.count++;
  return true;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Fast path: Skip middleware entirely for API routes and auth routes
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Only check auth for protected paths - otherwise return immediately
  if (!isProtectedPath(pathname) && !isAuthPath(pathname)) {
    return NextResponse.next();
  }

  // Check authentication using NextAuth JWT token
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Redirect unauthenticated users from protected routes to signin
  if (isProtectedPath(pathname) && !token) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect authenticated users from auth pages to dashboard
  if (isAuthPath(pathname) && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Return immediately - no heavy processing
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Only match pages that need auth checking
    '/dashboard/:path*',
    '/conversations/:path*',
    '/groups/:path*',
    '/profile/:path*',
    '/admin/:path*',
    '/auth/signin',
    '/auth/register',
  ],
};
