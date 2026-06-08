import axios, { type InternalAxiosRequestConfig } from 'axios';
import { resolveApiBaseUrl } from '../apiBase';

const TOKEN_KEY = 'elios_access_token';

// The access token is mirrored into a cookie (not only localStorage) so the
// Next.js Edge middleware can cryptographically verify the JWT — localStorage is
// invisible to middleware. The cookie is not httpOnly (client JS writes it), but
// its integrity comes from the JWT signature, which the middleware verifies
// against JWT_ACCESS_SECRET; a tampered cookie fails verification.
const TOKEN_COOKIE_MAX_AGE = 24 * 60 * 60; // seconds; matches the access-token lifetime

export function setAccessToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  const secure = window.location.protocol === 'https:' ? ';secure' : '';
  document.cookie = `${TOKEN_KEY}=${token};path=/;max-age=${TOKEN_COOKIE_MAX_AGE};samesite=lax${secure}`;
}

export function clearAccessToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=;path=/;max-age=0`;
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

// ── Token refresh ─────────────────────────────────────────────────────────────
// A dedicated, interceptor-free client used ONLY to hit /auth/refresh, so a 401
// from the refresh call itself can never recurse back into the refresh logic.
// It carries credentials so the browser sends the httpOnly `refreshToken` cookie
// (set by the backend) — that cookie, not the access token, authorizes a refresh.
const refreshClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 30000,
});

// Dedupe concurrent refreshes: on a page load many requests can 401 at once, but
// the backend ROTATES the refresh token on every call, so firing several refresh
// requests in parallel would invalidate one another. A single shared in-flight
// promise guarantees exactly one /auth/refresh round-trip per batch.
let refreshPromise: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post('/auth/refresh')
      .then((res) => {
        const newToken = res?.data?.data?.accessToken as string | undefined;
        if (newToken) {
          setAccessToken(newToken);
          return newToken;
        }
        return null;
      })
      .catch(() => null) // refresh token missing/expired/revoked → genuine logout
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Requests to these endpoints must never trigger a refresh-and-retry: a 401 from
// login/refresh is a real auth failure that should surface to the caller (e.g.
// the login form), not kick off a token refresh.
function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/google')
  );
}

function handleLogout(error: unknown) {
  const hadToken = !!localStorage.getItem(TOKEN_KEY);
  const hasStaleSession = !!localStorage.getItem('bk_role');

  clearAccessToken();
  if (hasStaleSession) {
    localStorage.removeItem('bk_role');
    localStorage.removeItem('bk_user');
    document.cookie = 'bk_role=;path=/;max-age=0';
  }

  if ((hadToken || hasStaleSession) && !window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
  return Promise.reject(error);
}

// ── Shared interceptors ──────────────────────────────────────────────────────
const tokenInterceptor = (config: any) => {
  if (typeof window !== 'undefined') {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
};

function createClient(timeout: number) {
  const client = axios.create({
    baseURL: resolveApiBaseUrl(),
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
    timeout,
  });

  client.interceptors.request.use(tokenInterceptor, (error) => Promise.reject(error));

  client.interceptors.response.use(
    (response) => response,
    async (error: any) => {
      if (typeof window === 'undefined' || error?.response?.status !== 401) {
        return Promise.reject(error);
      }

      const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

      // Transparently refresh the access token and replay the original request.
      // Only for non-auth endpoints we haven't already retried, and only when we
      // actually had a token (otherwise there is no session to refresh).
      if (
        original &&
        !original._retry &&
        !isAuthEndpoint(original.url) &&
        !!getAccessToken()
      ) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          original._retry = true;
          // Replaying through the client re-runs tokenInterceptor, which attaches
          // the freshly-refreshed access token in place of the stale one.
          return client(original);
        }
      }

      // No token, refresh failed, or a retried request still 401'd → log out.
      return handleLogout(error);
    },
  );

  return client;
}

const axiosClient = createClient(30000); // 30s for standard requests

export const uploadClient = createClient(120000); // 2 min for upload-heavy routes

export { TOKEN_KEY };
export default axiosClient;
