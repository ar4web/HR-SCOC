'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguageStore } from '@/stores/language-store';
import { useNotifications } from '@/engines/notification-engine';
import { t, formatDate } from '@/lib/utils';
import { Bell, CheckCheck, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { NotificationType } from '@/types';

const typeMeta: Record<NotificationType, { icon: React.ElementType; classes: string }> = {
  info: { icon: Info, classes: 'bg-info/10 text-info' },
  success: { icon: CheckCircle, classes: 'bg-success/10 text-success' },
  warning: { icon: AlertTriangle, classes: 'bg-warning/10 text-warning' },
  error: { icon: AlertCircle, classes: 'bg-error/10 text-error' },
};

export function NotificationsDropdown() {
  const { language } = useLanguageStore();
  const { notifications, unreadCount, refresh, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = () => {
    setOpen((prev) => !prev);
    if (!open) refresh();
  };

  const handleItemClick = (id: string) => {
    markAsRead(id);
    setOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        aria-label={t('Notifications', 'الإشعارات', language)}
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 rtl:right-auto rtl:left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 rtl:right-auto rtl:left-0 top-12 z-50 w-80 sm:w-96 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-modal animate-fade-in">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">
              {t('Notifications', 'الإشعارات', language)}
            </p>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-dark transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {t('Mark all read', 'تحديد الكل كمقروء', language)}
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Bell className="h-8 w-8 mb-2 text-gray-300" />
                <p className="text-sm">{t('No notifications', 'لا توجد إشعارات', language)}</p>
              </div>
            ) : (
              notifications.map((n) => {
                const meta = typeMeta[n.type] || typeMeta.info;
                const Icon = meta.icon;
                const content = (
                  <div
                    onClick={() => handleItemClick(n.id)}
                    className={`flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 ${
                      !n.read ? 'bg-primary/[0.03]' : ''
                    }`}
                  >
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${meta.classes}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${n.read ? 'text-gray-600' : 'font-medium text-gray-900'}`}>
                        {t(n.title, n.titleAr, language)}
                      </p>
                      {n.message && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                          {t(n.message, n.messageAr, language)}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-400">{formatDate(n.createdAt, language)}</p>
                    </div>
                    {!n.read && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />}
                  </div>
                );
                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => setOpen(false)}>
                    {content}
                  </Link>
                ) : (
                  <div key={n.id}>{content}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
