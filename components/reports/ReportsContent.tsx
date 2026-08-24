'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DashboardTile } from '@/components/ui/DashboardTile';
import { reportsService, DashboardStats } from '@/modules/reports/service';
import { ModuleSettingsMenu } from '@/components/module-settings/ModuleSettingsMenu';
import { employeeService } from '@/modules/employee-management/service';
import { Employee } from '@/types';
import { t, formatCurrency, getContractTypeLabel, getStatusLabel } from '@/lib/utils';
import {
  Users, UserCheck, CalendarClock, Wallet, BarChart3, Download, Filter,
  PieChart, Briefcase, FileText, TrendingUp, Globe, Building2, Clock,
  CalendarRange,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Chart } from '@/engines/chart-engine';
import { useChartTheme, statusHexMap, leafHexMap } from '@/lib/chart-theme';

interface FilteredStats {
  total: number;
  active: number;
  pendingLeaves: number;
  totalPayroll: number;
  avgSalary: number;
  departments: { name: string; count: number; payroll: number }[];
  contracts: { name: string; count: number }[];
  statuses: { name: string; count: number }[];
  nationalities: { name: string; count: number }[];
  sponsors: { name: string; count: number }[];
  genders: { name: string; count: number }[];
}

interface StatCard {
  label: { en: string; ar: string };
  value: string;
  sub: { en: string; ar: string };
  icon: LucideIcon;
  chip: string;
  iconColor: string;
  chipValue?: string;
}

