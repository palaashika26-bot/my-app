'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function StaffRoute({ children }: { children: React.ReactNode }) {
  const { role, isReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;
    if (!role) {
      router.replace('/login');
      return;
    }
    if (role === 'client') {
      router.replace('/client-dashboard');
    }
  }, [isReady, role, router]);

  if (!isReady || (role !== 'staff' && role !== 'admin')) return null;
  return <>{children}</>;
}
