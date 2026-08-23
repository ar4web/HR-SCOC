'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguageStore } from '@/stores/language-store';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { useModuleStore } from '@/stores/module-store';
import { hasPermission } from '@/lib/rbac';
import { visibleNavLinks } from '@/lib/navigation';
import { cn, t } from '@/lib/utils';
import {
  Settings, X,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { language } = useLanguageStore();
  const { mobileSidebarOpen, setMobileSidebarOpen, sidebarCollapsed } = useUIStore();
  const { user } = useAuthStore();
  const { moduleStates } = useModuleStore();
  const visibleLinks = visibleNavLinks(user?.role, moduleStates).filter((l) => l.route !== '/notifications');

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
          'flex h-dvh flex-col border-gray-200 bg-white transition-all duration-200 lg:translate-x-0',
          'fixed inset-y-0 z-50 lg:static lg:z-auto',
          language === 'ar' ? 'right-0 border-l' : 'left-0 border-r',
          'ease-scos',
          sidebarCollapsed ? 'lg:w-16' : 'lg:w-64',
          'w-64',
          mobileSidebarOpen ? 'translate-x-0' : language === 'ar' ? 'translate-x-full' : '-translate-x-full'
        )}
        aria-label={t('Sidebar navigation', 'قائمة التنقل', language)}
      >
        <div className={cn('flex h-16 items-center gap-2 border-b border-gray-200', sidebarCollapsed ? 'justify-center px-2' : 'px-4')}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">S</div>
          <div className={cn('leading-tight flex-1', sidebarCollapsed ? 'hidden' : 'block')}>
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
                title={sidebarCollapsed ? t(link.label.en, link.label.ar, language) : undefined}
                className={cn(
                  'flex items-center rounded-lg text-sm font-medium transition-colors',
                  sidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                  active ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className={sidebarCollapsed ? 'hidden' : 'block'}>
                  {t(link.label.en, link.label.ar, language)}
                </span>
              </Link>
            );
          })}
        </nav>

        {hasPermission(user?.role, 'settings:manage') && (
          <div className="border-t border-gray-200 p-3">
            <Link
              href="/settings/company"
              onClick={() => setMobileSidebarOpen(false)}
              title={sidebarCollapsed ? t('Settings', 'الإعدادات', language) : undefined}
              className={cn(
                'flex items-center rounded-lg text-sm font-medium transition-colors',
                sidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                pathname.startsWith('/settings')
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Settings className="h-5 w-5 shrink-0" />
              <span className={sidebarCollapsed ? 'hidden' : 'block'}>
                {t('Settings', 'الإعدادات', language)}
              </span>
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
