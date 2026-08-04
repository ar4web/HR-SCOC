'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguageStore } from '@/stores/language-store';
import { cn, t } from '@/lib/utils';
import {
  Building2, Palette, Puzzle, User, CreditCard,
  CalendarDays, CalendarCheck, Clock, LifeBuoy,
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
  const { language } = useLanguageStore();

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin" role="navigation" aria-label={t('Settings navigation', 'قائمة الإعدادات', language)}>
        {settingsLinks.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.route;
          return (
            <Link
              key={link.route}
              href={link.route}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                active ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              <Icon className="h-4 w-4" />
              {t(link.label.en, link.label.ar, language)}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
