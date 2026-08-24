'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { Card } from '@/components/ui/Card';
import {
  CalendarDays, Wallet, SearchX, Activity, UserCheck, Timer, FileWarning, PiggyBank, Coins, Landmark,
} from 'lucide-react';
import { Chart } from '@/engines/chart-engine';
import { useChartTheme } from '@/lib/chart-theme';
import { t, formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';

interface ReportData {
  employee: { id: string; fullName: string; fullNameAr: string; department: string; position: string };
  attendanceTrend: { label: string; present: number; late: number; absent: number; half_day: number; total: number }[];
  leave: { annualAllowed: number; used: number; remaining: number; byType: Record<string, number>; totalRequests: number; pending: number };
  payroll: { count: number; latest: { period: string; net: number; gross: number } | null; grossTotal: number; average: number };
  salary: { basic: number; housing: number; transportation: number; otherAllowances: number; total: number };
  attendanceRate: number;
}

const MONTH_LABEL = (raw: string, locale: 'en' | 'ar') => {
  const [y, m] = raw.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { month: 'short' });
};

function Panel({ icon: Icon, title, sub, right, children }: {
  icon: React.ElementType;
  title: string;
  sub?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white shadow-card">
      <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-400" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            {sub && <p className="text-xs text-gray-400">{sub}</p>}
          </div>
        </div>
        {right}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl bg-white shadow-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
        <Icon className="h-3.5 w-3.5 text-gray-400" />
        {label}
      </div>
      <p className={`mt-1.5 text-xl font-semibold tracking-tight text-gray-900 ${accent || ''}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export function EmployeeReport({ employeeId }: { employeeId: string }) {
  const { language, dir } = useLanguageStore();
  const theme = useChartTheme();
  const [data, setData] = React.useState<ReportData | null>(null);
  const [error, setError] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    api.get(`/employees/${employeeId}/report`)
      .then((res) => {
        if (!res.success) throw new Error('failed');
        if (active) setData(res.data as ReportData);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [employeeId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100/60 shadow-card" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100/60 shadow-card" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="h-64 animate-pulse rounded-2xl bg-gray-100/60 shadow-card" />
          <div className="h-64 animate-pulse rounded-2xl bg-gray-100/60 shadow-card" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <SearchX className="h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">{t('Report unavailable', 'التقرير غير متاح', language)}</p>
        </div>
      </Card>
    );
  }

  const salaryDonut = [
    { name: 'basic', value: data.salary.basic },
    { name: 'housing', value: data.salary.housing },
    { name: 'transportation', value: data.salary.transportation },
    { name: 'other', value: data.salary.otherAllowances },
  ];

  const byTypeEntries = Object.entries(data.leave.byType);
  const leaveUsedPct = data.leave.annualAllowed > 0
    ? Math.round((data.leave.used / data.leave.annualAllowed) * 100)
    : 0;
  const attendanceColor = data.attendanceRate >= 90 ? theme.ok : data.attendanceRate >= 75 ? theme.warn : theme.err;

  const statCards = [
    {
      icon: UserCheck,
      label: t('Attendance Rate', 'نسبة الحضور', language),
      value: data.attendanceRate > 0 ? `${data.attendanceRate}%` : '—',
      sub: t('last 3 months', 'آخر ٣ أشهر', language),
      accent: 'text-success',
    },
    {
      icon: CalendarDays,
      label: t('Remaining Leave', 'الإجازة المتبقية', language),
      value: `${data.leave.remaining} ${t('days', 'يوم', language)}`,
      sub: `${data.leave.used} ${t('of', 'من', language)} ${data.leave.annualAllowed} ${t('used', 'مستخدمة', language)}`,
      accent: 'text-info',
    },
    {
      icon: Wallet,
      label: t('Last Net Pay', 'آخر صافي راتب', language),
      value: data.payroll.latest ? formatCurrency(data.payroll.latest.net) : '—',
      sub: data.payroll.latest ? `${data.payroll.latest.period}` : '',
      accent: 'text-info',
    },
    {
      icon: PiggyBank,
      label: t('Avg. Net (6m)', 'متوسط صافي (٦ش)', language),
      value: data.payroll.average ? formatCurrency(data.payroll.average) : '—',
      sub: `${data.payroll.count} ${t('payrolls', 'رواتب', language)}`,
      accent: 'text-amber-600',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Panel
          icon={Activity}
          title={t('Attendance Trend', 'اتجاه الحضور', language)}
          sub={t('Present vs late vs absent', 'حاضر مقابل متأخر مقابل غائب', language)}
          right={
            <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success">
              {data.attendanceRate}% {t('overall', 'إجمالي', language)}
            </span>
          }
        >
          <Chart
            type="area"
            height={190}
            showLegend
            colors={[theme.ok, theme.warn, theme.err]}
            fillOpacity={0.25}
            series={[
              { name: t('Present', 'حاضر', language), data: data.attendanceTrend.map((m) => m.present) },
              { name: t('Late', 'متأخر', language), data: data.attendanceTrend.map((m) => m.late) },
              { name: t('Absent', 'غائب', language), data: data.attendanceTrend.map((m) => m.absent) },
            ]}
            categories={data.attendanceTrend.map((m) => MONTH_LABEL(m.label, language))}
            dir={dir}
            locale={language}
          />
        </Panel>

        <Panel
          icon={Timer}
          title={t('Attendance Score', 'مؤشر الحضور', language)}
          sub={t('Presence across recorded days', 'الحضور خلال الأيام المسجلة', language)}
        >
          <div className="flex items-center justify-center py-1">
            <Chart
              type="radialBar"
              height={190}
              series={[data.attendanceRate]}
              labels={[t('Attendance', 'الحضور', language)]}
              colors={[attendanceColor]}
              showDataLabels={false}
              showLegend={false}
            />
          </div>
        </Panel>

        <Panel
          icon={CalendarDays}
          title={t('Leave Utilization', 'استهلاك الإجازات', language)}
          sub={t('Used vs remaining days', 'الأيام المستخدمة مقابل المتبقية', language)}
        >
          <div className="flex items-center justify-center py-1">
            <Chart
              type="donut"
              height={190}
              series={[data.leave.used, data.leave.remaining]}
              labels={[
                `${t('Used', 'مستهلك', language)} ${data.leave.used}d`,
                `${t('Left', 'متبقي', language)} ${data.leave.remaining}d`,
              ]}
              colors={[theme.info, theme.line]}
              donutSize="72%"
              showLegend
              locale={language}
              dir={dir}
            />
          </div>
          {byTypeEntries.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {byTypeEntries.map(([type, days]) => (
                <span key={type} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                  {getLeaveLabel(type, language)}: {days}d
                </span>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          icon={Coins}
          title={t('Salary Composition', 'مكونات الراتب', language)}
          sub={t('Monthly breakdown', 'التحليل الشهري', language)}
          right={
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">{formatCurrency(data.salary.total)}</p>
              <p className="text-[10px] text-gray-400">{t('Total', 'إجمالي', language)}</p>
            </div>
          }
        >
          <div className="flex items-center justify-center py-1">
            <Chart
              type="donut"
              height={190}
              series={salaryDonut.map((s) => s.value)}
              labels={[
                t('Basic', 'أساسي', language),
                t('Housing', 'سكن', language),
                t('Transport', 'نقل', language),
                t('Other', 'أخرى', language),
              ]}
              colors={[theme.brand, theme.ok, theme.warn, theme.accent]}
              donutSize="70%"
              showLegend
              locale={language}
              dir={dir}
            />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          icon={FileWarning}
          label={t('Pending Requests', 'طلبات معلقة', language)}
          value={String(data.leave.pending)}
          sub={t('Leaves', 'إجازات', language)}
        />
        <StatCard
          icon={Landmark}
          label={t('Total Requests', 'إجمالي الطلبات', language)}
          value={String(data.leave.totalRequests)}
          sub={`${leaveUsedPct}% ${t('used', 'مستخدم', language)}`}
        />
      </div>
    </div>
  );
}

function getLeaveLabel(type: string, locale: 'en' | 'ar'): string {
  const map: Record<string, Record<string, string>> = {
    en: {
      annual: 'Annual', sick: 'Sick', personal: 'Personal', emergency: 'Emergency',
      maternity: 'Maternity', paternity: 'Paternity', hajj: 'Hajj', unpaid: 'Unpaid',
    },
    ar: {
      annual: 'سنوية', sick: 'مرضية', personal: 'شخصية', emergency: 'طارئة',
      maternity: 'أمومة', paternity: 'أبوة', hajj: 'حج', unpaid: 'بدون راتب',
    },
  };
  return map[locale]?.[type] || type;
}