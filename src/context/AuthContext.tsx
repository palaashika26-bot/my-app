'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Role = 'client' | 'admin' | null;
interface User { name: string; email: string; company?: string; }
interface AuthCtx {
  role: Role;
  user: User | null;
  login: (role: 'client' | 'admin', user: User) => void;
  logout: () => void;
  isReady: boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const r = (typeof window !== 'undefined' && localStorage.getItem('bk_role')) as Role;
      const u = typeof window !== 'undefined' && localStorage.getItem('bk_user');
      if (r) setRole(r);
      if (u) setUser(JSON.parse(u));
    } catch {}
    setIsReady(true);
  }, []);

  const login = useCallback((newRole: 'client' | 'admin', newUser: User) => {
    setRole(newRole);
    setUser(newUser);
    try {
      localStorage.setItem('bk_role', newRole);
      localStorage.setItem('bk_user', JSON.stringify(newUser));
      document.cookie = `bk_role=${newRole};path=/;max-age=86400`;
    } catch {}
  }, []);

  const logout = useCallback(() => {
    setRole(null);
    setUser(null);
    try {
      localStorage.removeItem('bk_role');
      localStorage.removeItem('bk_user');
      document.cookie = 'bk_role=;path=/;max-age=0';
    } catch {}
    router.push('/login');
  }, [router]);

  return <Ctx.Provider value={{ role, user, login, logout, isReady }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be inside AuthProvider');
  return c;
}
