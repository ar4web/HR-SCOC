'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguageStore } from '@/stores/language-store';
import { useUIStore } from '@/stores/ui-store';
import { NotificationsDropdown } from '@/components/layout/NotificationsDropdown';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { t } from '@/lib/utils';
import { Globe, LogOut, Menu, User, Settings, UserRound, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { hasPermission } from '@/lib/rbac';

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { language, toggleLanguage } = useLanguageStore();
  const { toggleMobileSidebar, sidebarCollapsed, toggleSidebarCollapsed } = useUIStore();
  const [profileOpen, setProfileOpen] = React.useState(false);
  const profileRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!profileOpen) return;
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [profileOpen]);

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    router.push('/login');
  };

  return (
    <header className="flex h-16 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 sm:gap-4 sm:px-6">
      <div className="flex items-center gap-3 md:w-56">
        <button
          onClick={toggleMobileSidebar}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          onClick={toggleSidebarCollapsed}
          className="hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:block"
          aria-label={sidebarCollapsed ? t('Expand sidebar', 'توسيع القائمة', language) : t('Collapse sidebar', 'طي القائمة', language)}
          title={sidebarCollapsed ? t('Expand sidebar', 'توسيع القائمة', language) : t('Collapse sidebar', 'طي القائمة', language)}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>
      <div className="hidden flex-1 items-center md:flex">
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-3 md:w-56 md:justify-end">
        <NotificationsDropdown />

        {/* Profile menu (top-right avatar) */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className={`flex items-center rounded-full p-1.5 transition-colors ${
              profileOpen ? 'bg-gray-100' : 'hover:bg-gray-100'
            }`}
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            aria-label={t('Profile menu', 'قائمة الملف الشخصي', language)}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              {user?.name?.charAt(0) || 'A'}
            </div>
          </button>

          {profileOpen && (
            <div
              className="absolute end-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
              role="menu"
            >
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="truncate text-sm font-semibold text-gray-900">{user?.name}</p>
                <p className="truncate text-xs text-gray-400">{user?.email}</p>
              </div>
              <Link
                href="/me"
                onClick={() => setProfileOpen(false)}
                role="menuitem"
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <UserRound className="h-4 w-4 text-gray-400" />
                {t('My Portal', 'بوابتي', language)}
              </Link>
              <Link
                href="/settings/profile"
                onClick={() => setProfileOpen(false)}
                role="menuitem"
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <User className="h-4 w-4 text-gray-400" />
                {t('My Profile', 'ملفي الشخصي', language)}
              </Link>
              {hasPermission(user?.role, 'settings:manage') && (
                <Link
                  href="/settings/company"
                  onClick={() => setProfileOpen(false)}
                  role="menuitem"
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Settings className="h-4 w-4 text-gray-400" />
                  {t('Settings', 'الإعدادات', language)}
                </Link>
              )}
              <button
                onClick={() => {
                  setProfileOpen(false);
                  toggleLanguage();
                }}
                role="menuitem"
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Globe className="h-4 w-4 text-gray-400" />
                {language === 'en'
                  ? t('العربية', 'العربية', 'ar')
                  : t('English', 'English', 'en')}
                <span className="ml-auto text-xs text-gray-400">{language === 'en' ? 'AR' : 'EN'}</span>
              </button>
              <div className="mt-1 border-t border-gray-100">
                <button
                  onClick={handleLogout}
                  role="menuitem"
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-error hover:bg-error/5"
                >
                  <LogOut className="h-4 w-4" />
                  {t('Logout', 'تسجيل الخروج', language)}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
