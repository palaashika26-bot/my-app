'use client';

import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getEffectivePermissions, type EffectivePermissions, type StaffRoleId } from '@/lib/staffRoles';

export function useAdminPermissions(): EffectivePermissions {
  const { role, user } = useAuth();
  return useMemo(
    () => getEffectivePermissions(role, (user?.staffRoleId as StaffRoleId | undefined) ?? null),
    [role, user?.staffRoleId]
  );
}
