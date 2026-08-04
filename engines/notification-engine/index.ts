'use client';

import React from 'react';
import { useNotificationStore } from '@/stores/notification-store';
import { useToast, ToastType } from '@/components/ui/Toast';
import { Notification, NotificationType } from '@/types';

export interface NotifyOptions {
  userId: string;
  companyId?: string;
  title: string;
  titleAr: string;
  message?: string;
  messageAr?: string;
  type?: NotificationType;
  link?: string;
  toast?: boolean;
  duration?: number;
}

const TYPE_TO_TOAST: Record<NotificationType, ToastType> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
};

export interface NotificationEngineValue {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
  notify: (options: NotifyOptions) => Notification;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

export function useNotifications(): NotificationEngineValue {
  const store = useNotificationStore();
  const { addToast } = useToast();

  const refresh = React.useCallback(async () => {
    try {
      const token = localStorage.getItem('scos_token');
      const res = await fetch('/api/notifications', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        store.setNotifications(json.data || []);
      }
    } catch {
      // ignore network failures
    }
  }, [store]);

  const notify = React.useCallback(
    (options: NotifyOptions): Notification => {
      const notification: Notification = {
        id: Math.random().toString(36).substring(2, 10),
        companyId: options.companyId || 'demo-company',
        userId: options.userId,
        title: options.title,
        titleAr: options.titleAr,
        message: options.message || '',
        messageAr: options.messageAr || '',
        type: options.type || 'info',
        read: false,
        link: options.link,
        createdAt: new Date().toISOString(),
      };

      store.addNotification(notification);

      if (options.toast !== false) {
        addToast({
          type: TYPE_TO_TOAST[notification.type],
          title: notification.title,
          message: notification.message,
          duration: options.duration,
        });
      }

      return notification;
    },
    [store, addToast]
  );

  const clearAll = React.useCallback(() => {
    store.markAllAsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    notifications: store.notifications,
    unreadCount: store.unreadCount,
    isLoading: store.isLoading,
    refresh,
    notify,
    markAsRead: store.markAsRead,
    markAllAsRead: store.markAllAsRead,
    clearAll,
  };
}

export function useUnreadCount(): number {
  return useNotificationStore((s) => s.unreadCount);
}

export function useNotification(id: string): Notification | undefined {
  return useNotificationStore((s) => s.notifications.find((n) => n.id === id));
}
