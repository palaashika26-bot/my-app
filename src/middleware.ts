import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Name of the cookie that mirrors the access-token JWT (set by the client in
// src/lib/api/axiosClient.ts). localStorage is invisible to Edge middleware, so
// the signed token is mirrored into this cookie purely so it can be verified here.
const ACCESS_TOKEN_COOKIE = 'elios_access_token';

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/catalog'];

// ── Edge-compatible HS256 JWT verification (Web Crypto, no Node-only deps) ─────
function base64UrlToBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b64url.length / 4) * 4, '=');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

interface AccessPayload {
  userId?: string;
  role?: string;
  exp?: number;
}

// Verifies the HMAC-SHA256 signature and expiry. Returns the payload only when
// the signature is valid and the token is unexpired; otherwise null.
async function verifyAccessToken(token: string, secret: string): Promise<AccessPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToBytes(sigB64),
      new TextEncoder().encode(`${headerB64}.${payloadB64}`),
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadB64))) as AccessPayload;
    if (typeof payload.exp === 'number' && Date.now() >= payload.exp * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

function redirectToLogin(request: NextRequest, pathname: string) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))) {
    return NextResponse.next();
  }

  const secret = process.env.JWT_ACCESS_SECRET;
  // Fail closed: without the shared signing secret we cannot verify any session,
  // so protected routes require (re)authentication rather than trusting a cookie.
  if (!secret) {
    console.error(
      '[middleware] JWT_ACCESS_SECRET is not set — cannot verify sessions. ' +
        'Set it in the frontend environment; it must match the backend value.',
    );
    return redirectToLogin(request, pathname);
  }

  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const payload = token ? await verifyAccessToken(token, secret) : null;
  const role = payload?.role ?? null; // 'ADMIN' | 'STAFF' | 'CLIENT' (from the signed JWT)

  // No valid, unexpired, correctly-signed token → not authenticated.
  if (!role) {
    return redirectToLogin(request, pathname);
  }

  // Role-based gating, driven entirely by the verified JWT (never a plain cookie).
  if (pathname.startsWith('/admin') && role !== 'ADMIN' && role !== 'STAFF') {
    return redirectToLogin(request, pathname);
  }
  if (pathname.startsWith('/client-dashboard') && role !== 'CLIENT') {
    return redirectToLogin(request, pathname);
  }
  if (pathname.startsWith('/staff') && role !== 'STAFF') {
    return redirectToLogin(request, pathname);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/client-dashboard/:path*', '/staff/:path*'],
};
