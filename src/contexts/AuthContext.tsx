'use client';
/**
 * API-connected auth context for the Elios backend.
 * Works alongside the existing mock AuthContext (src/context/AuthContext.tsx)
 * which handles admin/staff flows.
 *
 * This context manages:
 *  - Backend JWT token storage (elios_access_token in localStorage)
 *  - Fetching the real logged-in user via GET /auth/me on mount
 *  - login() / logout() wired to the Elios API
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '@/lib/api/auth.api';
import { TOKEN_KEY } from '@/lib/api/axiosClient';
import type { ApiUser } from '@/lib/types/api.types';

interface ApiAuthState {
  user: ApiUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<ApiUser>;
  logout: () => Promise<void>;
}

const ApiAuthCtx = createContext<ApiAuthState | null>(null);

export function ApiAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]         = useState<ApiUser | null>(null);
  const [isLoading, setLoading] = useState(true);

  // On mount: if a token exists in localStorage, validate it with the backend
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .getMe()
      .then((res) => {
        if (res.data.success) setUser(res.data.data);
      })
      .catch(() => {
        // Token is stale/revoked — clean up silently
        localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<ApiUser> => {
    const res = await authApi.login({ email, password });
    const { user: apiUser, accessToken } = res.data.data;
    localStorage.setItem(TOKEN_KEY, accessToken);
    setUser(apiUser);
    return apiUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors — still clear local state
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    }
  }, []);

  return (
    <ApiAuthCtx.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </ApiAuthCtx.Provider>
  );
}

export function useApiAuth(): ApiAuthState {
  const ctx = useContext(ApiAuthCtx);
  if (!ctx) throw new Error('useApiAuth must be used inside <ApiAuthProvider>');
  return ctx;
}
