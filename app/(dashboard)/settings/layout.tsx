'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguageStore } from '@/stores/language-store';
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
}

const settingsLinks: SettingsLink[] = [
  { label: { en: 'Company Profile', ar: 'الملف الشخصي للشركة' }, route: '/settings/company', icon: Building2 },
  { label: { en: 'Branding & Themes', ar: 'العلامة التجارية والسمات' }, route: '/settings/branding', icon: Palette },
  { label: { en: 'Modules', ar: 'الوحدات' }, route: '/settings/modules', icon: Puzzle },
  { label: { en: 'Work Week', ar: 'أسبوع العمل' }, route: '/settings/work-week', icon: Clock },
  { label: { en: 'Holidays', ar: 'الإجازات الرسمية' }, route: '/settings/holidays', icon: CalendarDays },
  { label: { en: 'Leave Policies', ar: 'سياسات الإجازات' }, route: '/settings/leave-policies', icon: CalendarCheck },
  { label: { en: 'Profile', ar: 'الملف الشخصي' }, route: '/settings/profile', icon: User },
  { label: { en: 'Billing', ar: 'الفواتير' }, route: '/settings/billing', icon: CreditCard },
  { label: { en: 'Support', ar: 'الدعم' }, route: '/settings/support', icon: LifeBuoy },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { language, dir } = useLanguageStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <PageHeader
            title={t('Settings', 'الإعدادات', language)}
            subtitle={t('Manage your company settings and preferences', 'إدارة إعدادات الشركة وتفضيلاتك', language)}
          />
        </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav
          className="lg:w-60 lg:shrink-0"
          role="navigation"
          aria-label={t('Settings navigation', 'قائمة الإعدادات', language)}
        >
          <div className="card p-3 lg:sticky lg:top-0">
            <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0 lg:gap-0.5 scrollbar-thin" dir={dir}>
              {settingsLinks.map((link) => {
                const Icon = link.icon;
                const active = pathname === link.route;
                return (
                  <Link
                    key={link.route}
                    href={link.route}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      'lg:w-full lg:shrink',
                      active
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="whitespace-nowrap lg:whitespace-normal">
                      {t(link.label.en, link.label.ar, language)}
                    </span>
                  </Link>
                );
              })}
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