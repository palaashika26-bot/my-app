import axios from 'axios';

const TOKEN_KEY = 'elios_access_token';

const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
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
let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string | null) => void) {
  refreshSubscribers.push(cb);
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;

    if (typeof window === 'undefined') return Promise.reject(error);

    // If no response or not 401, reject immediately
    if (!error?.response || error.response.status !== 401) {
      return Promise.reject(error);
    }

    // Avoid infinite loop
    if (!originalRequest || (originalRequest as any)._retry) {
      // clear any stale session and redirect
      localStorage.removeItem(TOKEN_KEY);
      const hasStaleSession = !!localStorage.getItem('bk_role');
      if (hasStaleSession) {
        localStorage.removeItem('bk_role');
        localStorage.removeItem('bk_user');
        document.cookie = 'bk_role=;path=/;max-age=0';
      }
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // If a refresh is already in progress, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        addRefreshSubscriber((token) => {
          if (token) {
            if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(axiosClient(originalRequest));
          } else {
            reject(error);
          }
        });
      });
    }

    // Start refresh flow
    (originalRequest as any)._retry = true;
    isRefreshing = true;

    try {
      const refreshClient = axios.create({ baseURL: axiosClient.defaults.baseURL, withCredentials: true, timeout: 15000 });
      const resp = await refreshClient.post('/auth/refresh');
      const newAccessToken = resp?.data?.data?.accessToken;

      if (!newAccessToken) {
        // Failed to refresh — clear and redirect
        localStorage.removeItem(TOKEN_KEY);
        if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
        onRefreshed(null);
        isRefreshing = false;
        return Promise.reject(error);
      }

      // Persist new access token and retry queued requests
      localStorage.setItem(TOKEN_KEY, newAccessToken);
      onRefreshed(newAccessToken);
      isRefreshing = false;

      if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return axiosClient(originalRequest);
    } catch (refreshError) {
      isRefreshing = false;
      onRefreshed(null);
      localStorage.removeItem(TOKEN_KEY);
      if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
      return Promise.reject(refreshError);
    }
  }
);

export { TOKEN_KEY };
export default axiosClient;
