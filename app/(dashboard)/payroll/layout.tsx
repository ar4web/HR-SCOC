'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguageStore } from '@/stores/language-store';
import { cn, t } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import {
  Wallet, Users, Shield, FileText, ReceiptText, DollarSign,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface PayrollLink {
  label: { en: string; ar: string };
  route: string;
  icon: LucideIcon;
}

const payrollLinks: PayrollLink[] = [
  { label: { en: 'Overview', ar: 'نظرة عامة' }, route: '/payroll', icon: Wallet },
  { label: { en: 'Salary Setup', ar: 'إعداد الرواتب' }, route: '/payroll/employees', icon: Users },
  { label: { en: 'GOSI', ar: 'التأمينات' }, route: '/payroll/gosi', icon: Shield },
  { label: { en: 'WPS Files', ar: 'ملفات WPS' }, route: '/payroll/wps', icon: FileText },
  { label: { en: 'Payslips', ar: 'قسائم الرواتب' }, route: '/payroll/payslips', icon: ReceiptText },
];

export default function PayrollLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { language, dir } = useLanguageStore();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={DollarSign}
        title={t('Payroll', 'الرواتب', language)}
        subtitle={t('Process payroll, manage salaries, GOSI, WPS files and payslips', 'معالجة الرواتب وإدارة الأجور والتأمينات وملفات WPS وقسائم الرواتب', language)}
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav
          className="lg:w-60 lg:shrink-0"
          role="navigation"
          aria-label={t('Payroll navigation', 'قائمة الرواتب', language)}
        >
          <div className="card p-3 lg:sticky lg:top-0">
            <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0 lg:gap-0.5 scrollbar-thin" dir={dir}>
              {payrollLinks.map((link) => {
                const Icon = link.icon;
                const active =
                  link.route === '/payroll'
                    ? pathname === '/payroll'
                    : pathname.startsWith(link.route);
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