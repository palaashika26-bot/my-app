import axios from 'axios';
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

// ── Shared interceptors ──────────────────────────────────────────────────────
const tokenInterceptor = (config: any) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
};

const unauthorizedInterceptor = (error: any) => {
  if (
    typeof window !== 'undefined' &&
    error?.response?.status === 401
  ) {
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
  }
  return Promise.reject(error);
};

function createClient(timeout: number) {
  const client = axios.create({
    baseURL: resolveApiBaseUrl(),
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
    timeout,
  });
  client.interceptors.request.use(tokenInterceptor, (error) => Promise.reject(error));
  client.interceptors.response.use((response) => response, unauthorizedInterceptor);
  return client;
}

const axiosClient = createClient(30000); // 30s for standard requests

export const uploadClient = createClient(120000); // 2 min for upload-heavy routes

export { TOKEN_KEY };
export default axiosClient;
