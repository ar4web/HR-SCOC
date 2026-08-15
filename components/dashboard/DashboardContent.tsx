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
import { t, formatCurrency, formatDate, getStatusLabel, getStatusColor, getContractTypeLabel, getLeaveTypeLabel, daysUntil } from '@/lib/utils';
import {
  Users, UserCheck, CalendarClock, DollarSign, Receipt, FileWarning,
  ListTodo, TrendingUp, AlertTriangle, RefreshCw, CheckCircle2, XCircle,
  Clock, UserPlus, CalendarPlus, MessageSquare, Bell, FileText,
  BarChart3, Wallet, Timer, Globe, Shield, PlaneTakeoff, PlaneLanding,
  TriangleAlert, Building2, ClipboardCheck, PieChart,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#EC4899', '#8B5CF6', '#F97316', '#EF4444', '#06B6D4'];

const STATUS_HEX: Record<string, string> = {
  present: '#10B981',
  late: '#F59E0B',
  absent: '#EF4444',
  half_day: '#3B82F6',
  active: '#10B981',
  inactive: '#94A3B8',
  terminated: '#EF4444',
};

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
  pct?: number;
  chipValue?: string;
  span?: boolean;
  footer?: { en: string; ar: string; tone: 'success' | 'warning' | 'error' }[];
}

