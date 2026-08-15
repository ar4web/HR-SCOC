'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { t, formatDate } from '@/lib/utils';
import { ModuleSettingsMenu } from '@/components/module-settings/ModuleSettingsMenu';
import {
  AlarmClock, BellRing, ShieldAlert, Briefcase, BadgeCheck,
  ScrollText, FileText, UserRound, RefreshCw,
} from 'lucide-react';

interface ReminderItem {
  id: string;
  kind: 'contract' | 'work_permit' | 'probation' | 'document';
  employeeName?: string;
  employeeNameAr?: string;
  employeeDisplayId?: string;
  name: string;
  dueDate: string;
  daysLeft: number;
  status: 'expired' | 'expiring' | 'ok';
}

const KIND_META: Record<ReminderItem['kind'], React.ElementType> = {
  contract: Briefcase,
  work_permit: ScrollText,
  probation: BadgeCheck,
  document: FileText,
};

export function RemindersContent() {
  const { language } = useLanguageStore();
  const { addToast } = useToast();
  const [items, setItems] = React.useState<ReminderItem[]>([]);
  const [dormant, setDormant] = React.useState<ReminderItem[]>([]);
  const [summary, setSummary] = React.useState<{ expired: number; expiring: number; total: number } | null>(null);
  const [scoped, setScoped] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [sendingId, setSendingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await api.get<{
      data: ReminderItem[];
      dormant: ReminderItem[];
      summary: { expired: number; expiring: number; total: number };
      scoped?: boolean;
    }>('/reminders');
    if (res.success && res.data) {
      setItems(res.data.data);
      setDormant(res.data.dormant || []);
      setSummary(res.data.summary);
      setScoped(!!res.data.scoped);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const handleNotify = async (item: ReminderItem) => {
    setSendingId(item.id);
    try {
      const res = await api.post<{ success: boolean; notified: number }>('/reminders', { reminderId: item.id });
      if (res.success && res.data) {
        addToast({
          type: 'success',
          title: t('Reminder sent', 'تم إرسال التذكير', language),
          message: t(`${res.data.notified} recipient(s) notified + email queued`, `${res.data.notified} مستلم تم إخطاره وبريد قيد الإرسال`, language),
        });
      } else {
        addToast({ type: 'error', title: res.error || t('Failed', 'فشل', language) });
      }
    } finally {
      setSendingId(null);
    }
  };

  const renderRow = (item: ReminderItem, actionable: boolean) => {
    const Icon = KIND_META[item.kind];
    return (
      <tr key={item.id} className="border-b border-gray-50 last:border-0">
        <td className="px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              item.status === 'expired' ? 'bg-error/10 text-error' : item.status === 'expiring' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
            }`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{language === 'ar' ? item.name : item.name}</p>
              <p className="text-xs text-gray-400">
                {item.employeeName ? (language === 'ar' ? item.employeeNameAr || item.employeeName : item.employeeName) : t('Company document', 'مستند الشركة', language)}
                {item.employeeDisplayId ? ` • ${item.employeeDisplayId}` : ''}
              </p>
            </div>
          </div>
        </td>
        <td className="px-6 py-3.5 text-sm text-gray-600 whitespace-nowrap">{formatDate(item.dueDate, language)}</td>
        <td className="px-6 py-3.5">
          {item.status === 'expired' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-error/10 px-2.5 py-1 text-xs font-semibold text-error">
              <ShieldAlert className="h-3 w-3" />
              {t('Expired', 'منتهي', language)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
              <BellRing className="h-3 w-3" />
              {item.daysLeft} {t('days left', 'أيام متبقية', language)}
            </span>
          )}
        </td>
        <td className="px-6 py-3.5 text-right rtl:text-left">
          {actionable && (
            <Button size="sm" variant="outline" onClick={() => handleNotify(item)} loading={sendingId === item.id}>
              <BellRing className="h-3.5 w-3.5" />
              {t('Notify', 'إشعار', language)}
            </Button>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('Lifecycle Reminders', 'تذكيرات دورة الحياة', language)}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('Contracts, work permits, probation and document expirations', 'العقود وتصاريح العمل وفترات التجربة وانتهاء المستندات', language)}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="ghost" onClick={load} title={t('Refresh', 'تحديث', language)} aria-label={t('Refresh', 'تحديث', language)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <ModuleSettingsMenu module={t('Reminders', 'التذكيرات', language)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-error/10">
              <ShieldAlert className="h-5 w-5 text-error" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary ? summary.expired : '—'}</p>
              <p className="text-xs text-gray-500">{t('Expired', 'منتهي', language)}</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
              <BellRing className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary ? summary.expiring : '—'}</p>
              <p className="text-xs text-gray-500">{t('Expiring soon', 'ينتهي قريباً', language)}</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <UserRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary ? summary.total : '—'}</p>
              <p className="text-xs text-gray-500">{t('Requires action', 'يتطلب إجراء', language)}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10">
            <AlarmClock className="h-4 w-4 text-warning" />
          </div>
          <div>
            <h2 className="text-base font-semibold">
              {t('Action Required', 'يتطلب إجراءً', language)}
            </h2>
            <p className="text-xs text-gray-400">
              {scoped ? t('Showing reminders related to your account', 'عرض التذكيرات المتعلقة بحسابك', language) : t('Expired or expiring within the next 60 days', 'منتهية أو تنتهي خلال 60 يوماً القادمة', language)}
            </p>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-6">
              <TableSkeleton rows={5} cols={4} />
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <BadgeCheck className="mx-auto h-10 w-10 text-success" />
              <p className="mt-3 text-sm text-gray-400">{t('No reminders — everything is up to date 🎉', 'لا توجد تذكيرات — كل شيء محدث 🎉', language)}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-left rtl:text-right text-xs text-gray-400">
                    <th className="px-6 py-3 font-medium">{t('Item', 'العنصر', language)}</th>
                    <th className="px-6 py-3 font-medium">{t('Due', 'الاستحقاق', language)}</th>
                    <th className="px-6 py-3 font-medium">{t('Status', 'الحالة', language)}</th>
                    <th className="px-6 py-3 font-medium">{t('Action', 'إجراء', language)}</th>
                  </tr>
                </thead>
                <tbody>{items.map((item) => renderRow(item, true))}</tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {dormant.length > 0 && (
        <Card>
          <CardHeader className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
              <BadgeCheck className="h-4 w-4 text-success" />
            </div>
            <div>
              <h2 className="text-base font-semibold">
                {t('Healthy (no action)', 'سليمة (لا إجراء)', language)}
              </h2>
              <p className="text-xs text-gray-400">{dormant.length} {t('items with later expiry dates', 'عنصر تواريخ انتهاء لاحقة', language)}</p>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                {dormant.slice(0, 10).map((item) => (
                  <tbody key={item.id}>
                    <tr className="border-b border-gray-50">
                      <td className="px-6 py-2 text-sm text-gray-500">{item.name}</td>
                      <td className="px-6 py-2 text-xs text-gray-400 whitespace-nowrap">{formatDate(item.dueDate, language)}</td>
                    </tr>
                  </tbody>
                ))}
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}