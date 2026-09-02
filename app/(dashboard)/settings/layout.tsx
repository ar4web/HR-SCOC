'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguageStore } from '@/stores/language-store';
import { useAuthStore } from '@/stores/auth-store';
import { hasPermission } from '@/lib/rbac';
import { cn, t } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import {
  Building2, Palette, Puzzle, User, CreditCard,
  CalendarDays, CalendarCheck, Clock, LifeBuoy, Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface SettingsLink {
  label: { en: string; ar: string };
  route: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

interface SettingsGroup {
  title: { en: string; ar: string };
  links: SettingsLink[];
}

const settingsGroups: SettingsGroup[] = [
  {
    title: { en: 'Account', ar: 'الحساب' },
    links: [
      { label: { en: 'My Profile', ar: 'ملفي الشخصي' }, route: '/settings/profile', icon: User },
    ],
  },
  {
    title: { en: 'Organization', ar: 'المنشأة' },
    links: [
      { label: { en: 'Company Profile', ar: 'ملف الشركة' }, route: '/settings/company', icon: Building2, adminOnly: true },
      { label: { en: 'Branding & Themes', ar: 'الهوية والسمات' }, route: '/settings/branding', icon: Palette, adminOnly: true },
      { label: { en: 'Modules', ar: 'الوحدات' }, route: '/settings/modules', icon: Puzzle, adminOnly: true },
    ],
  },
  {
    title: { en: 'Workforce Policies', ar: 'سياسات العمل' },
    links: [
      { label: { en: 'Work Week', ar: 'أسبوع العمل' }, route: '/settings/work-week', icon: Clock, adminOnly: true },
      { label: { en: 'Holidays', ar: 'الإجازات الرسمية' }, route: '/settings/holidays', icon: CalendarDays, adminOnly: true },
      { label: { en: 'Leave Policies', ar: 'سياسات الإجازات' }, route: '/settings/leave-policies', icon: CalendarCheck, adminOnly: true },
    ],
  },
  {
    title: { en: 'Billing & Support', ar: 'الفواتير والدعم' },
    links: [
      { label: { en: 'Billing', ar: 'الفواتير' }, route: '/settings/billing', icon: CreditCard, adminOnly: true },
      { label: { en: 'Support', ar: 'الدعم' }, route: '/settings/support', icon: LifeBuoy },
    ],
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { language, dir } = useLanguageStore();
  const { user } = useAuthStore();
  const isAdmin = hasPermission(user?.role, 'settings:manage');

  const visibleGroups = settingsGroups
    .map((g) => ({ ...g, links: g.links.filter((l) => !l.adminOnly || isAdmin) }))
    .filter((g) => g.links.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Settings}
        title={t('Settings', 'الإعدادات', language)}
        subtitle={t('Manage your company settings and preferences', 'إدارة إعدادات الشركة وتفضيلاتك', language)}
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav
          className="lg:w-60 lg:shrink-0"
          role="navigation"
          aria-label={t('Settings navigation', 'قائمة الإعدادات', language)}
        >
          <div className="card p-3 lg:sticky lg:top-0">
            {/* mobile: one horizontal scroll row; desktop: grouped column */}
            <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-0 lg:overflow-visible lg:pb-0 scrollbar-thin" dir={dir}>
              {visibleGroups.map((group, gi) => (
                <React.Fragment key={group.title.en}>
                  <p className={cn(
                    'hidden select-none px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 lg:block',
                    gi === 0 ? 'pb-1.5 pt-1' : 'pb-1.5 pt-4'
                  )}>
                    {t(group.title.en, group.title.ar, language)}
                  </p>
                  {group.links.map((link) => {
                    const Icon = link.icon;
                    const active = pathname === link.route;
                    return (
                      <Link
                        key={link.route}
                        href={link.route}
                        className={cn(
                          'inline-flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                          'lg:w-full lg:shrink',
                          active
                            ? 'bg-primary/10 text-primary'
                            : 'text-gray-600 hover:bg-gray-100'
                        )}
                      >
                        <Icon className={cn('h-4 w-4', active ? 'text-primary' : 'text-gray-400')} />
                        <span className="whitespace-nowrap lg:whitespace-normal">
                          {t(link.label.en, link.label.ar, language)}
                        </span>
                      </Link>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </nav>

        <div className="min-w-0 flex-1">
          <div className="card p-4 sm:p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
