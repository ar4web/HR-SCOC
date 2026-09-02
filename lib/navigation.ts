/** Shared app navigation — used by the sidebar and by the notifications popup (current-page pill). */

import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Users,
  BarChart, ListTodo, FolderOpen, Mail, Receipt, Rocket, FileText, Share2, Shield, ReceiptText, FileSignature,
} from 'lucide-react';
import { hasPermission, Permission } from '@/lib/rbac';
import { MODULE_ROUTE_MAP } from '@/lib/module-route-map';
import { UserRole } from '@/types';

export interface NavLink {
  label: { en: string; ar: string };
  route: string;
  icon: LucideIcon;
  permission?: Permission;
}

export const NAV_LINKS: NavLink[] = [
  { label: { en: 'Dashboard', ar: 'لوحة القيادة' }, route: '/', icon: LayoutDashboard },
  { label: { en: 'Employees', ar: 'الموظفون' }, route: '/employees', icon: Users },
  { label: { en: 'Tasks & Reminders', ar: 'المهام والتذكيرات' }, route: '/todos', icon: ListTodo },
  { label: { en: 'Documents', ar: 'المستندات' }, route: '/documents', icon: FolderOpen },
  { label: { en: 'Email', ar: 'البريد الإلكتروني' }, route: '/email', icon: Mail },
  { label: { en: 'Expenses', ar: 'المصروفات' }, route: '/expenses', icon: Receipt },
  { label: { en: 'Invoicing', ar: 'الفوترة' }, route: '/invoicing', icon: ReceiptText, permission: 'invoice:read' },
  { label: { en: 'Doc Printer', ar: 'طابعة المستندات' }, route: '/doc-printer', icon: FileSignature, permission: 'employee:manage' },
  { label: { en: 'Reports', ar: 'التقارير' }, route: '/reports', icon: BarChart, permission: 'reports:read' },
  { label: { en: 'Lifecycle', ar: 'دورة الحياة' }, route: '/lifecycle', icon: Rocket },
  { label: { en: 'Contracts', ar: 'العقود' }, route: '/contracts', icon: FileText, permission: 'contracts:read' },
  { label: { en: 'Org Chart', ar: 'الهيكل التنظيمي' }, route: '/organization', icon: Share2 },
  { label: { en: 'Administration', ar: 'الإدارة' }, route: '/administration', icon: Shield, permission: 'user:manage' },
];

/** Links the current user can actually see (permission + module state). */
export function visibleNavLinks(
  userRole: UserRole | undefined,
  moduleStates: Record<string, boolean | undefined>
): NavLink[] {
  return NAV_LINKS.filter((l) => {
    if (l.permission && !hasPermission(userRole, l.permission)) return false;
    const moduleId = MODULE_ROUTE_MAP[l.route];
    if (moduleId && moduleStates[moduleId] === false) return false;
    return true;
  });
}