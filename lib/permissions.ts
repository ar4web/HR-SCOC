import { UserRole } from '@/types';

export type { UserRole } from '@/types';
export const ROLE_RANK: Record<UserRole, number> = {
  admin: 1,
  hr_manager: 2,
  manager: 3,
  employee: 4,
};

export type Permission =
  | 'employee:view_all'
  | 'employee:manage'
  | 'employee:view_own'
  | 'leave:approve'
  | 'payroll:view'
  | 'payroll:manage'
  | 'settings:manage'
  | 'user:manage'
  | 'expense:approve'
  | 'expense:manage'
  | 'expense:view'
  | 'module:manage'
  | 'dashboard:read'
  | 'reports:read'
  | 'contracts:read'
  | 'contracts:write';

const PERMISSION_ROLES: Record<Permission, UserRole[]> = {
  'employee:view_all': ['admin', 'hr_manager'],
  'employee:manage': ['admin', 'hr_manager', 'manager'],
  'employee:view_own': ['employee'],
  'leave:approve': ['admin', 'hr_manager', 'manager'],
  'payroll:view': ['admin', 'hr_manager', 'manager', 'employee'],
  'payroll:manage': ['admin', 'hr_manager'],
  'settings:manage': ['admin', 'hr_manager'],
  'user:manage': ['admin'],
  'expense:approve': ['admin', 'hr_manager'],
  'expense:manage': ['admin', 'hr_manager', 'manager', 'employee'],
  'expense:view': ['admin', 'hr_manager', 'manager', 'employee'],
  'module:manage': ['admin', 'hr_manager'],
  'dashboard:read': ['admin', 'hr_manager', 'manager', 'employee'],
  'reports:read': ['admin', 'hr_manager', 'manager'],
  'contracts:read': ['admin', 'hr_manager', 'manager'],
  'contracts:write': ['admin', 'hr_manager'],
};

export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return PERMISSION_ROLES[permission].includes(role);
}

export function canAccess(role: UserRole | undefined, minRank: UserRole): boolean {
  if (!role) return false;
  return ROLE_RANK[role] <= ROLE_RANK[minRank];
}