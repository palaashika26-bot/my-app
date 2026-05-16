'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const { role, isReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;
    if (role !== 'client') router.replace('/login');
  }, [isReady, role, router]);

  if (!isReady || role !== 'client') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Verifying session…
      </div>
    );
  }

  return <>{children}</>;
}
