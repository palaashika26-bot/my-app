import axios, { type InternalAxiosRequestConfig } from 'axios';
import { resolveApiBaseUrl } from '../apiBase';

const TOKEN_KEY = 'elios_access_token';

// The access token is mirrored into a cookie (not only localStorage) so the
// Next.js Edge middleware can cryptographically verify the JWT — localStorage is
// invisible to middleware. The cookie is not httpOnly (client JS writes it), but
// its integrity comes from the JWT signature, which the middleware verifies
// against JWT_ACCESS_SECRET; a tampered cookie fails verification.

// Safari ITP (Intelligent Tracking Prevention) restricts third-party cookies,
// but first-party cookies should work. We set Path=/ to ensure it's treated as
// first-party and avoid SameSite=None which requires Secure flag.
const TOKEN_COOKIE_MAX_AGE = 24 * 60 * 60; // seconds; matches the access-token lifetime

export function setAccessToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  
  // Set cookie with proper handling for Safari and other browsers
  const secure = window.location.protocol === 'https:' ? ';Secure' : '';
  // Use SameSite=Lax (not Strict) to allow cross-site requests while Safari ITP doesn't block this
  document.cookie = `${TOKEN_KEY}=${token};Path=/;Max-Age=${TOKEN_COOKIE_MAX_AGE};SameSite=Lax${secure}`;
  
  // Log for debugging
  console.log('[auth] Access token set to cookie and localStorage');
}

export function clearAccessToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=;Path=/;Max-Age=0`;
  console.log('[auth] Access token cleared');
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    // Try to extract from cookie as fallback (useful if localStorage was cleared)
    const cookieValue = document.cookie.split('; ').find(row => row.startsWith(`${TOKEN_KEY}=`))?.split('=')[1];
    if (cookieValue) {
      console.log('[auth] Token recovered from cookie');
      localStorage.setItem(TOKEN_KEY, cookieValue);
      return cookieValue;
    }
  }
  return token;
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
          console.log('[auth] Token refreshed successfully');
          return newToken;
        }
        console.warn('[auth] Refresh response missing accessToken');
        return null;
      })
      .catch((err) => {
        console.error('[auth] Token refresh failed:', err.response?.status || err.message);
        return null;
      }) // refresh token missing/expired/revoked → genuine logout
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
    document.cookie = 'bk_role=;Path=/;Max-Age=0';
  }

  if ((hadToken || hasStaleSession) && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    console.log('[auth] Session invalid, redirecting to login');
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

// Pull the *real* failure detail out of an axios error. Axios sets err.message to
// a generic "Request failed with status code 422" and hides the server's actual
// response under err.response.data ({ message, errors }). Callers that only look
// at err.message therefore show users a meaningless "please try again" and log
// nothing useful — which is exactly why mobile submit failures were undiagnosable.
export interface ApiErrorInfo {
  status?: number;
  /** Best human-readable message: server message → field errors → axios message. */
  message: string;
  /** Field-level validation messages from the backend, if any. */
  fieldErrors: string[];
  isNetworkError: boolean;
  isTimeout: boolean;
}

export function describeApiError(error: any): ApiErrorInfo {
  const status: number | undefined = error?.response?.status;
  const data = error?.response?.data;

  // Backend shapes: errorHandler → { message }, validate → { message:'Validation
  // failed', errors:[{field,message}] }. Normalise both into a flat string list.
  const fieldErrors: string[] = Array.isArray(data?.errors)
    ? data.errors.map((e: any) =>
        typeof e === 'string' ? e : [e?.field, e?.message].filter(Boolean).join(': ')
      )
    : [];

  const serverMessage: string | undefined =
    typeof data?.message === 'string' ? data.message : undefined;

  const isTimeout = error?.code === 'ECONNABORTED';
  const isNetworkError = error?.code === 'ERR_NETWORK' || (!error?.response && !isTimeout);

  const message =
    fieldErrors.length > 0
      ? `${serverMessage ?? 'Validation failed'}: ${fieldErrors.join('; ')}`
      : serverMessage ??
        (isTimeout
          ? 'The server took too long to respond.'
          : isNetworkError
          ? 'Network error — could not reach the server.'
          : error?.message ?? 'Unknown error');

  return { status, message, fieldErrors, isNetworkError, isTimeout };
}

// Log network errors with details for debugging mobile issues
function logNetworkError(error: any, endpoint: string): void {
  const status = error?.response?.status;
  const statusText = error?.response?.statusText;
  const message = error?.message;
  const isNetworkError = error?.code === 'ERR_NETWORK' || !error?.response;
  
  const errorDetails = {
    endpoint,
    status,
    statusText,
    message,
    isNetworkError,
    isTimeout: error?.code === 'ECONNABORTED',
    isMobile: typeof navigator !== 'undefined' && /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  };
  
  console.error('[axios] Request failed:', errorDetails);
}

function createClient(timeout: number) {
  const client = axios.create({
    baseURL: resolveApiBaseUrl(),
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
    timeout,
  });

  client.interceptors.request.use(tokenInterceptor, (error) => {
    console.error('[axios] Request interceptor error:', error);
    return Promise.reject(error);
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: any) => {
      const endpoint = error?.config?.url || 'unknown';
      
      if (typeof window === 'undefined') {
        logNetworkError(error, endpoint);
        return Promise.reject(error);
      }

      // Log all errors for debugging
      if (error?.response?.status !== 401) {
        logNetworkError(error, endpoint);
      }

      // Only attempt refresh for 401 on non-auth endpoints
      if (error?.response?.status !== 401) {
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
        console.log(`[axios] Token expired, attempting refresh for ${endpoint}`);
        const newToken = await refreshAccessToken();
        if (newToken) {
          original._retry = true;
          console.log(`[axios] Token refreshed, retrying ${endpoint}`);
          // Replaying through the client re-runs tokenInterceptor, which attaches
          // the freshly-refreshed access token in place of the stale one.
          return client(original);
        }
      }

      // No token, refresh failed, or a retried request still 401'd → log out.
      console.warn(`[axios] Token refresh failed or missing for ${endpoint}, logging out`);
      return handleLogout(error);
    },
  );

  return client;
}

const axiosClient = createClient(30000); // 30s for standard requests

export const uploadClient = createClient(120000); // 2 min for upload-heavy routes

export { TOKEN_KEY };
export default axiosClient;