export function DashboardContent() {
  const { language, dir } = useLanguageStore();
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [now, setNow] = React.useState(new Date());

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
      pct: data.totalEmployees ? Math.round((data.activeEmployees / data.totalEmployees) * 100) : 0,
      chipValue: data.totalEmployees ? `${Math.round((data.activeEmployees / data.totalEmployees) * 100)}%` : undefined,
    },
    {
      label: { en: 'Present Today', ar: 'الحاضرون اليوم' },
      value: `${presentToday}/${data.totalEmployees}`,
      sub: { en: `${data.attendanceToday.late} late`, ar: `${data.attendanceToday.late} متأخر` },
      icon: UserCheck,
      chip: 'bg-success/10 text-success',
      pct: attendancePct,
      chipValue: `${attendancePct}%`,
    },
    {
      label: { en: 'Pending Leaves', ar: 'الإجازات المعلقة' },
      value: String(data.pendingLeaves),
      sub: { en: 'awaiting approval', ar: 'بانتظار الموافقة' },
      icon: CalendarClock,
      chip: 'bg-warning/10 text-warning',
      footer: [{ en: 'Approve now', ar: 'اعتماد الآن', tone: 'warning' }],
    },
    {
      label: { en: 'Monthly Payroll', ar: 'الرواتب الشهرية' },
      value: formatCurrency(data.totalPayroll),
      sub: { en: `avg ${formatCurrency(data.avgSalary)}`, ar: `متوسط ${formatCurrency(data.avgSalary)}` },
      icon: DollarSign,
      chip: 'bg-secondary/10 text-secondary',
      span: true,
    },
    {
      label: { en: 'Pending Expenses', ar: 'المصروفات المعلقة' },
      value: formatCurrency(data.pendingExpenseTotal),
      sub: { en: `${data.pendingExpenses} request(s)`, ar: `${data.pendingExpenses} طلب` },
      icon: Receipt,
      chip: 'bg-accent/10 text-accent-600',
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
      chip: 'bg-emerald-100 text-emerald-600',
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
  const deptPayroll = data.departmentDistribution.map((d) => Math.round(d.payroll / 1000));
  const attLabels = [
    t('Present', 'حاضر', language),
    t('Late', 'متأخر', language),
    t('Absent', 'غائب', language),
    t('Half Day', 'نصف يوم', language),
  ];
  const attSeries = [
    data.attendanceToday.present,
    data.attendanceToday.late,
    data.attendanceToday.absent,
    data.attendanceToday.halfDay,
  ];
  const trendLabels = data.attendanceTrend.map((d) =>
    new Date(d.date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-GB', { weekday: 'short' })
  );
  const trendPresent = data.attendanceTrend.map((d) => d.present);
  const trendLate = data.attendanceTrend.map((d) => d.late);
  const trendAbsent = data.attendanceTrend.map((d) => d.absent);

  const quickActions = [
    { label: t('New Employee', 'موظف جديد', language), icon: UserPlus, href: '/employees/new', chip: 'bg-primary/10 text-primary' },
    { label: t('Apply Leave', 'طلب إجازة', language), icon: CalendarPlus, href: '/leaves/new', chip: 'bg-warning/10 text-warning' },
    { label: t('Open Chat', 'فتح الدردشة', language), icon: MessageSquare, href: '/communication', chip: 'bg-info/10 text-info' },
    { label: t('Record Expense', 'تسجيل مصروف', language), icon: Receipt, href: '/expenses', chip: 'bg-accent/10 text-accent-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {greeting}, {language === 'ar' ? user?.nameAr || user?.name : user?.name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
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
          <ModuleSettingsMenu module={t('Dashboard', 'لوحة القيادة', language)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {quickActions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              className="group flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-card transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${a.chip}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-primary">
                {a.label}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => {
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
              pct={k.pct}
              barClassName="bg-gradient-to-r from-primary to-emerald-500"
              size="md"
              className={k.span ? 'sm:col-span-2' : undefined}
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
                    }))
                  : undefined
              }
            />
          );
        })}
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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
              <UserCheck className="h-4 w-4 text-success" />
            </div>
            <div>
              <h2 className="text-base font-semibold">{t("Today's Attendance", 'حضور اليوم', language)}</h2>
              <p className="text-xs text-gray-400">{t('Status breakdown', 'توزيع الحالة', language)}</p>
            </div>
          </CardHeader>
          <CardBody className="flex items-center justify-center">
            <Chart
              type="donut"
              series={attSeries}
              labels={attLabels}
              height={260}
              width="100%"
              className="w-full"
              colors={[STATUS_HEX.present, STATUS_HEX.late, STATUS_HEX.absent, STATUS_HEX.half_day]}
              donutSize="68%"
              dir={dir}
              locale={language}
            />
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
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

        <Card>
          <CardHeader className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/10">
              <Wallet className="h-4 w-4 text-secondary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">{t('Payroll by Department', 'الرواتب حسب القسم', language)}</h2>
              <p className="text-xs text-gray-400">{t('Monthly salary (000 ﷼)', 'الراتب الشهري (000 ريال)', language)}</p>
            </div>
          </CardHeader>
          <CardBody>
            {deptNames.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">{t('No data available', 'لا توجد بيانات', language)}</p>
            ) : (
              <Chart
                type="bar"
                series={[{ name: t('Payroll (K ﷼)', 'الرواتب (ألف ريال)', language), data: deptPayroll }]}
                categories={deptNames}
                height={260}
                colors={[COLORS[1]]}
                showLegend={false}
                dir={dir}
                locale={language}
              />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/10">
              <Globe className="h-4 w-4 text-info" />
            </div>
            <div>
              <h2 className="text-base font-semibold">{t('Nationality Distribution', 'التوزيع حسب الجنسية', language)}</h2>
              <p className="text-xs text-gray-400">{t('Employees by nationality', 'الموظفون حسب الجنسية', language)}</p>
            </div>
          </CardHeader>
          <CardBody className="flex items-center justify-center">
            {data.nationalityDistribution.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">{t('No data available', 'لا توجد بيانات', language)}</p>
            ) : (
              <Chart
                type="donut"
                series={data.nationalityDistribution.map((d) => d.count)}
                labels={data.nationalityDistribution.map((d) => d.name)}
                height={250}
                width="100%"
                className="w-full"
                colors={COLORS}
                donutSize="66%"
                dir={dir}
                locale={language}
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/10">
              <Building2 className="h-4 w-4 text-secondary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">{t('Sponsor Comparison', 'مقارنة الكفلاء', language)}</h2>
              <p className="text-xs text-gray-400">{t('Headcount by sponsor', 'عدد الموظفين حسب الكفيل', language)}</p>
            </div>
          </CardHeader>
          <CardBody>
            {data.sponsorDistribution.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">{t('No data available', 'لا توجد بيانات', language)}</p>
            ) : (
              <Chart
                type="bar"
                series={[{ name: t('Employees', 'الموظفون', language), data: data.sponsorDistribution.map((d) => d.count) }]}
                categories={data.sponsorDistribution.map((d) => d.name)}
                height={250}
                colors={[COLORS[4]]}
                showLegend={false}
                showDataLabels
                dir={dir}
                locale={language}
              />
            )}
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

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <UserCheck className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold">{t('Today at a Glance', 'اليوم في لمحة', language)}</h2>
                <p className="text-xs text-gray-400">{t('Employee attendance status', 'حالة حضور الموظفين', language)}</p>
              </div>
            </CardHeader>
            <CardBody className="max-h-72 overflow-y-auto pr-1">
              <div className="space-y-1.5">
                {data.todayAttendance.map((a) => (
                  <div key={a.employeeId} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-gray-50">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500">
                      {a.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-gray-800">{a.name}</p>
                      <p className="truncate text-[10px] text-gray-400">{a.department}</p>
                    </div>
                    {a.clockIn && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                        <Clock className="h-3 w-3" />
                        {a.clockIn}
                      </span>
                    )}
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusColor(a.status)}`}>
                      {getStatusLabel(a.status, language)}
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/10">
                <Bell className="h-4 w-4 text-info" />
              </div>
              <div>
                <h2 className="text-base font-semibold">{t('Recent Activity', 'النشاط الأخير', language)}</h2>
                <p className="text-xs text-gray-400">{t('Latest notifications and messages', 'أحدث الإشعارات والرسائل', language)}</p>
              </div>
            </CardHeader>
            <CardBody className="max-h-72 overflow-y-auto pr-1">
              <div className="space-y-3">
                {data.recentNotifications.length === 0 && data.recentMessages.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-400">{t('No recent activity', 'لا يوجد نشاط حديث', language)}</p>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
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

      {(data.pendingLeavesList.length > 0 || data.pendingExpensesList.length > 0) && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10">
                <ClipboardCheck className="h-4 w-4 text-warning" />
              </div>
              <div>
                <h2 className="text-base font-semibold">{t('Pending Approvals', 'الموافقات المعلقة', language)}</h2>
                <p className="text-xs text-gray-400">{t('Leave requests and expenses awaiting your decision', 'طلبات إجازة ومصروفات بانتظار قرارك', language)}</p>
              </div>
            </div>
            <div className="flex gap-4">
              {data.pendingLeavesList.length > 0 && (
                <Link href="/leaves" className="text-sm font-medium text-primary hover:underline">
                  {t('Review leaves', 'مراجعة الإجازات', language)}
                </Link>
              )}
              {data.pendingExpensesList.length > 0 && (
                <Link href="/expenses" className="text-sm font-medium text-primary hover:underline">
                  {t('Review expenses', 'مراجعة المصاريف', language)}
                </Link>
              )}
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {data.pendingLeavesList.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t('Leave Requests', 'طلبات الإجازة', language)}
                  </p>
                  <div className="space-y-2">
                    {data.pendingLeavesList.map((l) => (
                      <div key={l.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <CalendarPlus className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {language === 'ar' ? l.employeeNameAr || l.employeeName : l.employeeName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {getLeaveTypeLabel(l.type, language)} • {l.daysCount} {t('days', 'أيام', language)}
                          </p>
                        </div>
                        <div className="text-right rtl:text-left">
                          <p className="text-xs font-medium text-gray-700">{formatDate(l.startDate, language)}</p>
                          <span className="mt-1 inline-block rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">
                            {getStatusLabel('pending', language)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data.pendingExpensesList.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t('Expenses', 'المصاريف', language)}
                  </p>
                  <div className="space-y-2">
                    {data.pendingExpensesList.map((x) => (
                      <div key={x.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                          <Receipt className="h-4 w-4 text-accent-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900">{x.requestedByName}</p>
                          <p className="truncate text-xs text-gray-500">{x.category} — {x.description}</p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(x.amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                  const days = daysUntil(r.expiryDate) ?? r.daysLeft;
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