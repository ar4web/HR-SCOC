'use client';

import React from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter, usePathname } from 'next/navigation';
import { hasPermission, Permission, UserRole } from '@/lib/permissions';

interface PermissionGuardProps {
  permission: Permission;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGuard({ permission, fallback, children }: PermissionGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!isLoading && isAuthenticated && user && !hasPermission(user.role, permission)) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, user, permission, router]);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated || !user || !hasPermission(user.role, permission)) {
    return fallback ?? null;
  }

  return <>{children}</>;
}

interface RoleGuardProps {
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, fallback, children }: RoleGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && isAuthenticated && user && !allowedRoles.includes(user.role)) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, router]);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated || !user || !allowedRoles.includes(user.role)) {
    return fallback ?? null;
  }

  return <>{children}</>;
}