export function ReportsContent() {
  const { language, dir } = useLanguageStore();
  const theme = useChartTheme();
  const COLORS = theme.palette;
  const STATUS_HEX = statusHexMap(theme);
  const LEAF_HEX = leafHexMap(theme);
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [department, setDepartment] = React.useState('all');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [statsRes, empRes] = await Promise.all([
      reportsService.getStats(),
      employeeService.list({ page: 1, pageSize: 1000 }),
    ]);
    if (statsRes.success && statsRes.data) setStats(statsRes.data);
    if (empRes.success && empRes.data) setEmployees(empRes.data.data);
    setLoading(false);
  };

  const departments = Array.from(new Set(employees.map((e) => e.department))).sort();

  const filteredStats: FilteredStats = React.useMemo(() => {
    const list = department === 'all' ? employees : employees.filter((e) => e.department === department);
    const active = list.filter((e) => e.status === 'active').length;
    const totalPayroll = list.reduce(
      (s, e) => s + e.salary.basic + e.salary.housing + e.salary.transportation + e.salary.otherAllowances,
      0
    );

    const deptMap: Record<string, { count: number; payroll: number }> = {};
    const contractMap: Record<string, number> = {};
    const statusMap: Record<string, number> = {};
    const natMap: Record<string, number> = {};
    const sponsorMap: Record<string, number> = {};
    const genderMap: Record<string, number> = {};

    list.forEach((e) => {
      const d = (deptMap[e.department] = deptMap[e.department] || { count: 0, payroll: 0 });
      d.count += 1;
      d.payroll += e.salary.basic + e.salary.housing + e.salary.transportation + e.salary.otherAllowances;
      contractMap[e.contractType] = (contractMap[e.contractType] || 0) + 1;
      statusMap[e.status] = (statusMap[e.status] || 0) + 1;
      const nat = e.nationality && e.nationality.trim() ? e.nationality.trim() : 'Other';
      natMap[nat] = (natMap[nat] || 0) + 1;
      const spo = e.sponsorName && e.sponsorName.trim() ? e.sponsorName.trim() : 'Self-sponsored';
      sponsorMap[spo] = (sponsorMap[spo] || 0) + 1;
      genderMap[e.gender] = (genderMap[e.gender] || 0) + 1;
    });

    return {
      total: list.length,
      active,
      pendingLeaves: stats?.pendingLeaves || 0,
      totalPayroll,
      avgSalary: list.length ? Math.round(totalPayroll / list.length) : 0,
      departments: Object.entries(deptMap).map(([name, v]) => ({ name, count: v.count, payroll: v.payroll })),
      contracts: Object.entries(contractMap).map(([name, count]) => ({ name, count })),
      statuses: Object.entries(statusMap).map(([name, count]) => ({ name, count })),
      nationalities: Object.entries(natMap).map(([name, count]) => ({ name, count })),
      sponsors: Object.entries(sponsorMap).map(([name, count]) => ({ name, count })),
      genders: Object.entries(genderMap).map(([name, count]) => ({ name, count })),
    };
  }, [employees, department, stats]);

  const leaveStatus = stats
    ? [
        { name: 'approved', count: stats.leaveStatus.find((l) => l.name === 'approved')?.count || 0 },
        { name: 'pending', count: stats.leaveStatus.find((l) => l.name === 'pending')?.count || 0 },
        { name: 'rejected', count: stats.leaveStatus.find((l) => l.name === 'rejected')?.count || 0 },
      ]
    : [];

  const leaveTotal = leaveStatus.reduce((s, l) => s + l.count, 0);
  const maxLeave = Math.max(1, ...leaveStatus.map((l) => l.count));

  const activePct = filteredStats.total > 0 ? Math.round((filteredStats.active / filteredStats.total) * 100) : 0;

  const statCards: StatCard[] = [
    {
      label: { en: 'Total Employees', ar: 'إجمالي الموظفين' },
      value: filteredStats.total.toString(),
      sub: { en: 'All headcount', ar: 'إجمالي الموظفين' },
      icon: Users,
      chip: 'bg-secondary/10 text-secondary',
      iconColor: 'bg-secondary/10 text-secondary',
    },
    {
      label: { en: 'Active Employees', ar: 'الموظفون النشطون' },
      value: filteredStats.active.toString(),
      sub: { en: `${activePct}% of headcount`, ar: `${activePct}% من الموظفين` },
      icon: UserCheck,
      chip: 'bg-success/10 text-success',
      iconColor: 'bg-success/10 text-success',
      chipValue: `${activePct}%`,
    },
    {
      label: { en: 'Pending Leaves', ar: 'إجازات قيد الانتظار' },
      value: filteredStats.pendingLeaves.toString(),
      sub: { en: 'Awaiting approval', ar: 'بانتظار الموافقة' },
      icon: CalendarClock,
      chip: 'bg-warning/10 text-warning',
      iconColor: 'bg-warning/10 text-warning',
    },
    {
      label: { en: 'Monthly Payroll', ar: 'الرواتب الشهرية' },
      value: formatCurrency(filteredStats.totalPayroll),
      sub: {
        en: filteredStats.avgSalary > 0 ? `Avg ${formatCurrency(filteredStats.avgSalary)}` : 'Monthly total',
        ar: filteredStats.avgSalary > 0 ? `المتوسط ${formatCurrency(filteredStats.avgSalary)}` : 'الإجمالي الشهري',
      },
      icon: Wallet,
      chip: 'bg-primary/10 text-primary',
      iconColor: 'bg-primary/10 text-primary',
    },
  ];

  const exportCsv = () => {
    const rows: string[][] = [
      [t('Metric', 'المقياس', language), t('Name', 'الاسم', language), t('Count', 'العدد', language), t('Amount', 'المبلغ', language)],
    ];
    filteredStats.departments.forEach((d) =>
      rows.push([t('Department', 'القسم', language), d.name, String(d.count), String(d.payroll)])
    );
    filteredStats.contracts.forEach((c) =>
      rows.push([t('Contract', 'العقد', language), getContractTypeLabel(c.name, language), String(c.count), ''])
    );
    filteredStats.statuses.forEach((s) =>
      rows.push([t('Status', 'الحالة', language), getStatusLabel(s.name, language), String(s.count), ''])
    );

    const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HR_Report_${department === 'all' ? 'All' : department}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i}>
              <CardBody>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16 mt-2" />
              </CardBody>
            </Card>
          ))}
        </div>
        <Card>
          <CardBody>
            <Skeleton className="h-64 w-full" />
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {t('Reports & Analytics', 'التقارير والتحليلات', language)}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('HR analytics and report generation', 'تحليلات الموارد البشرية وإعداد التقارير', language)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="bg-transparent text-sm text-gray-700 focus:outline-none"
              aria-label={t('Filter by department', 'تصفية حسب القسم', language)}
            >
              <option value="all">{t('All Departments', 'كل الأقسام', language)}</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors"
          >
            <Download className="h-4 w-4" />
            {t('Export CSV', 'تصدير CSV', language)}
          </button>
          <ModuleSettingsMenu module={t('Reports', 'التقارير', language)} onExport={exportCsv} />
        </div>
      </div>

      {department !== 'all' && (
        <div className="rounded-xl border border-primary/10 bg-primary/5 p-3 text-sm text-gray-600">
          {t('Showing analytics for department: ', 'عرض التحليلات للقسم: ', language)}
          <strong>{department}</strong>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <DashboardTile
              key={s.label.en}
              icon={Icon}
              label={t(s.label.en, s.label.ar, language)}
              value={s.value}
              sub={t(s.sub.en, s.sub.ar, language)}
              iconClassName={s.iconColor}
              chip={s.chipValue}
              chipClassName={s.chip}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">
                {t('Headcount by Department', 'عدد الموظفين حسب القسم', language)}
              </h2>
              <p className="text-xs text-gray-400">
                {t('Employees per department', 'الموظفون في كل قسم', language)}
              </p>
            </div>
          </CardHeader>
          <CardBody>
            {filteredStats.departments.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">{t('No data available', 'لا توجد بيانات', language)}</p>
            ) : (
              <Chart
                type="bar"
                series={[
                  {
                    name: t('Employees', 'الموظفون', language),
                    data: filteredStats.departments.map((d) => d.count),
                  },
                ]}
                categories={filteredStats.departments.map((d) => d.name)}
                height={280}
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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/10">
              <Wallet className="h-4 w-4 text-secondary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">
                {t('Payroll by Department', 'الرواتب حسب القسم', language)}
              </h2>
              <p className="text-xs text-gray-400">
                {t('Total salary per department', 'إجمالي الرواتب في كل قسم', language)}
              </p>
            </div>
          </CardHeader>
          <CardBody>
            {filteredStats.departments.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">{t('No data available', 'لا توجد بيانات', language)}</p>
            ) : (
              <Chart
                type="bar"
                series={[
                  {
                    name: t('Salary (﷼)', 'الراتب (ر.س)', language),
                    data: filteredStats.departments.map((d) => d.payroll),
                  },
                ]}
                categories={filteredStats.departments.map((d) => d.name)}
                height={280}
                colors={[COLORS[1]]}
                showLegend={false}
                showDataLabels={false}
                dir={dir}
                locale={language}
              />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
              <PieChart className="h-4 w-4 text-success" />
            </div>
            <div>
              <h2 className="text-base font-semibold">
                {t('Employment Status', 'حالة التوظيف', language)}
              </h2>
              <p className="text-xs text-gray-400">
                {t('Breakdown by employment status', 'التوزيع حسب حالة التوظيف', language)}
              </p>
            </div>
          </CardHeader>
          <CardBody className="flex items-center justify-center">
            {filteredStats.statuses.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">{t('No data available', 'لا توجد بيانات', language)}</p>
            ) : (
              <Chart
                type="donut"
                series={filteredStats.statuses.map((s) => s.count)}
                labels={filteredStats.statuses.map((s) => getStatusLabel(s.name, language))}
                height={280}
                width="100%"
                className="w-full"
                colors={filteredStats.statuses.map((s) => STATUS_HEX[s.name] || COLORS[3])}
                donutSize="68%"
                dir={dir}
                locale={language}
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
              <Briefcase className="h-4 w-4 text-accent-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold">
                {t('Contract Types', 'أنواع العقود', language)}
              </h2>
              <p className="text-xs text-gray-400">
                {t('Breakdown by contract type', 'التوزيع حسب نوع العقد', language)}
              </p>
            </div>
          </CardHeader>
          <CardBody className="flex items-center justify-center">
            {filteredStats.contracts.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">{t('No data available', 'لا توجد بيانات', language)}</p>
            ) : (
              <Chart
                type="donut"
                series={filteredStats.contracts.map((c) => c.count)}
                labels={filteredStats.contracts.map((c) => getContractTypeLabel(c.name, language))}
                height={280}
                width="100%"
                className="w-full"
                colors={COLORS}
                donutSize="68%"
                dir={dir}
                locale={language}
              />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Globe className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">
                {t('Nationality Comparison', 'مقارنة الجنسيات', language)}
              </h2>
              <p className="text-xs text-gray-400">
                {t('Employees grouped by nationality', 'الموظفون حسب الجنسية', language)}
              </p>
            </div>
          </CardHeader>
          <CardBody className="flex items-center justify-center">
            {filteredStats.nationalities.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">{t('No data available', 'لا توجد بيانات', language)}</p>
            ) : (
              <Chart
                type="donut"
                series={filteredStats.nationalities.map((n) => n.count)}
                labels={filteredStats.nationalities.map((n) => n.name)}
                height={280}
                width="100%"
                className="w-full"
                colors={COLORS}
                donutSize="68%"
                dir={dir}
                locale={language}
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10">
              <Building2 className="h-4 w-4 text-warning" />
            </div>
            <div>
              <h2 className="text-base font-semibold">
                {t('Sponsor Share', 'حصة الكفيل', language)}
              </h2>
              <p className="text-xs text-gray-400">
                {t('Headcount by sponsor', 'عدد الموظفين حسب الكفيل', language)}
              </p>
            </div>
          </CardHeader>
          <CardBody className="flex items-center justify-center">
            {filteredStats.sponsors.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">{t('No data available', 'لا توجد بيانات', language)}</p>
            ) : (
              <Chart
                type="donut"
                series={filteredStats.sponsors.map((s) => s.count)}
                labels={filteredStats.sponsors.map((s) => s.name)}
                height={280}
                width="100%"
                className="w-full"
                colors={COLORS}
                donutSize="68%"
                dir={dir}
                locale={language}
              />
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/10">
            <FileText className="h-4 w-4 text-info" />
          </div>
          <div>
            <h2 className="text-base font-semibold">
              {t('Leave Requests by Status', 'طلبات الإجازات حسب الحالة', language)}
            </h2>
            <p className="text-xs text-gray-400">
              {t('Distribution across approval statuses', 'التوزيع حسب حالات الموافقة', language)}
            </p>
          </div>
        </CardHeader>
        <CardBody>
          {leaveTotal === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">{t('No data available', 'لا توجد بيانات', language)}</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {leaveStatus.map((l) => {
                const pct = Math.round((l.count / leaveTotal) * 100);
                return (
                  <div key={l.name} className="rounded-2xl bg-gray-50/60 p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {getStatusLabel(l.name, language)}
                      </span>
                      <span className="text-xl font-bold" style={{ color: LEAF_HEX[l.name] }}>
                        {l.count}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                        <span>{pct}%</span>
                        <span>{t('of requests', 'من الطلبات', language)}</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-gray-100">
                        <div
                          className="h-2.5 rounded-full transition-all"
                          style={{ width: `${(l.count / maxLeave) * 100}%`, backgroundColor: LEAF_HEX[l.name] }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {stats && stats.attendanceTrend && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
                <UserCheck className="h-4 w-4 text-success" />
              </div>
              <div>
                <h2 className="text-base font-semibold">
                  {t('Attendance Trend (7 days)', 'اتجاه الحضور (7 أيام)', language)}
                </h2>
                <p className="text-xs text-gray-400">
                  {t('Daily present, late and absent counts', 'عدد الحاضرين والمتأخرين والغائبين يومياً', language)}
                </p>
              </div>
            </CardHeader>
            <CardBody>
              <Chart
                type="bar"
                series={[
                  { name: t('Present', 'حاضر', language), data: stats.attendanceTrend.map((d) => d.present) },
                  { name: t('Late', 'متأخر', language), data: stats.attendanceTrend.map((d) => d.late) },
                  { name: t('Absent', 'غائب', language), data: stats.attendanceTrend.map((d) => d.absent) },
                ]}
                categories={stats.attendanceTrend.map((d) => d.date.slice(8, 10) + '-' + d.date.slice(5, 7))}
                height={280}
                colors={[STATUS_HEX.present, STATUS_HEX.late, STATUS_HEX.absent]}
                dir={dir}
                locale={language}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold">
                  {t('Today at a Glance', 'نظرة اليوم', language)}
                </h2>
                <p className="text-xs text-gray-400">
                  {t('Live attendance snapshot', 'لمحة حية عن الحضور', language)}
                </p>
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'present', label: { en: 'Present', ar: 'حاضر' }, hex: STATUS_HEX.present },
                  { key: 'late', label: { en: 'Late', ar: 'متأخر' }, hex: STATUS_HEX.late },
                  { key: 'absent', label: { en: 'Absent', ar: 'غائب' }, hex: STATUS_HEX.absent },
                  { key: 'half_day', label: { en: 'Half Day', ar: 'نصف يوم' }, hex: STATUS_HEX.half_day },
                ].map((s) => (
                  <div key={s.key} className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">{t(s.label.en, s.label.ar, language)}</p>
                    <p className="text-lg font-bold" style={{ color: s.hex }}>
                      {stats.attendanceToday.counts[s.key] || 0}
                    </p>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="mb-2 text-xs font-semibold text-gray-500">
                  {t('Present now', 'الحاضرون الآن', language)}
                </p>
                {stats.attendanceToday.present.length === 0 ? (
                  <p className="text-sm text-gray-400">{t('No clock-ins recorded yet', 'لا توجد تسجيلات وصول بعد', language)}</p>
                ) : (
                  <div className="space-y-1.5">
                    {stats.attendanceToday.present.slice(0, 5).map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-success" />
                          <span className="text-gray-700">{language === 'ar' ? p.fullNameAr : p.fullName}</span>
                        </span>
                        <span className="text-xs text-gray-400">{p.clockIn}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {stats && stats.payrollByPeriod.length > 0 && (
        <Card>
          <CardHeader className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/10">
              <Wallet className="h-4 w-4 text-secondary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">
                {t('Payroll by Period', 'الرواتب حسب الفترة', language)}
              </h2>
              <p className="text-xs text-gray-400">
                {t('Total net pay processed per period', 'إجمالي صافي الرواتب المعالجة لكل فترة', language)}
              </p>
            </div>
          </CardHeader>
          <CardBody>
            <Chart
              type="bar"
              series={[
                {
                  name: t('Net Pay', 'صافي الراتب', language),
                  data: stats.payrollByPeriod.slice(0, 6).map((p) => Math.round(p.amount)),
                },
              ]}
              categories={stats.payrollByPeriod.slice(0, 6).map((p) => p.period)}
              height={280}
              colors={[COLORS[5]]}
              showDataLabels
              dir={dir}
              locale={language}
            />
          </CardBody>
        </Card>
      )}

      {stats && stats.expenseByCategory.length > 0 && (
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
                {t('Approved spending per expense category', 'المصروفات المعتمدة حسب الفئة', language)}
              </p>
            </div>
          </CardHeader>
          <CardBody className="flex items-center justify-center">
            <Chart
              type="donut"
              series={stats.expenseByCategory.map((c) => c.total)}
              labels={stats.expenseByCategory.map((c) => c.category)}
              height={280}
              donutSize="68%"
              colors={COLORS}
              dir={dir}
              locale={language}
            />
          </CardBody>
        </Card>
      )}

      {stats && stats.leaveBalances.length > 0 && (
        <Card>
          <CardHeader className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/10">
              <CalendarRange className="h-4 w-4 text-info" />
            </div>
            <div>
              <h2 className="text-base font-semibold">
                {t('Leave Balances', 'أرصدة الإجازات', language)}
              </h2>
              <p className="text-xs text-gray-400">
                {t('Annual leave entitlement vs usage per employee', 'رصيد الإجازة السنوية مقابل المستخدم لكل موظف', language)}
              </p>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-left rtl:text-right text-xs text-gray-400">
                    <th className="px-6 py-3 font-medium">{t('Employee', 'الموظف', language)}</th>
                    <th className="px-6 py-3 font-medium">{t('Department', 'القسم', language)}</th>
                    <th className="px-6 py-3 font-medium">{t('Entitlement', 'الرصيد المستحق', language)}</th>
                    <th className="px-6 py-3 font-medium">{t('Used', 'المستخدم', language)}</th>
                    <th className="px-6 py-3 font-medium">{t('Remaining', 'المتبقي', language)}</th>
                    <th className="px-6 py-3 font-medium">{t('Utilisation', 'الاستخدام', language)}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.leaveBalances.slice(0, 12).map((e) => {
                    const usedPct = e.annualVacationDays > 0 ? Math.round((e.usedThisYear / e.annualVacationDays) * 100) : 0;
                    return (
                      <tr key={e.id} className="border-b border-gray-50 last:border-0">
                        <td className="px-6 py-3 text-sm font-medium text-gray-900">
                          {language === 'ar' ? e.fullNameAr : e.fullName}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-500">{e.department}</td>
                        <td className="px-6 py-3 text-sm text-gray-700">{e.annualVacationDays} {t('days', 'أيام', language)}</td>
                        <td className="px-6 py-3 text-sm text-gray-500">{e.usedThisYear}</td>
                        <td className="px-6 py-3 text-sm font-semibold text-success">{e.vacationBalance}</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 rounded-full bg-gray-100">
                              <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.min(100, usedPct)}%` }} />
                            </div>
                            <span className="text-xs text-gray-400">{usedPct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
        <TrendingUp className="h-4 w-4 inline me-1 text-primary" />
        {t(
          'Use the department filter to narrow analytics, or export the current view as CSV for offline analysis.',
          'استخدم فلتر القسم لتضييق التحليلات، أو صدّر العرض الحالي كملف CSV للتحليل خارج النظام.',
          language
        )}
      </div>
    </div>
  );
}