'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { BarChart3, CalendarDays, Wallet, TrendingUp, SearchX } from 'lucide-react';
import { Chart } from '@/engines/chart-engine';
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

export function EmployeeReport({ employeeId }: { employeeId: string }) {
  const { language } = useLanguageStore();
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
      <Card>
        <CardHeader className="flex items-center gap-3 pb-4">
          <div className="h-5 w-5 skeleton-rounded bg-gray-200 animate-pulse rounded" />
          <div className="h-4 w-40 skeleton-rounded bg-gray-200 animate-pulse rounded" />
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="h-24 bg-gray-200 animate-pulse rounded" />
          <div className="h-24 bg-gray-200 animate-pulse rounded" />
          <div className="h-24 bg-gray-200 animate-pulse rounded" />
        </CardBody>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{t('Employee Report', 'تقرير الموظف', language)}</h2>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <SearchX className="h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">{t('Report unavailable', 'التقرير غير متاح', language)}</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  const salaryDonut = [
    { name: 'basic', value: data.salary.basic },
    { name: 'housing', value: data.salary.housing },
    { name: 'transportation', value: data.salary.transportation },
    { name: 'other', value: data.salary.otherAllowances },
  ];

  const stats = [
    {
      icon: TrendingUp,
      label: t('Attendance Rate', 'نسبة الحضور', language),
      value: data.attendanceRate > 0 ? `${data.attendanceRate}%` : '—',
    },
    {
      icon: CalendarDays,
      label: t('Remaining Leave', 'الإجازة المتبقية', language),
      value: `${data.leave.remaining} ${t('days', 'يوم', language)}`,
    },
    {
      icon: Wallet,
      label: t('Last Net Pay', 'آخر صافي راتب', language),
      value: data.payroll.latest ? formatCurrency(data.payroll.latest.net) : '—',
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{t('Employee Report', 'تقرير الموظف', language)}</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border p-3 text-center">
                <s.icon className="h-4 w-4 text-primary mx-auto mb-1" />
                <p className="text-[10px] text-gray-500 leading-tight">{s.label}</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-gray-50 p-2 text-center">
              <p className="text-[10px] text-gray-500">{t('Open Requests', 'طلبات مفتوحة', language)}</p>
              <p className="text-sm font-semibold">{data.leave.pending}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2 text-center">
              <p className="text-[10px] text-gray-500">{t('Avg. Net (6m)', 'متوسط صافي (٦ش)', language)}</p>
              <p className="text-sm font-semibold">{data.payroll.average ? formatCurrency(data.payroll.average) : '—'}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center gap-3 pb-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{t('Attendance Trend', 'اتجاه الحضور', language)}</h3>
        </CardHeader>
        <CardBody>
          <Chart
            type="bar"
            height={200}
            showLegend
            colors={['#10B981', '#F59E0B', '#EF4444', '#3B82F6']}
            series={[
              { name: t('Present', 'حاضر', language), data: data.attendanceTrend.map((m) => m.present) },
              { name: t('Late', 'متأخر', language), data: data.attendanceTrend.map((m) => m.late) },
              { name: t('Absent', 'غائب', language), data: data.attendanceTrend.map((m) => m.absent) },
              { name: t('Half day', 'نصف يوم', language), data: data.attendanceTrend.map((m) => m.half_day) },
            ]}
            categories={data.attendanceTrend.map((m) => m.label)}
            dir={language === 'ar' ? 'rtl' : 'ltr'}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center gap-3 pb-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{t('Leave Utilization', 'استهلاك الإجازات', language)}</h3>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex flex-col items-center">
            <Chart
              type="donut"
              height={190}
              series={[data.leave.used, data.leave.remaining]}
              labels={[`${t('Used', 'مستهلك', language)} ${data.leave.used}d`, `${t('Left', 'متبقي', language)} ${data.leave.remaining}d`]}
              colors={['#3B82F6', '#E5E7EB']}
              donutSize="68%"
              showLegend
            />
          </div>
          {Object.keys(data.leave.byType).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(data.leave.byType).map(([type, days]) => (
                <span key={type} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                  {type}: {days}d
                </span>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center gap-3 pb-2">
          <Wallet className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{t('Salary Composition', 'مكونات الراتب', language)}</h3>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex flex-col items-center">
            <Chart
              type="donut"
              height={190}
              series={salaryDonut.map((s) => s.value)}
              labels={['basic', 'housing', 'transportation', 'other']}
              colors={['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6']}
              donutSize="68%"
              showLegend
            />
          </div>
          <div className="flex justify-between items-center rounded-xl bg-gray-50 p-3">
            <span className="text-sm text-gray-500">{t('Total Monthly', 'إجمالي شهري', language)}</span>
            <span className="text-sm font-bold text-primary">{formatCurrency(data.salary.total)}</span>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}