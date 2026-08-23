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
import { AddTodoDialog, AddReminderDialog } from '@/components/dashboard/AddDialogs';
import { t, formatCurrency, formatDate, getStatusLabel, getContractTypeLabel, getLeaveTypeLabel, daysUntil } from '@/lib/utils';
import {
  Users, UserCheck, CalendarClock, DollarSign, Receipt, FileWarning,
  ListTodo, TrendingUp, AlertTriangle, RefreshCw, CheckCircle2, XCircle,
  UserPlus, CalendarPlus, MessageSquare, Bell, FileText, ArrowUpRight,
  BarChart3, Timer, Shield, PlaneTakeoff, PlaneLanding,
  TriangleAlert, ClipboardCheck, PieChart, FileClock, AlarmClock,
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
  const COLORS = theme.palette;
  const STATUS_HEX = statusHexMap(theme);
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [now, setNow] = React.useState(new Date());
  const [addOpen, setAddOpen] = React.useState(false);
  const [dialog, setDialog] = React.useState<'todo' | 'reminder' | null>(null);

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
            <div key={i} className="h-28 rounded-2xl border border-gray-100 bg-white shadow-card animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="h-80 rounded-2xl border border-gray-100 bg-white shadow-card animate-pulse lg:col-span-2" />
          <div className="h-80 rounded-2xl border border-gray-100 bg-white shadow-card animate-pulse" />
        </div>
      </div>
    );
  }

  const hour = now.getHours();
  const greeting = hour < 12 ? t('Good morning', 'صباح الخير', language) : hour < 18 ? t('Good afternoon', 'مساء الخير', language) : t('Good evening', 'مساء الخير', language);

  const presentToday = data.attendanceToday.present + data.attendanceToday.late;
  const attendancePct = data.totalEmployees > 0 ? Math.round((presentToday / data.totalEmployees) * 100) : 0;
  const weekDays = data.attendanceTrend.length;
  const weekAvgPct =
    weekDays > 0 && data.totalEmployees > 0
      ? Math.round(data.attendanceTrend.reduce((sum, t) => sum + t.present + t.late, 0) / (weekDays * data.totalEmployees) * 100)
      : 0;
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
      label: { en: 'Pending Leaves', ar: 'الإجازات المعلقة' },
      value: String(data.pendingLeaves),
      sub: { en: 'awaiting approval', ar: 'بانتظار الموافقة' },
      icon: CalendarClock,
      chip: 'bg-warning/10 text-warning',
      tone: 'from-warning to-warning/70',
      toneText: 'text-warning',
      footer: [{ en: 'Approve now', ar: 'اعتماد الآن', tone: 'warning' }],
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
      label: { en: 'Pending Expenses', ar: 'المصروفات المعلقة' },
      value: formatCurrency(data.pendingExpenseTotal),
      sub: { en: `${data.pendingExpenses} request(s)`, ar: `${data.pendingExpenses} طلب` },
      icon: Receipt,
      chip: 'bg-accent/10 text-accent',
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
      label: { en: 'Attendance Rate', ar: 'نسبة الحضور' },
      value: `${weekAvgPct}%`,
      sub: { en: 'last 7 days avg', ar: 'متوسط آخر 7 أيام' },
      icon: TrendingUp,
      chip: 'bg-success/10 text-success',
      pct: weekAvgPct,
      chipValue: `${weekAvgPct}%`,
    },
    {
      label: { en: 'On Leave Now', ar: 'في إجازة الآن' },
      value: String(data.onLeaveNow.length),
      sub: { en: `${data.notReturnedVacations.length} overdue return`, ar: `${data.notReturnedVacations.length} تأخر في العودة` },
      icon: PlaneTakeoff,
      chip: 'bg-primary/10 text-primary',
    },
    {
      label: { en: 'Not Returned', ar: 'لم يعودوا' },
      value: String(data.notReturnedVacations.length),
      sub: { en: data.notReturnedVacations[0]?.reason || 'no overdue leaves', ar: data.notReturnedVacations[0]?.reason || 'لا توجد إجازات متأخرة' },
      icon: PlaneLanding,
      chip: 'bg-error/10 text-error',
      footer: [{ en: 'Review overdue', ar: 'مراجعة المتأخرين', tone: 'error' }],
    },
    {
      label: { en: 'Critical Runway', ar: 'صلاحية حرجة' },
      value: String(data.criticalRunway.length),
      sub: { en: 'permits/contracts ≤ 90 days', ar: 'تصاريح/عقود ≤ 90 يوم' },
      icon: Shield,
      chip: 'bg-warning/10 text-warning',
      footer: [{ en: 'View expiries', ar: 'عرض الانتهاءات', tone: 'warning' }],
    },
  ];

  const deptCounts = data.departmentDistribution.map((d) => d.count);
  const deptNames = data.departmentDistribution.map((d) => d.name);
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
                const cls = 'group flex flex-col gap-2.5 rounded-xl border border-gray-100 bg-white p-4 shadow-card transition-all hover:border-primary/30 hover:shadow-md';
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

      {(() => {
        const alerts: { icon: LucideIcon; count: number; title: string; tone: string; iconBg: string; href: string }[] = [];
        const errCount = data.expiredDocuments.length;
        const warnCount = data.expiringDocuments.length;
        const runwayCritical = data.criticalRunway.length;
        const notReturned = data.notReturnedVacations.length;
        const pendingCount = data.pendingLeaves + data.pendingExpenses;
        if (errCount > 0) alerts.push({ icon: FileText, count: errCount, title: t('Expired documents', 'مستندات منتهية', language), tone: 'border-error/20 bg-error/5 text-error', iconBg: 'bg-error/15 text-error', href: '/documents' });
        if (runwayCritical > 0) alerts.push({ icon: Shield, count: runwayCritical, title: t('Critical expiries', 'انتهاءات حرجة', language), tone: 'border-error/20 bg-error/5 text-error', iconBg: 'bg-error/15 text-error', href: '/employees' });
        if (notReturned > 0) alerts.push({ icon: PlaneLanding, count: notReturned, title: t('Not returned', 'لم يعودوا', language), tone: 'border-error/20 bg-error/5 text-error', iconBg: 'bg-error/15 text-error', href: '/leaves' });
        if (pendingCount > 0) alerts.push({ icon: ClipboardCheck, count: pendingCount, title: t('Pending approvals', 'موافقات معلقة', language), tone: 'border-warning/20 bg-warning/5 text-warning', iconBg: 'bg-warning/15 text-warning', href: '/leaves' });
        if (warnCount > 0) alerts.push({ icon: FileClock, count: warnCount, title: t('Expiring soon', 'تنتهي قريباً', language), tone: 'border-warning/20 bg-warning/5 text-warning', iconBg: 'bg-warning/15 text-warning', href: '/documents' });
        if (alerts.length === 0) {
          return (
            <div className="flex items-center gap-2.5 rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm font-medium text-success">
              <CheckCircle2 className="h-4 w-4" />
              {t('All clear — no urgent alerts', 'كل شيء على ما يرام — لا توجد تنبيهات عاجلة', language)}
            </div>
          );
        }
        return (
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {alerts.slice(0, 4).map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.title}
                  href={a.href}
                  className={`group flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-all hover:shadow-sm ${a.tone}`}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.iconBg}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold leading-tight">{a.count}</p>
                    <p className="truncate text-[11px] leading-tight opacity-80">{a.title}</p>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-40 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              );
            })}
          </div>
        );
      })()}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="grid grid-cols-2 gap-3 lg:col-span-2">
          {kpis.slice(0, 4).map((k) => {
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

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
                  <ListTodo className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">{t('Top Todo', 'أهم المهام', language)}</h2>
                  <p className="text-[11px] text-gray-400">{t('Open tasks by priority', 'مهام مفتوحة حسب الأولوية', language)}</p>
                </div>
              </div>
              <Link href="/todos" className="text-sm font-medium text-primary hover:underline">
                {t('View all', 'عرض الكل', language)}
              </Link>
            </CardHeader>
            <CardBody className="max-h-72 overflow-y-auto px-4 py-3 pr-2">
              {data.todoItems.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">{t('No open tasks 🎉', 'لا توجد مهام مفتوحة 🎉', language)}</p>
              ) : (
                <div className="space-y-2.5">
                  {data.todoItems.map((tItem) => (
                    <div key={tItem.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-gray-50">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          tItem.priority === 'high' ? 'bg-error' : tItem.priority === 'medium' ? 'bg-warning' : 'bg-success'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-gray-800">{tItem.title}</p>
                        <p className="text-[10px] text-gray-400">
                          {tItem.dueDate ? t('Due', 'استحقاق', language) + ' ' + formatDate(tItem.dueDate, language) : t('No due date', 'بدون تاريخ', language)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          tItem.priority === 'high' ? 'bg-error/10 text-error' : tItem.priority === 'medium' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                        }`}
                      >
                        {tItem.priority}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10">
                  <Bell className="h-4 w-4 text-info" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">{t('Recent Activity', 'النشاط الأخير', language)}</h2>
                  <p className="text-[11px] text-gray-400">{t('Latest notifications and messages', 'أحدث الإشعارات والرسائل', language)}</p>
                </div>
              </div>
              <span className="rounded-full bg-info/10 px-2 py-0.5 text-[10px] font-semibold text-info">
                {data.recentNotifications.length + data.recentMessages.length}
              </span>
            </CardHeader>
            <CardBody className="max-h-32 overflow-y-auto px-4 py-3 pr-2">
              {data.recentNotifications.length === 0 && data.recentMessages.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">{t('No recent activity', 'لا يوجد نشاط حديث', language)}</p>
              ) : (
                <div className="space-y-3">
                  {data.recentNotifications.map((n) => {
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
                  {data.recentMessages.map((m) => (
                    <div key={m.id} className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <MessageSquare className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-800">{m.senderName}</p>
                        <p className="truncate text-[11px] text-gray-500">
                          {m.attachment ? (m.attachment.type === 'image' ? t('📷 Image', '📷 صورة', language) : `📎 ${m.attachment.name}`) : m.content}
                        </p>
                        <p className="text-[10px] text-gray-400">{formatDate(m.timestamp, language)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <AlarmClock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">{t('Next Coming', 'القادم', language)}</h2>
                  <p className="text-[11px] text-gray-400">{t('Upcoming leaves, expiries & deadlines', 'الإجازات القادمة والمواعيد والانتهاءات', language)}</p>
                </div>
              </div>
              <Link href="/employees" className="text-sm font-medium text-primary hover:underline">
                {t('View all', 'عرض الكل', language)}
              </Link>
            </CardHeader>
            <CardBody className="max-h-32 overflow-y-auto px-4 py-3 pr-2">
              {data.upcomingDeadlines.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">{t('Nothing upcoming', 'لا يوجد شيء قادم', language)}</p>
              ) : (
                <div className="space-y-2.5">
                  {data.upcomingDeadlines.map((d) => {
                    const days = daysUntil(d.date);
                    return (
                      <div key={d.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-gray-50">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${d.kind === 'document' ? 'bg-accent/10 text-accent-600' : d.kind === 'iqama' ? 'bg-error/10 text-error' : d.kind === 'work_permit' ? 'bg-info/10 text-info' : d.kind === 'contract' ? 'bg-secondary/10 text-secondary' : 'bg-warning/10 text-warning'}`}>
                          {d.kind === 'document' ? <FileClock className="h-3.5 w-3.5" /> : <Timer className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-gray-800">{d.title}</p>
                          <p className="text-[10px] text-gray-400">
                            {d.kind === 'document' ? t('Document', 'مستند', language) : d.kind === 'contract' ? t('Contract', 'عقد', language) : d.kind === 'work_permit' ? t('Work Permit', 'تصريح عمل', language) : d.kind === 'iqama' ? t('Iqama', 'إقامة', language) : t('Probation', 'فترة تجريبية', language)}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${days === null || days < 0 ? 'bg-error/10 text-error' : days <= 30 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                          {days === null ? '—' : days < 0 ? t('Expired', 'منتهي', language) : `${days} ${t('d', 'يوم', language)}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
                <Activity className="h-4 w-4 text-success" />
              </div>
              <div>
                <h2 className="text-base font-semibold">{t('Workforce Status', 'حالة القوى العاملة', language)}</h2>
                <p className="text-xs text-gray-400">{t('Active, inactive and terminated headcount', 'الموظفون النشطون وغير النشطين والمفصولون', language)}</p>
              </div>
            </div>
            <Link href="/employees" className="text-sm font-medium text-primary hover:underline">
              {t('View all', 'عرض الكل', language)}
            </Link>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { key: 'active', label: t('Active', 'نشط', language), count: data.statusDistribution.find((s) => s.name === 'active')?.count || 0, hex: STATUS_HEX.active },
                { key: 'inactive', label: t('Inactive', 'غير نشط', language), count: data.statusDistribution.find((s) => s.name === 'inactive')?.count || 0, hex: STATUS_HEX.inactive },
                { key: 'terminated', label: t('Terminated', 'مفصول', language), count: data.statusDistribution.find((s) => s.name === 'terminated')?.count || 0, hex: STATUS_HEX.terminated },
              ].map((s) => {
                const pct = data.totalEmployees ? Math.round((s.count / data.totalEmployees) * 100) : 0;
                return (
                  <div key={s.key} className="rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{s.label}</span>
                      <span className="text-xl font-bold text-gray-900">{s.count}</span>
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.hex }} />
                    </div>
                    <p className="mt-1.5 text-xs text-gray-400">{pct}%</p>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <PlaneTakeoff className="h-4 w-4 text-primary" />
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
          <CardBody className="max-h-64 overflow-y-auto pr-1">
            {data.onLeaveNow.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">{t('No one on leave', 'لا يوجد أحد في إجازة', language)}</p>
            ) : (
              <div className="space-y-2">
                {data.onLeaveNow.slice(0, 6).map((l) => (
                  <div key={l.id} className="flex items-center gap-3 rounded-xl border border-gray-100 px-3.5 py-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                      {l.employeeName.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800">{l.employeeName}</p>
                      <p className="text-[11px] text-gray-400">
                        {getLeaveTypeLabel(l.type, language)} · {l.daysCount} {t('days', 'أيام', language)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                      {formatDate(l.endDate, language)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold">{t('Headcount by Department', 'عدد الموظفين حسب القسم', language)}</h2>
                <p className="text-xs text-gray-400">{t('Current headcount distribution', 'التوزيع الحالي للموظفين', language)}</p>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {deptNames.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">{t('No data available', 'لا توجد بيانات', language)}</p>
            ) : (
              <Chart
                type="bar"
                series={[{ name: t('Employees', 'الموظفون', language), data: deptCounts }]}
                categories={deptNames}
                height={260}
                colors={[COLORS[0]]}
                showLegend={false}
                showDataLabels
                dir={dir}
                locale={language}
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/10">
              <TrendingUp className="h-4 w-4 text-info" />
            </div>
            <div>
              <h2 className="text-base font-semibold">{t('Attendance Trend (7 days)', 'اتجاه الحضور (7 أيام)', language)}</h2>
              <p className="text-xs text-gray-400">{t('Daily present, late and absent counts', 'العدد اليومي للحاضرين والمتأخرين والغائبين', language)}</p>
            </div>
          </CardHeader>
          <CardBody>
            <Chart
              type="area"
              series={[
                { name: t('Present', 'حاضر', language), data: trendPresent },
                { name: t('Late', 'متأخر', language), data: trendLate },
                { name: t('Absent', 'غائب', language), data: trendAbsent },
              ]}
              categories={trendLabels}
              height={260}
              colors={[STATUS_HEX.present, STATUS_HEX.late, STATUS_HEX.absent]}
              dir={dir}
              locale={language}
            />
          </CardBody>
        </Card>

      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10">
                <CalendarClock className="h-4 w-4 text-warning" />
              </div>
              <div>
                <h2 className="text-base font-semibold">{t('Pending Approvals', 'الموافقات المعلقة', language)}</h2>
                <p className="text-xs text-gray-400">{t('Leave requests waiting for your decision', 'طلبات إجازة بانتظار قرارك', language)}</p>
              </div>
            </div>
            <Link href="/leaves" className="text-sm font-medium text-primary hover:underline">
              {t('View all', 'عرض الكل', language)}
            </Link>
          </CardHeader>
          <CardBody>
            {data.pendingLeaveRequests.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">
                {t('No pending approvals 🎉', 'لا توجد موافقات معلقة 🎉', language)}
              </p>
            ) : (
              <div className="space-y-3">
                {data.pendingLeaveRequests.map((l) => (
                  <div key={l.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 p-3.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {l.employeeName.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{l.employeeName}</p>
                      <p className="text-xs text-gray-500">
                        {getLeaveTypeLabel(l.type, language)} • {l.daysCount} {t('day(s)', 'أيام', language)} • {formatDate(l.startDate, language)}
                        {l.reason ? ` • ${l.reason}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLeaveDecision(l.id, 'approved')}
                        className="inline-flex items-center gap-1 rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-white hover:bg-success/90"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t('Approve', 'موافقة', language)}
                      </button>
                      <button
                        onClick={() => handleLeaveDecision(l.id, 'rejected')}
                        className="inline-flex items-center gap-1 rounded-lg border border-error/20 px-3 py-1.5 text-xs font-medium text-error hover:bg-error/10"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        {t('Reject', 'رفض', language)}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(data.expiredDocuments.length > 0 || data.expiringDocuments.length > 0) && (
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">{t('Document Expiry Alerts', 'تنبيهات انتهاء المستندات', language)}</h3>
                  <Link href="/documents" className="text-xs font-medium text-primary hover:underline">
                    {t('View all', 'عرض الكل', language)}
                  </Link>
                </div>
                <div className="space-y-2">
                  {data.expiredDocuments.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 rounded-xl bg-error/5 px-3.5 py-2.5">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-error" />
                      <p className="flex-1 truncate text-sm text-gray-700">
                        {language === 'ar' ? d.nameAr || d.name : d.name}
                      </p>
                      <span className="rounded-full bg-error/10 px-2 py-0.5 text-xs font-semibold text-error">
                        {t('Expired', 'منتهي', language)}
                      </span>
                    </div>
                  ))}
                  {data.expiringDocuments.map((d) => {
                    const days = Math.round((new Date(d.expiryDate!).getTime() - now.getTime()) / 86400000);
                    return (
                      <div key={d.id} className="flex items-center gap-3 rounded-xl bg-warning/5 px-3.5 py-2.5">
                        <Timer className="h-4 w-4 shrink-0 text-warning" />
                        <p className="flex-1 truncate text-sm text-gray-700">
                          {language === 'ar' ? d.nameAr || d.name : d.name}
                        </p>
                        <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">
                          {days} {t('days', 'أيام', language)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {data.pendingExpenses > 0 && (
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">{t('Pending Expenses', 'المصروفات المعلقة', language)}</h3>
                  <Link href="/expenses" className="text-xs font-medium text-primary hover:underline">
                    {t('View all', 'عرض الكل', language)}
                  </Link>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-accent/5 px-3.5 py-2.5">
                  <Receipt className="h-4 w-4 shrink-0 text-accent-600" />
                  <p className="flex-1 text-sm text-gray-700">
                    {data.pendingExpenses} {t('expense request(s)', 'طلب مصروف', language)}
                  </p>
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent-600">
                    {formatCurrency(data.pendingExpenseTotal)}
                  </span>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {data.upcomingLeaves.length > 0 && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/10">
                <CalendarClock className="h-4 w-4 text-secondary" />
              </div>
              <div>
                <h2 className="text-base font-semibold">{t('Upcoming Leaves', 'الإجازات القادمة', language)}</h2>
                <p className="text-xs text-gray-400">{t('Approved and pending leaves in the pipeline', 'الإجازات المعتمدة والمعلقة', language)}</p>
              </div>
            </div>
            <Link href="/leaves" className="text-sm font-medium text-primary hover:underline">
              {t('View all', 'عرض الكل', language)}
            </Link>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.upcomingLeaves.map((l) => (
                <div key={l.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
                  <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10">
                    <CalendarPlus className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{l.employeeName}</p>
                    <p className="text-xs text-gray-500">
                      {getLeaveTypeLabel(l.type, language)} • {l.daysCount} {t('days', 'أيام', language)}
                    </p>
                  </div>
                  <div className="text-right rtl:text-left">
                    <p className="text-xs font-medium text-gray-700">{formatDate(l.startDate, language)}</p>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${l.status === 'approved' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                      {getStatusLabel(l.status, language)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {data.expenseByCategory.length > 0 && (
        <Card>
          <CardHeader className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
              <PieChart className="h-4 w-4 text-accent-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold">
                {t('Expenses by Category', 'المصاريف حسب الفئة', language)}
              </h2>
              <p className="text-xs text-gray-400">
                {t('Total spend per expense category', 'إجمالي الإنفاق حسب فئة المصروف', language)}
              </p>
            </div>
          </CardHeader>
          <CardBody className="flex items-center justify-center">
            <Chart
              type="donut"
              series={data.expenseByCategory.map((c) => c.amount)}
              labels={data.expenseByCategory.map((c) => c.category)}
              height={260}
              donutSize="68%"
              colors={COLORS}
              dir={dir}
              locale={language}
            />
          </CardBody>
        </Card>
      )}

      {data.contractDistribution.length > 0 && (
        <Card>
          <CardHeader className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
              <FileText className="h-4 w-4 text-accent-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold">{t('Contract Types', 'أنواع العقود', language)}</h2>
              <p className="text-xs text-gray-400">{t('Breakdown by contract type', 'التوزيع حسب نوع العقد', language)}</p>
            </div>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {data.contractDistribution.map((c, i) => (
              <div key={c.name} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{getContractTypeLabel(c.name, language)}</span>
                  <span className="text-lg font-bold text-gray-900">{c.count}</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${data.totalEmployees ? Math.round((c.count / data.totalEmployees) * 100) : 0}%`, backgroundColor: COLORS[i % COLORS.length] }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-400">
                  {data.totalEmployees ? Math.round((c.count / data.totalEmployees) * 100) : 0}%
                </p>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10">
                <Shield className="h-4 w-4 text-warning" />
              </div>
              <div>
                <h2 className="text-base font-semibold">{t('Employee Runway', 'صلاحية الموظفين', language)}</h2>
                <p className="text-xs text-gray-400">{t('Work permits, iqama & contracts expiring', 'تصاريح العمل والإقامة والعقود المنتهية القريبة', language)}</p>
              </div>
            </div>
            <span className="rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
              {data.criticalRunway.length} {t('critical', 'حرج', language)}
            </span>
          </CardHeader>
          <CardBody className="max-h-80 overflow-y-auto pr-1">
            {data.runway.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">{t('No runways tracked', 'لا توجد مواعيد انتهاء', language)}</p>
            ) : (
              <div className="space-y-2">
                {data.runway.slice(0, 10).map((r) => {
                  const days = daysUntil(r.expiryDate) ?? r.daysLeft ?? 0;
                  const critical = r.daysLeft <= 90;
                  return (
                    <div key={r.employeeId + r.type} className="flex items-center gap-3 rounded-xl border border-gray-100 px-3.5 py-2.5">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${critical ? 'bg-error/10 text-error' : 'bg-info/10 text-info'}`}>
                        <Timer className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-800">{r.name}</p>
                        <p className="text-[11px] text-gray-400">
                          {r.type === 'work_permit' ? t('Work Permit', 'تصريح عمل', language) : r.type === 'iqama' ? t('Iqama', 'إقامة', language) : r.type === 'contract' ? t('Contract', 'عقد', language) : t('Probation', 'فترة تجريبية', language)} • {formatDate(r.expiryDate, language)}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${days < 0 ? 'bg-error/10 text-error' : days <= 30 ? 'bg-error/10 text-error' : critical ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                        {days < 0 ? t('Expired', 'منتهي', language) : `${days} ${t('days', 'أيام', language)}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-error/10">
              <PlaneLanding className="h-4 w-4 text-error" />
            </div>
            <div>
              <h2 className="text-base font-semibold">{t('Vacation Returns', 'العودة من الإجازة', language)}</h2>
              <p className="text-xs text-gray-400">{t('Who has not returned from vacation & why', 'من لم يعد من الإجازة ولماذا', language)}</p>
            </div>
          </CardHeader>
          <CardBody className="max-h-80 overflow-y-auto pr-1">
            {data.notReturnedVacations.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">
                {t('Everyone returned on time 🎉', 'الجميع عادوا في الوقت 🎉', language)}
              </p>
            ) : (
              <div className="space-y-2">
                {data.notReturnedVacations.map((v) => (
                  <div key={v.id} className="flex items-start gap-3 rounded-xl border border-error/10 bg-error/5 px-3.5 py-2.5">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-error" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800">{v.employeeName}</p>
                      <p className="text-[11px] text-gray-500">
                        {getLeaveTypeLabel(v.type, language)} · {formatDate(v.endDate, language)} · {v.reason || t('No reason', 'بدون سبب', language)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-error/10 px-2 py-0.5 text-[11px] font-bold text-error">
                      +{v.overdueDays} {t('days', 'أيام', language)}
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
