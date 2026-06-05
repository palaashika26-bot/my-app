import axios from 'axios';
import { resolveApiBaseUrl } from '../apiBase';

const TOKEN_KEY = 'elios_access_token';

const axiosClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // required for httpOnly refresh-token cookie
  timeout: 15000, // 15-second timeout — prevents requests from hanging indefinitely
});

// ── Request interceptor — attach JWT from localStorage ────────────────────────
axiosClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor — handle 401 globally ────────────────────────────────
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      typeof window !== 'undefined' &&
      error?.response?.status === 401
    ) {
      const hadToken = !!localStorage.getItem(TOKEN_KEY);
      // Also detect stale sessions: user appears logged in (bk_role set)
      // but has no JWT — e.g. old staffStore session before backend login was wired up.
      const hasStaleSession = !!localStorage.getItem('bk_role');

      // Clear JWT and stale session keys
      localStorage.removeItem(TOKEN_KEY);
      if (hasStaleSession) {
        localStorage.removeItem('bk_role');
        localStorage.removeItem('bk_user');
        document.cookie = 'bk_role=;path=/;max-age=0';
      }

      // Redirect to login if user had a token that expired OR had a stale session
      if ((hadToken || hasStaleSession) && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export { TOKEN_KEY };
export default axiosClient;
