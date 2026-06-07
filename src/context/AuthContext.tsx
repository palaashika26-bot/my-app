'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { StaffRoleId } from '@/lib/staffRoles';

export type AppRole = 'client' | 'admin' | 'staff' | null;

export interface AuthUser {
  userId?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  company?: string;
  phone?: string;
  clientCity?: string;
  clientState?: string;
  clientGstin?: string;
  clientAddress?: string;
  clientPincode?: string;
  staffId?: string;
  staffRoleId?: StaffRoleId;
}

interface AuthCtx {
  role: AppRole;
  user: AuthUser | null;
  login: (role: 'client' | 'admin' | 'staff', user: AuthUser) => void;
  logout: () => void;
  isReady: boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [role, setRole] = useState<AppRole>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const r = (typeof window !== 'undefined' && localStorage.getItem('bk_role')) as AppRole;
      const u = typeof window !== 'undefined' && localStorage.getItem('bk_user');
      if (r === 'client' || r === 'admin' || r === 'staff') setRole(r);
      if (u) setUser(JSON.parse(u));
    } catch {
      /* ignore */
    }
    setIsReady(true);
  }, []);

  const login = useCallback((newRole: 'client' | 'admin' | 'staff', newUser: AuthUser) => {
    setRole(newRole);
    setUser(newUser);
    try {
      localStorage.setItem('bk_role', newRole);
      localStorage.setItem('bk_user', JSON.stringify(newUser));
      document.cookie = `bk_role=${newRole};path=/;max-age=86400`;
    } catch {
      /* ignore */
    }
  }, []);

  const logout = useCallback(() => {
    setRole(null);
    setUser(null);
    try {
      localStorage.removeItem('bk_role');
      localStorage.removeItem('bk_user');
      localStorage.removeItem('elios_access_token'); // clear JWT on explicit logout
      document.cookie = 'bk_role=;path=/;max-age=0';
      document.cookie = 'elios_access_token=;path=/;max-age=0'; // clear the middleware-verified token cookie
    } catch {
      /* ignore */
    }
    router.push('/login');
  }, [router]);

  const value = useMemo(
    () => ({ role, user, login, logout, isReady }),
    [role, user, login, logout, isReady]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be inside AuthProvider');
  return c;
}
