'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { getStaffAccessDeniedRedirect } from '@/lib/staffRoles';

export default function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, isReady, user } = useAuth();
  const perms = useAdminPermissions();

  useEffect(() => {
    if (!isReady || role !== 'staff') return;
    const redirectTo = getStaffAccessDeniedRedirect(pathname, perms, user?.staffRoleId ?? null);
    if (redirectTo && pathname !== redirectTo) {
      router.replace(redirectTo);
    }
  }, [isReady, role, pathname, perms, router]);

  return <>{children}</>;
}
