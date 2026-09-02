'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { Card } from '@/components/ui/Card';
import {
  CalendarDays, Wallet, SearchX, Activity, UserCheck, Timer, PiggyBank, Coins, Landmark, TrendingUp, Medal,
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
  payTrend: { period: string; gross: number; net: number; gosi: number }[];
  gosi: { isSaudi: boolean; applicableWage: number; employeeShare: number; employerShare: number; total: number };
  tenureMonths: number;
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
    <section className="rounded-md bg-white shadow-card">
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

function StatCard({ icon: Icon, label, value, sub, chip }: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  chip?: string;
}) {
  return (
    <div className="rounded-md bg-white p-4 shadow-card">
      <div className="flex items-center gap-2.5">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${chip || 'bg-primary/10 text-primary'}`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
      </div>
      <p className="mt-2 text-xl font-bold tracking-tight text-gray-900">{value}</p>
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-md bg-gray-100/60 shadow-card" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-md bg-gray-100/60 shadow-card" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="h-64 animate-pulse rounded-md bg-gray-100/60 shadow-card" />
          <div className="h-64 animate-pulse rounded-md bg-gray-100/60 shadow-card" />
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
  const tenureYears = Math.floor(data.tenureMonths / 12);
  const tenureRem = data.tenureMonths % 12;
  const tenureLabel = tenureYears > 0
    ? `${tenureYears}${t('y', 'س', language)} ${tenureRem}${t('m', 'ش', language)}`
    : `${data.tenureMonths} ${t('months', 'شهر', language)}`;
  const gosiPct = data.gosi.applicableWage > 0 ? Math.round((data.gosi.total / data.gosi.applicableWage) * 1000) / 10 : 0;

  const statCards = [
    {
      icon: UserCheck,
      label: t('Attendance Rate', 'نسبة الحضور', language),
      value: data.attendanceRate > 0 ? `${data.attendanceRate}%` : '—',
      sub: t('last 3 months', 'آخر ٣ أشهر', language),
      chip: 'bg-success/10 text-success',
    },
    {
      icon: Medal,
      label: t('Tenure', 'مدة الخدمة', language),
      value: tenureLabel,
      sub: t('since hire date', 'منذ التعيين', language),
      chip: 'bg-secondary/10 text-secondary',
    },
    {
      icon: CalendarDays,
      label: t('Remaining Leave', 'الإجازة المتبقية', language),
      value: `${data.leave.remaining} ${t('days', 'يوم', language)}`,
      sub: `${data.leave.used} ${t('of', 'من', language)} ${data.leave.annualAllowed} ${t('used', 'مستخدمة', language)}`,
      chip: 'bg-info/10 text-info',
    },
    {
      icon: Wallet,
      label: t('Last Net Pay', 'آخر صافي راتب', language),
      value: data.payroll.latest ? formatCurrency(data.payroll.latest.net) : '—',
      sub: data.payroll.latest ? `${data.payroll.latest.period}` : '',
      chip: 'bg-primary/10 text-primary',
    },
    {
      icon: PiggyBank,
      label: t('Avg. Net (6m)', 'متوسط صافي (٦ش)', language),
      value: data.payroll.average ? formatCurrency(data.payroll.average) : '—',
      sub: `${data.payroll.count} ${t('payrolls', 'رواتب', language)}`,
      chip: 'bg-warning/10 text-warning',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {statCards.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Pay trend — full width */}
      {data.payTrend.length > 1 && (
        <Panel
          icon={TrendingUp}
          title={t('Pay History', 'سجل الرواتب', language)}
          sub={t('Gross vs net per processed period', 'الإجمالي مقابل الصافي لكل فترة', language)}
          right={
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              {data.payTrend.length} {t('periods', 'فترات', language)}
            </span>
          }
        >
          <Chart
            type="bar"
            height={230}
            colors={[theme.brand, theme.ok]}
            series={[
              { name: t('Gross', 'إجمالي', language), data: data.payTrend.map((p) => p.gross) },
              { name: t('Net', 'صافي', language), data: data.payTrend.map((p) => p.net) },
            ]}
            categories={data.payTrend.map((p) => MONTH_LABEL(p.period, language))}
            dir={dir}
            locale={language}
          />
        </Panel>
      )}

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
            <div className="text-end">
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

      {/* GOSI + request stats */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel
          icon={Landmark}
          title={t('GOSI Contributions', 'اشتراكات التأمينات', language)}
          sub={t(
            data.gosi.isSaudi ? 'Saudi rates incl. SANED' : 'Non-Saudi rates (excl. SANED)',
            data.gosi.isSaudi ? 'نسب السعوديين شاملة ساند' : 'نسب غير السعوديين (بدون ساند)',
            language
          )}
          right={
            <span className="rounded-full bg-secondary/10 px-2.5 py-0.5 text-[11px] font-semibold text-secondary">
              {gosiPct}% {t('of wage', 'من الأجر', language)}
            </span>
          }
        >
          <div className="space-y-3">
            {[
              { label: t('Employee share', 'حصة الموظف', language), value: data.gosi.employeeShare, hex: theme.err },
              { label: t('Employer share', 'حصة صاحب العمل', language), value: data.gosi.employerShare, hex: theme.info },
            ].map((row) => {
              const pct = data.gosi.total > 0 ? Math.round((row.value / data.gosi.total) * 100) : 0;
              return (
                <div key={row.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-gray-600">{row.label}</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(row.value)}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: row.hex }} />
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2.5">
              <span className="text-sm font-medium text-gray-600">{t('Total monthly', 'الإجمالي الشهري', language)}</span>
              <span className="text-sm font-bold text-gray-900">{formatCurrency(data.gosi.total)}</span>
            </div>
          </div>
        </Panel>

        <StatCard
          icon={CalendarDays}
          label={t('Pending Requests', 'طلبات معلقة', language)}
          value={String(data.leave.pending)}
          sub={t('Leaves awaiting decision', 'إجازات بانتظار القرار', language)}
          chip="bg-warning/10 text-warning"
        />
        <StatCard
          icon={Activity}
          label={t('Total Requests', 'إجمالي الطلبات', language)}
          value={String(data.leave.totalRequests)}
          sub={`${leaveUsedPct}% ${t('of annual leave used', 'من الإجازة السنوية مستخدم', language)}`}
          chip="bg-info/10 text-info"
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
