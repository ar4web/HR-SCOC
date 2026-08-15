import { UserRole } from '@/types';
import { signToken, verifyToken } from '@/lib/token';

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

export interface AuthPayload {
  sub: string;
  email: string;
  role?: UserRole;
  employeeId?: string;
  companyId?: string;
  exp: number;
}

export function decodeToken(token: string | null | undefined): AuthPayload | null {
  return verifyToken<AuthPayload>(token);
}

export function encodeToken(payload: Omit<AuthPayload, 'exp'>): string {
  return signToken(payload);
}

export function getRoleLabel(role: UserRole | undefined, language: 'en' | 'ar'): string {
  const labels: Record<UserRole, { en: string; ar: string }> = {
    admin: { en: 'Admin', ar: 'مدير النظام' },
    hr_manager: { en: 'HR Manager', ar: 'مدير الموارد البشرية' },
    manager: { en: 'Line Manager', ar: 'مشرف' },
    employee: { en: 'Employee', ar: 'موظف' },
  };
  if (!role) return '';
  return language === 'ar' ? labels[role].ar : labels[role].en;
}

export function authFromRequest(req: Request): AuthPayload | null {
  const auth = req.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  return decodeToken(token);
}