'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { downloadCsv } from '@/lib/csv';
import { ModuleSettingsMenu } from '@/components/module-settings/ModuleSettingsMenu';
import { t, formatDate } from '@/lib/utils';
import { Notification, NotificationType } from '@/types';
import {
  Bell, Info, CheckCircle, AlertTriangle, AlertCircle,
  Inbox, ExternalLink, Download, Check,
} from 'lucide-react';
import PageHeader, { HeaderAction } from '@/components/layout/PageHeader';
import { Toolbar, ToolbarChips, ToolbarSpacer, ToolbarCount } from '@/components/layout/Toolbar';
import { usePageSearch } from '@/stores/search-store';

const typeMeta: Record<NotificationType, { icon: React.ElementType; classes: string }> = {
  info: { icon: Info, classes: 'bg-info/10 text-info' },
  success: { icon: CheckCircle, classes: 'bg-success/10 text-success' },
  warning: { icon: AlertTriangle, classes: 'bg-warning/10 text-warning' },
  error: { icon: AlertCircle, classes: 'bg-error/10 text-error' },
};

const FILTERS: { value: string; en: string; ar: string }[] = [
  { value: 'all', en: 'All', ar: 'الكل' },
  { value: 'unread', en: 'Unread', ar: 'غير المقروء' },
  { value: 'info', en: 'Info', ar: 'معلومات' },
  { value: 'success', en: 'Success', ar: 'نجاح' },
  { value: 'warning', en: 'Warnings', ar: 'تحذيرات' },
  { value: 'error', en: 'Errors', ar: 'أخطاء' },
];

export function NotificationsContent() {
  const { language } = useLanguageStore();
  const { addToast } = useToast();
  const [items, setItems] = React.useState<Notification[]>([]);
  const [total, setTotal] = React.useState(0);
  const [filter, setFilter] = React.useState('all');
  const [loading, setLoading] = React.useState(true);
  const search = usePageSearch('/notifications', 'Search notifications…', 'ابحث في الإشعارات…');
  const shown = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((n) =>
      [n.title, n.titleAr || '', n.message || '', n.messageAr || '', n.type].join(' ').toLowerCase().includes(q)
    );
  }, [items, search]);

  const load = React.useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== 'all') params.set(filter === 'unread' ? 'unread' : 'type', filter === 'unread' ? 'true' : filter);
    const res = await api.get<{ data: Notification[]; total: number }>(`/notifications?${params.toString()}`);
    if (res.success && res.data) {
      setItems(res.data.data);
      setTotal(res.data.total);
    }
    setLoading(false);
  }, [filter]);

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleMarkRead = async (n: Notification) => {
    if (n.read) return;
    await api.put(`/notifications`, { id: n.id, read: true });
    load();
  };

  const handleMarkAll = async () => {
    await api.put('/notifications', { markAll: true });
    addToast({ type: 'success', title: t('All notifications marked as read', 'تم تحديد جميع الإشعارات كمقروءة', language) });
    load();
};

  const exportCsv = () => {
    downloadCsv(
      items.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        read: n.read ? 'read' : 'unread',
        createdAt: n.createdAt,
      })),
      `notifications-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Bell}
        title={t('Notifications', 'الإشعارات', language)}
        subtitle={t('Approval updates, reminders and system activity', 'تحديثات الموافقات والتذكيرات ونشاط النظام', language)}
        actions={
          <>
            <HeaderAction icon={Download} label={t('Export CSV', 'تصدير CSV', language)} onClick={exportCsv} />
            <ModuleSettingsMenu
              module={t('Notifications', 'الإشعارات', language)}
            />
            <HeaderAction icon={Check} label={t('Mark all read', 'تحديد الكل كمقروء', language)} primary onClick={handleMarkAll} disabled={items.length === 0} />
          </>
        }
      />

      <Card>
        <CardHeader>
          <Toolbar>
            <ToolbarChips
              value={filter}
              onChange={setFilter}
              options={FILTERS.map((f) => ({ value: f.value, label: t(f.en, f.ar, language) }))}
            />
            <ToolbarSpacer />
            <ToolbarCount>
              {shown.length} {t('shown', 'معروض', language)} • {total} {t('total', 'إجمالي', language)}
            </ToolbarCount>
          </Toolbar>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-6">
              <TableSkeleton rows={5} cols={3} />
            </div>
          ) : shown.length === 0 ? (
            <div className="p-12 text-center">
              <Inbox className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm text-gray-400">{t('No notifications in this view', 'لا توجد إشعارات في هذا العرض', language)}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {shown.map((n) => {
                const meta = typeMeta[n.type] || typeMeta.info;
                const Icon = meta.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleMarkRead(n)}
                    className={`flex w-full items-start gap-3 px-6 py-4 text-start transition-colors hover:bg-primary/[0.03] ${
                      !n.read ? 'bg-primary/[0.03]' : ''
                    }`}
                  >
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.classes}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${n.read ? 'text-gray-600' : 'font-semibold text-gray-900'}`}>
                        {language === 'ar' && n.titleAr ? n.titleAr : n.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-gray-500">
                        {language === 'ar' && n.messageAr ? n.messageAr : n.message}
                      </span>
                      <span className="mt-1 flex items-center gap-2 text-[11px] text-gray-400">
                        {formatDate(n.createdAt, language)}
                        {n.link && (
                          <span className="inline-flex items-center gap-0.5 text-primary">
                            <ExternalLink className="h-3 w-3" />
                            {t('Open', 'فتح', language)}
                          </span>
                        )}
                      </span>
                    </span>
                    {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </button>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}