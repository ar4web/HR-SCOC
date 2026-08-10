'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguageStore } from '@/stores/language-store';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { hasPermission, Permission } from '@/lib/rbac';
import { cn, t } from '@/lib/utils';
import {
  LayoutDashboard, Users,
  BarChart, Settings, Shield, X,
  ListTodo, FolderOpen, Mail, Receipt, Bell, AlarmClock, Rocket, Share2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavLink {
  label: { en: string; ar: string };
  route: string;
  icon: LucideIcon;
  permission?: Permission;
}

const links: NavLink[] = [
  { label: { en: 'Dashboard', ar: 'لوحة القيادة' }, route: '/', icon: LayoutDashboard },
  { label: { en: 'Employees', ar: 'الموظفون' }, route: '/employees', icon: Users },
  { label: { en: 'To-Do', ar: 'المهام' }, route: '/todos', icon: ListTodo },
  { label: { en: 'Documents', ar: 'المستندات' }, route: '/documents', icon: FolderOpen },
  { label: { en: 'Email', ar: 'البريد الإلكتروني' }, route: '/email', icon: Mail },
  { label: { en: 'Expenses', ar: 'المصروفات' }, route: '/expenses', icon: Receipt },
  { label: { en: 'Reports', ar: 'التقارير' }, route: '/reports', icon: BarChart, permission: 'reports:read' },
  { label: { en: 'Notifications', ar: 'الإشعارات' }, route: '/notifications', icon: Bell },
  { label: { en: 'Reminders', ar: 'التذكيرات' }, route: '/reminders', icon: AlarmClock },
  { label: { en: 'Lifecycle', ar: 'دورة الحياة' }, route: '/lifecycle', icon: Rocket },
  { label: { en: 'Org Chart', ar: 'الهيكل التنظيمي' }, route: '/organization', icon: Share2 },
  { label: { en: 'Administration', ar: 'الإدارة' }, route: '/administration', icon: Shield, permission: 'user:manage' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { language } = useLanguageStore();
  const { mobileSidebarOpen, setMobileSidebarOpen } = useUIStore();
  const { user } = useAuthStore();
  const visibleLinks = links.filter((l) => !l.permission || hasPermission(user?.role, l.permission));

  return (
    <>
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'flex h-screen w-64 flex-col border-gray-200 bg-white transition-transform duration-200 lg:translate-x-0',
          'fixed inset-y-0 z-50 lg:static lg:z-auto',
          language === 'ar' ? 'right-0 border-l' : 'left-0 border-r',
          'ease-scos',
          mobileSidebarOpen ? 'translate-x-0' : language === 'ar' ? 'translate-x-full' : '-translate-x-full'
        )}
        aria-label={t('Sidebar navigation', 'قائمة التنقل', language)}
      >
        <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">S</div>
          <div className="leading-tight flex-1">
            <p className="text-sm font-semibold text-gray-900">SCOS</p>
            <p className="text-xs text-gray-500">{t('HR Management', 'إدارة الموارد البشرية', language)}</p>
          </div>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 lg:hidden"
            aria-label={t('Close menu', 'إغلاق القائمة', language)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            const active = link.route === '/' ? pathname === '/' : pathname.startsWith(link.route);
            return (
              <Link
                key={link.route}
                href={link.route}
                onClick={() => setMobileSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <Icon className="h-5 w-5" />
                {t(link.label.en, link.label.ar, language)}
              </Link>
            );
          })}
        </nav>

        {hasPermission(user?.role, 'settings:manage') && (
          <div className="border-t border-gray-200 p-3">
            <Link
              href="/settings/company"
              onClick={() => setMobileSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                pathname.startsWith('/settings')
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Settings className="h-5 w-5" />
              {t('Settings', 'الإعدادات', language)}
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
