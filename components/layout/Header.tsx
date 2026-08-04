'use client';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguageStore } from '@/stores/language-store';
import { useUIStore } from '@/stores/ui-store';
import { NotificationsDropdown } from '@/components/layout/NotificationsDropdown';
import { t } from '@/lib/utils';
import { Globe, LogOut, Menu } from 'lucide-react';

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { language, toggleLanguage } = useLanguageStore();
  const { toggleMobileSidebar } = useUIStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMobileSidebar}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm text-gray-500">{t('Welcome back, {name}', `مرحباً بعودتك، {name}`, language).replace('{name}', user?.name || 'Admin')}</span>
      </div>
      <div className="flex items-center gap-3">
        <NotificationsDropdown />
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          <Globe className="h-4 w-4" />
          {language === 'en' ? 'AR' : 'EN'}
        </button>
        <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <span className="hidden text-sm font-medium text-gray-900 sm:block">{user?.name}</span>
          <button
            onClick={handleLogout}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-error"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
