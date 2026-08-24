'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguageStore } from '@/stores/language-store';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { DashboardTile } from '@/components/ui/DashboardTile';

import { useToast } from '@/components/ui/Toast';
import { dashboardService } from '@/modules/dashboard/service';
import { ModuleSettingsMenu } from '@/components/module-settings/ModuleSettingsMenu';
import { DashboardData } from '@/lib/dashboard-engine';
import { api, clearApiCache } from '@/lib/api';
import { Chart } from '@/engines/chart-engine';
import { useChartTheme, statusHexMap } from '@/lib/chart-theme';
import { hasPermission } from '@/lib/rbac';
import { AddTodoDialog, AddReminderDialog } from '@/components/dashboard/AddDialogs';
import { t, formatCurrency, formatDate, getLeaveTypeLabel, daysUntil } from '@/lib/utils';
import {
  Users, UserCheck, DollarSign, Receipt, FileWarning,
  ListTodo, AlertTriangle, RefreshCw, CheckCircle2, XCircle,
  UserPlus, MessageSquare, Bell,   Timer, Shield, PlaneTakeoff, PlaneLanding,
  FileClock, AlarmClock, ClipboardCheck,
  Activity, Plus, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const notifMeta: Record<string, { icon: LucideIcon; classes: string }> = {
  info: { icon: Bell, classes: 'bg-info/10 text-info' },
  success: { icon: CheckCircle2, classes: 'bg-success/10 text-success' },
  warning: { icon: AlertTriangle, classes: 'bg-warning/10 text-warning' },
  error: { icon: XCircle, classes: 'bg-error/10 text-error' },
};

interface Kpi {
  label: { en: string; ar: string };
  value: string;
  sub: { en: string; ar: string };
  icon: LucideIcon;
  chip: string;
  tone?: string;
  toneText?: string;
  pct?: number;
  chipValue?: string;
  span?: boolean;
  footer?: { en: string; ar: string; tone: 'success' | 'warning' | 'error' }[];
}

export function DashboardContent() {
  const { language, dir } = useLanguageStore();
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const theme = useChartTheme();
  const STATUS_HEX = statusHexMap(theme);
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [now, setNow] = React.useState(new Date());
  const [addOpen, setAddOpen] = React.useState(false);
  const [dialog, setDialog] = React.useState<'todo' | 'reminder' | null>(null);
  const [approvalTab, setApprovalTab] = React.useState<'leaves' | 'expenses'>('leaves');
  const [actingId, setActingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    clearApiCache('/dashboard');
    const res = await dashboardService.get();
    if (res.success && res.data) setData(res.data);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
    const clock = setInterval(() => setNow(new Date()), 60 * 1000);
    const poll = setInterval(load, 60 * 1000);
    return () => {
      clearInterval(clock);
      clearInterval(poll);
    };
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
    addToast({ type: 'success', title: t('Dashboard refreshed', 'تم تحديث لوحة القيادة', language) });
  };

  const handleLeaveDecision = async (id: string, status: 'approved' | 'rejected') => {
    const res = await api.put('/leaves', { id, status, approvedBy: user?.id });
    if (res.success) {
      addToast({
        type: status === 'approved' ? 'success' : 'info',
        title: t(
          `Leave ${status === 'approved' ? 'approved' : 'rejected'}`,
          `تم ${status === 'approved' ? 'الموافقة' : 'الرفض'} على الإجازة`,
          language
        ),
      });
      await load();
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to update leave', 'فشل تحديث الإجازة', language) });
    }
  };

  const handleExpenseDecision = async (id: string, status: 'approved' | 'rejected') => {
    setActingId(id);
    const res = await api.put(`/expenses/${id}`, { action: 'status', status });
    setActingId(null);
    if (res.success) {
      addToast({
        type: status === 'approved' ? 'success' : 'info',
        title: t(
          `Expense ${status === 'approved' ? 'approved' : 'rejected'}`,
          `تم ${status === 'approved' ? 'الموافقة على' : 'رفض'} المصروف`,
          language
        ),
      });
      await load();
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to update expense', 'فشل تحديث المصروف', language) });
    }
  };

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-56 rounded-lg bg-gray-100 animate-pulse" />
            <div className="mt-2 h-4 w-72 rounded-lg bg-gray-100 animate-pulse" />
          </div>
          <div className="h-9 w-32 rounded-lg bg-gray-100 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-white shadow-card animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="h-80 rounded-2xl bg-white shadow-card animate-pulse lg:col-span-2" />
          <div className="h-80 rounded-2xl bg-white shadow-card animate-pulse" />
        </div>
      </div>
    );
  }

  const hour = now.getHours();
  const canApproveLeave = hasPermission(user?.role, 'leave:approve');
  const canApproveExpense = hasPermission(user?.role, 'expense:approve');
  const greeting = hour < 12 ? t('Good morning', 'صباح الخير', language) : hour < 18 ? t('Good afternoon', 'مساء الخير', language) : t('Good evening', 'مساء الخير', language);

  const presentToday = data.attendanceToday.present + data.attendanceToday.late;
  const attendancePct = data.totalEmployees > 0 ? Math.round((presentToday / data.totalEmployees) * 100) : 0;
  const expiringDocs = data.expiringDocuments.length + data.expiredDocuments.length;
  const expiringSoon = data.expiringDocuments.length;

  const kpis: Kpi[] = [
    {
      label: { en: 'Total Employees', ar: 'إجمالي الموظفين' },
      value: String(data.totalEmployees),
      sub: { en: `${data.activeEmployees} active`, ar: `${data.activeEmployees} نشط` },
      icon: Users,
      chip: 'bg-primary/10 text-primary',
      tone: 'from-primary to-secondary',
      toneText: 'text-primary',
      pct: data.totalEmployees ? Math.round((data.activeEmployees / data.totalEmployees) * 100) : 0,
      chipValue: data.totalEmployees ? `${Math.round((data.activeEmployees / data.totalEmployees) * 100)}%` : undefined,
    },
    {
      label: { en: 'Present Today', ar: 'الحاضرون اليوم' },
      value: `${presentToday}/${data.totalEmployees}`,
      sub: { en: `${data.attendanceToday.late} late`, ar: `${data.attendanceToday.late} متأخر` },
      icon: UserCheck,
      chip: 'bg-success/10 text-success',
      tone: 'from-success to-success/70',
      toneText: 'text-success',
      pct: attendancePct,
      chipValue: `${attendancePct}%`,
    },
    {
      label: { en: 'Pending Approvals', ar: 'موافقات معلقة' },
      value: String(data.pendingLeaves + data.pendingExpenses),
      sub: { en: 'leaves & expenses to review', ar: 'إجازات ومصروفات للمراجعة' },
      icon: ClipboardCheck,
      chip: 'bg-warning/10 text-warning',
      tone: 'from-warning to-warning/70',
      toneText: 'text-warning',
      footer: [{ en: 'Review now', ar: 'مراجعة الآن', tone: 'warning' }],
    },
    {
      label: { en: 'Monthly Payroll', ar: 'الرواتب الشهرية' },
      value: formatCurrency(data.totalPayroll),
      sub: { en: `avg ${formatCurrency(data.avgSalary)}`, ar: `متوسط ${formatCurrency(data.avgSalary)}` },
      icon: DollarSign,
      chip: 'bg-secondary/10 text-secondary',
      tone: 'from-info to-info/70',
      toneText: 'text-info',
    },
    {
      label: { en: 'Compliance Expiries', ar: 'انتهاءات نظامية' },
      value: String(data.criticalRunway.length),
      sub: { en: 'iqama/permits ≤ 90 days', ar: 'إقامة/تصاريح ≤ 90 يوم' },
      icon: Shield,
      chip: 'bg-error/10 text-error',
      footer: [{ en: 'View expiries', ar: 'عرض الانتهاءات', tone: 'error' }],
    },
    {
      label: { en: 'Document Alerts', ar: 'تنبيهات المستندات' },
      value: String(expiringDocs),
      sub: { en: `${data.expiredDocuments.length} expired, ${expiringSoon} expiring`, ar: `${data.expiredDocuments.length} منتهي، ${expiringSoon} تنتهي قريباً` },
      icon: FileWarning,
      chip: 'bg-error/10 text-error',
      footer: [
        ...(data.expiredDocuments.length > 0 ? [{ en: `${data.expiredDocuments.length} expired`, ar: `${data.expiredDocuments.length} منتهي`, tone: 'error' as const }] : []),
        ...(expiringSoon > 0 ? [{ en: `${expiringSoon} expiring`, ar: `${expiringSoon} تنتهي قريباً`, tone: 'warning' as const }] : []),
      ],
    },
    {
      label: { en: 'Open Tasks', ar: 'المهام المفتوحة' },
      value: String(data.openTodos),
      sub: { en: `${data.completedTodos} completed`, ar: `${data.completedTodos} مكتملة` },
      icon: ListTodo,
      chip: 'bg-info/10 text-info',
    },
    {
      label: { en: 'On Leave Now', ar: 'في إجازة الآن' },
      value: String(data.onLeaveNow.length),
      sub: { en: `${data.notReturnedVacations.length} overdue return`, ar: `${data.notReturnedVacations.length} تأخر في العودة` },
      icon: PlaneTakeoff,
      chip: 'bg-primary/10 text-primary',
    },
  ];

  const trendLabels = data.attendanceTrend.map((d) =>
    new Date(d.date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-GB', { weekday: 'short' })
  );
  const trendPresent = data.attendanceTrend.map((d) => d.present);
  const trendLate = data.attendanceTrend.map((d) => d.late);
  const trendAbsent = data.attendanceTrend.map((d) => d.absent);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {greeting}, {language === 'ar' ? user?.nameAr || user?.name : user?.name}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {now.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            <span className="mx-2 text-gray-300">•</span>
            {now.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            {t('Live', 'مباشر', language)}
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {t('Refresh', 'تحديث', language)}
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="h-9 w-9 p-0 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-primary hover:border-primary/30 transition-colors"
            title={t('Add New', 'إضافة جديد', language)}
            aria-label={t('Add New', 'إضافة جديد', language)}
          >
            <Plus className="h-4 w-4" />
          </button>
          <ModuleSettingsMenu module={t('Dashboard', 'لوحة القيادة', language)} />
        </div>
      </div>

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setAddOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t('Add New', 'إضافة جديد', language)}</h3>
                  <p className="text-xs text-gray-500">{t('What would you like to add?', 'ماذا تريد أن تضيف؟', language)}</p>
                </div>
              </div>
              <button onClick={() => setAddOpen(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" title={t('Close', 'إغلاق', language)} aria-label={t('Close', 'إغلاق', language)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 p-5">
              {[
                { label: t('New Employee', 'موظف جديد', language), desc: t('Add an employee record', 'إضافة سجل موظف', language), icon: UserPlus, chip: 'bg-primary/10 text-primary', href: '/employees/new' },
                { label: t('Reminder', 'تذكير', language), desc: t('Set a reminder', 'تعيين تذكير', language), icon: AlarmClock, chip: 'bg-warning/10 text-warning', dialog: 'reminder' as const },
                { label: t('Record Expense', 'تسجيل مصروف', language), desc: t('Add an expense entry', 'إضافة مصروف', language), icon: Receipt, chip: 'bg-accent/10 text-accent', href: '/expenses' },
                { label: t('New Todo', 'مهمة جديدة', language), desc: t('Create a to-do item', 'إنشاء مهمة', language), icon: ListTodo, chip: 'bg-info/10 text-info', dialog: 'todo' as const },
              ].map((a) => {
                const Icon = a.icon;
                const inner = (
                  <>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${a.chip} transition-transform group-hover:scale-105`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 group-hover:text-primary">{a.label}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{a.desc}</p>
                    </div>
                  </>
                );
                const cls = 'group flex flex-col gap-2.5 rounded-xl bg-white p-4 shadow-card transition-all hover:border-primary/30 hover:shadow-md';
                if ('dialog' in a && a.dialog) {
                  return (
                    <button
                      key={a.label}
                      onClick={() => {
                        setAddOpen(false);
                        setDialog(a.dialog);
                      }}
                      className={cls}
                    >
                      {inner}
                    </button>
                  );
                }
                return (
                  <Link key={a.label} href={a.href!} onClick={() => setAddOpen(false)} className={cls}>
                    {inner}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {dialog === 'todo' && <AddTodoDialog onClose={() => setDialog(null)} />}
      {dialog === 'reminder' && <AddReminderDialog onClose={() => setDialog(null)} />}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.slice(0, 8).map((k) => {
          const Icon = k.icon;
          const empty =
            (k.label.en === 'Pending Expenses' && data.pendingExpenses === 0) ||
            (k.label.en === 'Open Tasks' && data.openTodos === 0) ||
            (k.label.en === 'Not Returned' && data.notReturnedVacations.length === 0) ||
            (k.label.en === 'Pending Leaves' && data.pendingLeaves === 0) ||
            (k.label.en === 'Document Alerts' && expiringDocs === 0);
          return (
            <DashboardTile
              key={k.label.en}
              icon={Icon}
              label={t(k.label.en, k.label.ar, language)}
              value={k.value}
              sub={t(k.sub.en, k.sub.ar, language)}
              chip={k.chipValue}
              chipClassName={k.chip}
              iconClassName={k.chip}
              tone={k.tone || 'from-primary to-secondary'}
              toneText={k.toneText || 'text-primary'}
              pct={k.pct}
              barClassName={`bg-gradient-to-r ${k.tone || 'from-primary to-secondary'}`}
              size="md"
              compact
              className="h-full"
              empty={empty}
              emptyText={
                k.label.en === 'Pending Expenses'
                  ? t('All caught up!', 'لا توجد مصروفات معلقة', language)
                  : k.label.en === 'Open Tasks'
                  ? t('No open tasks', 'لا توجد مهام مفتوحة', language)
                  : k.label.en === 'Not Returned'
                  ? t('Everyone is back 🎉', 'الكل عادوا 🎉', language)
                  : k.label.en === 'Pending Leaves'
                  ? t('All leaves resolved', 'لا توجد إجازات معلقة', language)
                  : t('All clear', 'لا توجد تنبيهات', language)
              }
              footer={
                k.footer
                  ? k.footer.map((f) => ({
                      label: t(f.en, f.ar, language),
                      className: f.tone === 'warning' ? 'bg-warning/10 text-warning' : f.tone === 'error' ? 'bg-error/10 text-error' : 'bg-success/10 text-success',
                      href:
                        k.label.en === 'Pending Leaves' || k.label.en === 'Not Returned'
                          ? '/leaves'
                          : k.label.en === 'Document Alerts'
                          ? '/documents'
                          : k.label.en === 'Critical Runway'
                          ? '/employees'
                          : undefined,
                    }))
                  : undefined
              }
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="flex flex-col lg:col-span-2">
        <CardHeader className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">{t('Approval Inbox', 'صندوق الموافقات', language)}</h2>
              <p className="text-xs text-gray-400">{t('Decide leave requests and expenses instantly', 'قرارات فورية للإجازات والمصروفات', language)}</p>
            </div>
          </div>
          <div className="flex gap-1 rounded-lg bg-gray-100/70 p-1">
            {(['leaves', 'expenses'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setApprovalTab(tab)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  approvalTab === tab ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'leaves' ? t('Leaves', 'الإجازات', language) : t('Expenses', 'المصروفات', language)}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${approvalTab === tab ? 'bg-primary/10 text-primary' : 'bg-gray-200/70 text-gray-500'}`}>
                  {tab === 'leaves' ? data.pendingLeaves : data.pendingExpenses}
                </span>
              </button>
            ))}
          </div>
        </CardHeader>
        <CardBody className="flex-1 overflow-y-auto px-4 py-2">
          {approvalTab === 'leaves' ? (
            data.pendingLeavesList.length === 0 ? (
              <p className="py-12 text-center text-sm text-gray-400">{t('All leave requests handled 🎉', 'تمت معالجة جميع طلبات الإجازة 🎉', language)}</p>
            ) : (
              <div className="divide-y divide-gray-100/60">
                {data.pendingLeavesList.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 px-1 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {l.employeeName.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {language === 'ar' ? l.employeeNameAr || l.employeeName : l.employeeName}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {getLeaveTypeLabel(l.type, language)} · {l.daysCount} {t('days', 'أيام', language)} · {formatDate(l.startDate, language)} → {formatDate(l.endDate, language)}
                      </p>
                    </div>
                    {canApproveLeave && (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          onClick={() => handleLeaveDecision(l.id, 'approved')}
                          disabled={actingId === l.id}
                          className="inline-flex h-8 items-center gap-1 rounded-lg bg-success/10 px-2.5 text-xs font-semibold text-success transition-all hover:bg-success hover:text-white active:scale-95 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {t('Approve', 'اعتماد', language)}
                        </button>
                        <button
                          onClick={() => handleLeaveDecision(l.id, 'rejected')}
                          disabled={actingId === l.id}
                          className="inline-flex h-8 items-center gap-1 rounded-lg bg-error/10 px-2.5 text-xs font-semibold text-error transition-all hover:bg-error hover:text-white active:scale-95 disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          {t('Reject', 'رفض', language)}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : data.pendingExpensesList.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-400">{t('No expense requests waiting 🎉', 'لا توجد مصروفات بانتظار القرار 🎉', language)}</p>
          ) : (
            <div className="divide-y divide-gray-100/60">
              {data.pendingExpensesList.map((x) => (
                <div key={x.id} className="flex items-center gap-3 px-1 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{x.requestedByName}</p>
                    <p className="truncate text-xs text-gray-500">{x.category}{x.description ? ` — ${x.description}` : ''}</p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-primary">{formatCurrency(x.amount)}</span>
                  {canApproveExpense && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        onClick={() => handleExpenseDecision(x.id, 'approved')}
                        disabled={actingId === x.id}
                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-success/10 px-2.5 text-xs font-semibold text-success transition-all hover:bg-success hover:text-white active:scale-95 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t('Approve', 'اعتماد', language)}
                      </button>
                      <button
                        onClick={() => handleExpenseDecision(x.id, 'rejected')}
                        disabled={actingId === x.id}
                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-error/10 px-2.5 text-xs font-semibold text-error transition-all hover:bg-error hover:text-white active:scale-95 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        {t('Reject', 'رفض', language)}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
        <div className="border-t border-gray-100/60 px-5 py-2.5 text-end">
          <Link href={approvalTab === 'leaves' ? '/leaves' : '/expenses'} className="text-xs font-medium text-primary hover:underline">
            {t('Open full module', 'فتح الوحدة الكاملة', language)} →
          </Link>
        </div>
      </Card>

        <div className="space-y-6">
          <Card className="flex flex-col">
            <CardHeader className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
                  <ListTodo className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">{t('My Tasks', 'مهامي', language)}</h2>
                  <p className="text-xs text-gray-400">{t('Open tasks by priority', 'مهام مفتوحة حسب الأولوية', language)}</p>
                </div>
              </div>
              <Link href="/todos" className="text-sm font-medium text-primary hover:underline">
                {t('View all', 'عرض الكل', language)}
              </Link>
            </CardHeader>
            <CardBody className="max-h-[22rem] flex-1 overflow-y-auto px-3 py-3">
              {data.todoItems.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-400">{t('No open tasks 🎉', 'لا توجد مهام مفتوحة 🎉', language)}</p>
              ) : (
                <div className="space-y-1">
                  {data.todoItems.map((tItem) => (
                    <div key={tItem.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-gray-50">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${tItem.priority === 'high' ? 'bg-error/15' : tItem.priority === 'medium' ? 'bg-warning/15' : 'bg-success/15'}`}>
                        <span className={`h-2 w-2 rounded-full ${tItem.priority === 'high' ? 'bg-error' : tItem.priority === 'medium' ? 'bg-warning' : 'bg-success'}`} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-800">{tItem.title}</p>
                        {tItem.dueDate && (
                          <p className="text-xs text-gray-400">{t('Due', 'استحقاق', language)} {formatDate(tItem.dueDate, language)}</p>
                        )}
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${tItem.priority === 'high' ? 'bg-error/10 text-error' : tItem.priority === 'medium' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                        {tItem.priority}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-info/10">
                  <Bell className="h-5 w-5 text-info" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">{t('Recent Activity', 'النشاط الأخير', language)}</h2>
                  <p className="text-xs text-gray-400">{t('Notifications and messages', 'الإشعارات والرسائل', language)}</p>
                </div>
              </div>
              <Link href="/notifications" className="text-sm font-medium text-primary hover:underline">
                {t('View all', 'عرض الكل', language)}
              </Link>
            </CardHeader>
            <CardBody className="max-h-[22rem] flex-1 overflow-y-auto px-4 py-3">
              {data.recentNotifications.length === 0 && data.recentMessages.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-400">{t('No recent activity', 'لا يوجد نشاط حديث', language)}</p>
              ) : (
                <div className="space-y-3">
                  {data.recentNotifications.slice(0, 4).map((n) => {
                    const meta = notifMeta[n.type] || notifMeta.info;
                    const Icon = meta.icon;
                    return (
                      <div key={n.id} className="flex items-start gap-2.5">
                        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${meta.classes}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-800">
                            {language === 'ar' ? n.titleAr || n.title : n.title}
                          </p>
                          {n.message && (
                            <p className="truncate text-[11px] text-gray-500">
                              {language === 'ar' ? n.messageAr || n.message : n.message}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-400">{formatDate(n.createdAt, language)}</p>
                        </div>
                      </div>
                    );
                  })}
                  {data.recentMessages.slice(0, 2).map((m) => (
                    <div key={m.id} className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <MessageSquare className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-800">{m.senderName}</p>
                        <p className="truncate text-[11px] text-gray-500">{m.content}</p>
                        <p className="text-[10px] text-gray-400">{formatDate(m.timestamp, language)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader className="flex items-center justify-between px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-error/10">
                <Shield className="h-5 w-5 text-error" />
              </div>
              <div>
                <h2 className="text-base font-semibold">{t('Compliance Watchlist', 'قائمة المتابعة النظامية', language)}</h2>
                <p className="text-xs text-gray-400">{t('Iqama, permits, contracts & documents by urgency', 'الإقامة والتصاريح والعقود والمستندات حسب الأولوية', language)}</p>
              </div>
            </div>
            <Link href="/employees" className="text-sm font-medium text-primary hover:underline">
              {t('View all', 'عرض الكل', language)}
            </Link>
          </CardHeader>
          <CardBody className="max-h-[24rem] flex-1 overflow-y-auto px-4 py-2">
            {(() => {
              const items: { key: string; icon: LucideIcon; tint: string; title: string; sub: string; badge: string; badgeCls: string }[] = [];
              for (const d of data.upcomingDeadlines) {
                const days = daysUntil(d.date);
                if (days === null) continue;
                const kindLabel = d.kind === 'document' ? t('Document', 'مستند', language) : d.kind === 'contract' ? t('Contract', 'عقد', language) : d.kind === 'work_permit' ? t('Work Permit', 'تصريح عمل', language) : d.kind === 'iqama' ? t('Iqama', 'إقامة', language) : t('Probation', 'فترة تجريبية', language);
                items.push({
                  key: d.id,
                  icon: d.kind === 'document' ? FileClock : Timer,
                  tint: d.kind === 'iqama' ? 'bg-error/10 text-error' : d.kind === 'work_permit' ? 'bg-info/10 text-info' : d.kind === 'contract' ? 'bg-secondary/10 text-secondary' : 'bg-warning/10 text-warning',
                  title: d.title,
                  sub: kindLabel,
                  badge: days < 0 ? t('Expired', 'منتهي', language) : `${days} ${t('days', 'يوم', language)}`,
                  badgeCls: days < 0 || days <= 15 ? 'bg-error/10 text-error' : days <= 30 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success',
                });
              }
              for (const e of data.notReturnedVacations) {
                items.push({
                  key: `nr-${e.id}`,
                  icon: PlaneLanding,
                  tint: 'bg-error/10 text-error',
                  title: e.employeeName,
                  sub: t('Did not return from vacation', 'لم يعد من الإجازة', language),
                  badge: t('Overdue', 'متأخر', language),
                  badgeCls: 'bg-error/10 text-error',
                });
              }
              if (items.length === 0) {
                return <p className="py-12 text-center text-sm text-gray-400">{t('Everything is compliant 🎉', 'كل شيء منتظم 🎉', language)}</p>;
              }
              return (
                <div className="space-y-0.5">
                  {items.slice(0, 8).map((it) => {
                    const Icon = it.icon;
                    return (
                      <div key={it.key} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-gray-50">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${it.tint}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">{it.title}</p>
                          <p className="text-xs text-gray-400">{it.sub}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${it.badgeCls}`}>{it.badge}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardBody>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex items-center justify-between px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                <UserCheck className="h-5 w-5 text-success" />
              </div>
              <div>
                <h2 className="text-base font-semibold">{t("Today's Attendance", 'حضور اليوم', language)}</h2>
                <p className="text-xs text-gray-400">{t('Live status and weekly trend', 'الحالة المباشرة واتجاه الأسبوع', language)}</p>
              </div>
            </div>
            <Link href="/attendance" className="text-sm font-medium text-primary hover:underline">
              {t('View all', 'عرض الكل', language)}
            </Link>
          </CardHeader>
          <CardBody className="flex flex-col gap-4 px-5 py-4">
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: t('Present', 'حاضر', language), count: data.attendanceToday.present, cls: 'bg-success/10 text-success' },
                { label: t('Late', 'متأخر', language), count: data.attendanceToday.late, cls: 'bg-warning/10 text-warning' },
                { label: t('Absent', 'غائب', language), count: data.attendanceToday.absent, cls: 'bg-error/10 text-error' },
                { label: t('Half Day', 'نصف يوم', language), count: data.attendanceToday.halfDay, cls: 'bg-info/10 text-info' },
              ].map((s) => (
                <div key={s.label} className={`rounded-xl px-2 py-3 text-center ${s.cls}`}>
                  <p className="text-xl font-bold leading-none">{s.count}</p>
                  <p className="mt-1 text-[11px] font-medium opacity-80">{s.label}</p>
                </div>
              ))}
            </div>
            <Chart
              type="area"
              series={[
                { name: t('Present', 'حاضر', language), data: trendPresent },
                { name: t('Late', 'متأخر', language), data: trendLate },
                { name: t('Absent', 'غائب', language), data: trendAbsent },
              ]}
              categories={trendLabels}
              height={200}
              colors={[STATUS_HEX.present, STATUS_HEX.late, STATUS_HEX.absent]}
              dir={dir}
              locale={language}
            />
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10">
                <Activity className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h2 className="text-base font-semibold">{t('Workforce Status', 'حالة القوى العاملة', language)}</h2>
                <p className="text-xs text-gray-400">{t('Headcount health and nationality mix', 'الموظفون والجنسيات', language)}</p>
              </div>
            </div>
            <Link href="/employees" className="text-sm font-medium text-primary hover:underline">
              {t('View all', 'عرض الكل', language)}
            </Link>
          </CardHeader>
          <CardBody className="px-5 py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { key: 'active', label: t('Active', 'نشط', language), count: data.statusDistribution.find((s) => s.name === 'active')?.count || 0, hex: STATUS_HEX.active },
                { key: 'inactive', label: t('Inactive', 'غير نشط', language), count: data.statusDistribution.find((s) => s.name === 'inactive')?.count || 0, hex: STATUS_HEX.inactive },
                { key: 'terminated', label: t('Terminated', 'مفصول', language), count: data.statusDistribution.find((s) => s.name === 'terminated')?.count || 0, hex: STATUS_HEX.terminated },
              ].map((s) => {
                const pct = data.totalEmployees ? Math.round((s.count / data.totalEmployees) * 100) : 0;
                return (
                  <div key={s.key} className="rounded-xl bg-gray-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{s.label}</span>
                      <span className="text-xl font-bold text-gray-900">{s.count}</span>
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200/60">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.hex }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {data.nationalityDistribution.length > 0 && (
              <div className="mt-4 border-t border-gray-100/60 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{t('Top nationalities', 'أكثر الجنسيات', language)}</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.nationalityDistribution.slice(0, 6).map((n) => (
                    <span key={n.name} className="rounded-full bg-secondary/5 px-2.5 py-1 text-xs font-medium text-secondary">
                      {n.name} · {n.count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex items-center justify-between px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <PlaneTakeoff className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold">{t('On Leave Now', 'في إجازة الآن', language)}</h2>
                <p className="text-xs text-gray-400">{t('Currently on approved leave', 'في إجازة معتمدة حالياً', language)}</p>
              </div>
            </div>
            <Link href="/leaves" className="text-sm font-medium text-primary hover:underline">
              {t('View all', 'عرض الكل', language)}
            </Link>
          </CardHeader>
          <CardBody className="max-h-[24rem] flex-1 overflow-y-auto px-4 py-2">
            {data.onLeaveNow.length === 0 ? (
              <p className="py-12 text-center text-sm text-gray-400">{t('No one on leave', 'لا يوجد أحد في إجازة', language)}</p>
            ) : (
              <div className="space-y-0.5">
                {data.onLeaveNow.slice(0, 6).map((l) => (
                  <div key={l.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-gray-50">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {l.employeeName.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{l.employeeName}</p>
                      <p className="text-xs text-gray-400">
                        {getLeaveTypeLabel(l.type, language)} · {l.daysCount} {t('days', 'أيام', language)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
                      {t('until', 'حتى', language)} {formatDate(l.endDate, language)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

    </div>
  );
}
