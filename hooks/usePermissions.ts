'use client';

import { useAuthStore } from '@/stores/auth-store';
import { hasPermission, Permission, canAccess } from '@/lib/permissions';
import { UserRole } from '@/types';

export function usePermissions() {
  const { user } = useAuthStore();

  const check = (permission: Permission): boolean => {
    if (!user?.role) return false;
    return hasPermission(user.role, permission);
  };

  const checkRole = (minRole: UserRole): boolean => {
    if (!user?.role) return false;
    return canAccess(user.role, minRole);
  };

  const isAdmin = user?.role === 'admin';
  const isHRManager = user?.role === 'hr_manager' || isAdmin;
  const isManager = user?.role === 'manager' || isHRManager;
  const isEmployee = user?.role === 'employee';

  return {
    check,
    checkRole,
    role: user?.role,
    isAdmin,
    isHRManager,
    isManager,
    isEmployee,
  };
}

export function useModuleAccess(moduleId: string) {
  const { check } = usePermissions();
  
  const modulePermissions: Record<string, Permission> = {
    employees: 'employee:view_all',
    leaves: 'leave:approve',
    attendance: 'employee:view_all',
    payroll: 'payroll:view',
    contracts: 'contracts:read',
    lifecycle: 'employee:view_all',
    documents: 'employee:view_all',
    expenses: 'expense:view',
    reports: 'reports:read',
    administration: 'user:manage',
    todos: 'dashboard:read',
    communication: 'dashboard:read',
    reminders: 'dashboard:read',
    email: 'settings:manage',
    settings: 'settings:manage',
    dashboard: 'dashboard:read',
    me: 'employee:view_own',
  };

  const permission = modulePermissions[moduleId];
  return permission ? check(permission) : true;
}