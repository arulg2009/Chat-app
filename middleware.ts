import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
const protectedPaths = ['/dashboard', '/api/users', '/api/conversations', '/api/ai'];

// Paths that are public
const publicPaths = ['/', '/auth/signin', '/auth/register', '/auth/error', '/api/auth'];

function isProtectedPath(pathname: string): boolean {
  return protectedPaths.some((path) => pathname.startsWith(path));
}

function isPublicPath(pathname: string): boolean {
  return publicPaths.some((path) => pathname.startsWith(path));
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';

  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    if (!checkRateLimit(ip)) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json', ...securityHeaders },
        }
      );
    }
  }

  // Create response with security headers
  const response = NextResponse.next();
  
  // Add security headers to all responses
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add CSP header (relaxed for development)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.anthropic.com;"
    );
  }

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files and _next
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
