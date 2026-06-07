import axios from 'axios';
import { resolveApiBaseUrl } from '../apiBase';

const TOKEN_KEY = 'elios_access_token';

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

    localStorage.removeItem(TOKEN_KEY);
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
