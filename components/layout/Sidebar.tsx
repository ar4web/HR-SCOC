'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguageStore } from '@/stores/language-store';
import { useUIStore } from '@/stores/ui-store';
import { cn, t } from '@/lib/utils';
import {
  LayoutDashboard, Users, Calendar, Clock, DollarSign,
  MessageSquare, BarChart, Settings, Shield, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavLink {
  label: { en: string; ar: string };
  route: string;
  icon: LucideIcon;
}

const links: NavLink[] = [
  { label: { en: 'Dashboard', ar: 'لوحة القيادة' }, route: '/', icon: LayoutDashboard },
  { label: { en: 'Employees', ar: 'الموظفون' }, route: '/employees', icon: Users },
  { label: { en: 'Leaves', ar: 'الإجازات' }, route: '/leaves', icon: Calendar },
  { label: { en: 'Attendance', ar: 'الحضور' }, route: '/attendance', icon: Clock },
  { label: { en: 'Payroll', ar: 'الرواتب' }, route: '/payroll', icon: DollarSign },
  { label: { en: 'Communication', ar: 'التواصل' }, route: '/communication', icon: MessageSquare },
  { label: { en: 'Reports', ar: 'التقارير' }, route: '/reports', icon: BarChart },
  { label: { en: 'Administration', ar: 'الإدارة' }, route: '/administration', icon: Shield },
  { label: { en: 'Settings', ar: 'الإعدادات' }, route: '/settings/company', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { language } = useLanguageStore();
  const { mobileSidebarOpen, setMobileSidebarOpen } = useUIStore();

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
          'flex h-screen w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-200 lg:translate-x-0',
          'fixed inset-y-0 left-0 z-50 lg:static lg:z-auto',
          'ease-scos',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          language === 'ar' && mobileSidebarOpen && 'translate-x-0',
          language === 'ar' && !mobileSidebarOpen && 'translate-x-full lg:translate-x-0'
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
          {links.map((link) => {
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
      </aside>
    </>
  );
}
