'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Chart } from '@/engines/chart-engine';
import { useChartTheme } from '@/lib/chart-theme';
import type { PayrollAnalytics, PayrollAnalyticsRow } from '@/lib/dashboard-engine';
import { t, formatCurrency } from '@/lib/utils';
import {
  Banknote, Building2, Landmark, PiggyBank, TrendingUp, TrendingDown, Minus,
  Wallet, Users2, Percent, ArrowLeftRight, Crown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  analytics: PayrollAnalytics;
  language: 'en' | 'ar';
  dir: 'ltr' | 'rtl';
}

type Basis = 'gross' | 'net';

const sum = (rows: PayrollAnalyticsRow[], pick: (r: PayrollAnalyticsRow) => number) =>
  rows.reduce((s, r) => s + pick(r), 0);

function monthLabel(period: string, language: 'en' | 'ar', long = false) {
  const [y, m] = period.split('-').map(Number);
  if (!y || !m) return period;
  return new Date(y, m - 1, 1).toLocaleDateString(language === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-GB', {
    month: long ? 'long' : 'short',
    year: 'numeric',
  });
}

function DeltaChip({ current, previous, language }: { current: number; previous: number | null; language: 'en' | 'ar' }) {
  if (previous === null || previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const up = pct > 0.05;
  const down = pct < -0.05;
  const Icon: LucideIcon = up ? TrendingUp : down ? TrendingDown : Minus;
  const cls = up ? 'bg-warning/10 text-warning' : down ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-500';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      <Icon className="h-3 w-3" />
      {`${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`}
      <span className="font-normal opacity-70">{t('vs prev', 'مقابل السابق', language)}</span>
    </span>
  );
}

export function PayrollAnalyticsView({ analytics, language, dir }: Props) {
  const theme = useChartTheme();
  const palette = theme.palette;
  const { periods, rows } = analytics;

  const [period, setPeriod] = React.useState(() => periods[periods.length - 1] || '');
  const [compare, setCompare] = React.useState(() => (periods.length > 1 ? periods[periods.length - 2] : ''));
  const [dept, setDept] = React.useState<string>('all');
  const [basis, setBasis] = React.useState<Basis>('gross');

  const departments = React.useMemo(
    () => Array.from(new Set(rows.map((r) => r.department))).sort(),
    [rows]
  );

  const byDept = React.useCallback(
    (rs: PayrollAnalyticsRow[]) => (dept === 'all' ? rs : rs.filter((r) => r.department === dept)),
    [dept]
  );

  const amountOf = React.useCallback((r: PayrollAnalyticsRow) => (basis === 'gross' ? r.gross : r.net), [basis]);

  const cur = React.useMemo(() => byDept(rows.filter((r) => r.period === period)), [rows, period, byDept]);
  const prev = React.useMemo(
    () => (compare ? byDept(rows.filter((r) => r.period === compare)) : []),
    [rows, compare, byDept]
  );

  if (!periods.length) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Banknote className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-gray-900">{t('No payroll history yet', 'لا يوجد سجل رواتب بعد', language)}</p>
          <p className="max-w-sm text-xs text-gray-500">
            {t('Process a payroll period to unlock comparisons, trends and cost analytics here.', 'قم بمعالجة فترة رواتب لعرض المقارنات والاتجاهات وتحليلات التكلفة هنا.', language)}
          </p>
          <Link href="/payroll" className="mt-1 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15">
            {t('Open Payroll', 'فتح الرواتب', language)}
          </Link>
        </CardBody>
      </Card>
    );
  }

  // ===== KPI values =====
  const curAmount = sum(cur, amountOf);
  const prevAmount = prev.length ? sum(prev, amountOf) : null;
  const curGosi = sum(cur, (r) => r.gosiEmployee + r.gosiEmployer);
  const prevGosi = prev.length ? sum(prev, (r) => r.gosiEmployee + r.gosiEmployer) : null;
  const employerCost = sum(cur, (r) => r.gross + r.gosiEmployer);
  const prevEmployerCost = prev.length ? sum(prev, (r) => r.gross + r.gosiEmployer) : null;
  const avgPay = cur.length ? Math.round(curAmount / cur.length) : 0;
  const prevAvg = prev.length ? Math.round(sum(prev, amountOf) / prev.length) : null;
  const saudiShare = curAmount > 0 ? Math.round((sum(cur.filter((r) => r.isSaudi), amountOf) / curAmount) * 100) : 0;
  const gosiRatio = curAmount > 0 ? Math.round((curGosi / sum(cur, (r) => r.gross)) * 1000) / 10 : 0;
  const netRatio = sum(cur, (r) => r.gross) > 0 ? Math.round((sum(cur, (r) => r.net) / sum(cur, (r) => r.gross)) * 100) : 0;

  // ===== Trend (all periods, dept-filtered) =====
  const trendCats = periods.map((p) => monthLabel(p, language));
  const trendGross = periods.map((p) => sum(byDept(rows.filter((r) => r.period === p)), (r) => r.gross));
  const trendNet = periods.map((p) => sum(byDept(rows.filter((r) => r.period === p)), (r) => r.net));

  // ===== Composition by department (stacked) =====
  const compDepts = dept === 'all' ? departments : [dept];
  const compSeries = [
    { name: t('Basic', 'الأساسي', language), data: compDepts.map((d) => sum(cur.filter((r) => r.department === d), (r) => r.basic)) },
    { name: t('Housing', 'السكن', language), data: compDepts.map((d) => sum(cur.filter((r) => r.department === d), (r) => r.housing)) },
    { name: t('Transport', 'المواصلات', language), data: compDepts.map((d) => sum(cur.filter((r) => r.department === d), (r) => r.transportation)) },
    { name: t('Variable', 'متغير', language), data: compDepts.map((d) => sum(cur.filter((r) => r.department === d), (r) => r.other + r.extras)) },
  ];

  // ===== Period comparison by department (grouped bar) =====
  const compareSeries = [
    { name: monthLabel(period, language), data: compDepts.map((d) => sum(cur.filter((r) => r.department === d), amountOf)) },
    ...(prev.length
      ? [{ name: monthLabel(compare, language), data: compDepts.map((d) => sum(prev.filter((r) => r.department === d), amountOf)) }]
      : []),
  ];

  // ===== Distributions =====
  const deptShare = departments.map((d) => sum(cur.filter((r) => r.department === d), amountOf));
  const natNames = Array.from(new Set(cur.map((r) => r.nationality))).sort();
  const natShare = natNames.map((n) => sum(cur.filter((r) => r.nationality === n), amountOf));

  // ===== GOSI trend (line) =====
  const gosiEmp = periods.map((p) => sum(byDept(rows.filter((r) => r.period === p)), (r) => r.gosiEmployee));
  const gosiEr = periods.map((p) => sum(byDept(rows.filter((r) => r.period === p)), (r) => r.gosiEmployer));

  // ===== Department table + top pay =====
  const deptTable = compDepts.map((d) => {
    const a = sum(cur.filter((r) => r.department === d), amountOf);
    const b = prev.length ? sum(prev.filter((r) => r.department === d), amountOf) : null;
    const gosi = sum(cur.filter((r) => r.department === d), (r) => r.gosiEmployee + r.gosiEmployer);
    return { dept: d, headcount: cur.filter((r) => r.department === d).length, amount: a, prevAmount: b, gosi };
  }).sort((a, b) => b.amount - a.amount);

  const topPay = [...cur].sort((a, b) => amountOf(b) - amountOf(a)).slice(0, 5);

  const kpis: { label: string; value: string; sub: string; icon: LucideIcon; chip: string; current: number; previous: number | null }[] = [
    {
      label: basis === 'gross' ? t('Total Gross Payroll', 'إجمالي الرواتب', language) : t('Total Net Payroll', 'صافي الرواتب', language),
      value: formatCurrency(curAmount),
      sub: `${cur.length} ${t('employees paid', 'موظف مدفوع', language)}`,
      icon: Banknote, chip: 'bg-primary/10 text-primary', current: curAmount, previous: prevAmount,
    },
    {
      label: t('Employer Cost', 'تكلفة صاحب العمل', language),
      value: formatCurrency(employerCost),
      sub: t('gross + employer GOSI', 'الإجمالي + حصة جوسي', language),
      icon: Building2, chip: 'bg-info/10 text-info', current: employerCost, previous: prevEmployerCost,
    },
    {
      label: t('GOSI Contributions', 'اشتراكات التأمينات', language),
      value: formatCurrency(curGosi),
      sub: `${gosiRatio}% ${t('of gross payroll', 'من إجمالي الرواتب', language)}`,
      icon: Landmark, chip: 'bg-secondary/10 text-secondary', current: curGosi, previous: prevGosi,
    },
    {
      label: t('Average per Employee', 'المتوسط لكل موظف', language),
      value: formatCurrency(avgPay),
      sub: basis === 'gross' ? t('gross basis', 'على أساس الإجمالي', language) : t('net basis', 'على أساس الصافي', language),
      icon: Wallet, chip: 'bg-success/10 text-success', current: avgPay, previous: prevAvg,
    },
  ];

  const selectCls = 'rounded-md border-0 bg-gray-100 px-3 py-2 text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40';

  return (
    <div className="space-y-6">
      {/* ===== Filter bar ===== */}
      <Card>
        <CardBody className="flex flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('Period', 'الفترة', language)}</span>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className={selectCls} aria-label={t('Period', 'الفترة', language)}>
              {periods.map((p) => (
                <option key={p} value={p}>{monthLabel(p, language, true)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('Compare with', 'مقارنة مع', language)}</span>
            <select value={compare} onChange={(e) => setCompare(e.target.value)} className={selectCls} aria-label={t('Compare with', 'مقارنة مع', language)}>
              <option value="">{t('None', 'بدون', language)}</option>
              {periods.filter((p) => p !== period).map((p) => (
                <option key={p} value={p}>{monthLabel(p, language, true)}</option>
              ))}
            </select>
          </div>
          <div className="ms-auto flex items-center gap-1 rounded-md bg-gray-100 p-1">
            {(['gross', 'net'] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBasis(b)}
                className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${basis === b ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {b === 'gross' ? t('Gross', 'إجمالي', language) : t('Net', 'صافي', language)}
              </button>
            ))}
          </div>
          <div className="flex w-full flex-wrap items-center gap-1.5 pt-1">
            <button
              onClick={() => setDept('all')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${dept === 'all' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'}`}
            >
              {t('All departments', 'كل الأقسام', language)}
            </button>
            {departments.map((d) => (
              <button
                key={d}
                onClick={() => setDept(d)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${dept === d ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'}`}
              >
                {d}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* ===== KPI row ===== */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="h-full">
              <CardBody className="flex h-full flex-col gap-2 p-4">
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-md ${k.chip}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-[13px] font-medium text-gray-600">{k.label}</p>
                </div>
                <p className="text-xl font-bold text-gray-900">{k.value}</p>
                <div className="mt-auto flex flex-wrap items-center gap-2">
                  <DeltaChip current={k.current} previous={k.previous} language={language} />
                  <span className="text-xs text-gray-400">{k.sub}</span>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* ===== Trend + gauges ===== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between px-5 py-3.5">
            <div>
              <h2 className="text-base font-semibold">{t('Payroll Trend', 'اتجاه الرواتب', language)}</h2>
              <p className="text-xs text-gray-400">
                {dept === 'all' ? t('Gross vs net across processed periods', 'الإجمالي مقابل الصافي عبر الفترات', language) : `${dept} · ${t('gross vs net', 'الإجمالي مقابل الصافي', language)}`}
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
              {periods.length} {t('periods', 'فترات', language)}
            </span>
          </CardHeader>
          <CardBody className="px-4 py-3">
            <Chart
              type="area"
              series={[
                { name: t('Gross', 'إجمالي', language), data: trendGross },
                { name: t('Net', 'صافي', language), data: trendNet },
              ]}
              categories={trendCats}
              height={280}
              colors={[palette[0], palette[1]]}
              dir={dir}
              locale={language}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="px-5 py-3.5">
            <h2 className="text-base font-semibold">{t('Payroll Health', 'مؤشرات الرواتب', language)}</h2>
            <p className="text-xs text-gray-400">{monthLabel(period, language, true)}</p>
          </CardHeader>
          <CardBody className="flex flex-col items-center gap-1 px-4 py-3">
            <Chart
              type="radialBar"
              series={[saudiShare, netRatio]}
              labels={[t('Saudi payroll share', 'حصة رواتب السعوديين', language), t('Net-to-gross', 'الصافي إلى الإجمالي', language)]}
              height={230}
              colors={[palette[1], palette[3]]}
              dir={dir}
              locale={language}
            />
            <div className="grid w-full grid-cols-2 gap-2">
              <div className="rounded-md bg-gray-50 px-3 py-2 text-center">
                <p className="text-lg font-bold text-gray-900">{saudiShare}%</p>
                <p className="text-[11px] text-gray-500">{t('Saudization of payroll', 'سعودة الرواتب', language)}</p>
              </div>
              <div className="rounded-md bg-gray-50 px-3 py-2 text-center">
                <p className="text-lg font-bold text-gray-900">{gosiRatio}%</p>
                <p className="text-[11px] text-gray-500">{t('GOSI burden', 'عبء التأمينات', language)}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* ===== Composition + comparison ===== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="px-5 py-3.5">
            <h2 className="text-base font-semibold">{t('Salary Composition by Department', 'مكونات الرواتب حسب القسم', language)}</h2>
            <p className="text-xs text-gray-400">{t('Basic, housing, transport and variable pay', 'الأساسي والسكن والمواصلات والمتغير', language)} · {monthLabel(period, language)}</p>
          </CardHeader>
          <CardBody className="px-4 py-3">
            <Chart
              type="bar"
              stacked
              series={compSeries}
              categories={compDepts}
              height={280}
              colors={[palette[0], palette[3], palette[2], palette[1]]}
              dir={dir}
              locale={language}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="px-5 py-3.5">
            <h2 className="text-base font-semibold">{t('Period Comparison', 'مقارنة الفترات', language)}</h2>
            <p className="text-xs text-gray-400">
              {prev.length
                ? `${monthLabel(period, language)} ${t('vs', 'مقابل', language)} ${monthLabel(compare, language)} · ${basis === 'gross' ? t('gross', 'إجمالي', language) : t('net', 'صافي', language)}`
                : t('Select a comparison period in the filter bar', 'اختر فترة مقارنة من شريط الفلاتر', language)}
            </p>
          </CardHeader>
          <CardBody className="px-4 py-3">
            <Chart
              type="bar"
              series={compareSeries}
              categories={compDepts}
              height={280}
              colors={[palette[0], palette[2]]}
              dir={dir}
              locale={language}
            />
          </CardBody>
        </Card>
      </div>

      {/* ===== Distributions + GOSI ===== */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="px-5 py-3.5">
            <h2 className="text-base font-semibold">{t('Share by Department', 'الحصة حسب القسم', language)}</h2>
            <p className="text-xs text-gray-400">{monthLabel(period, language)} · {basis === 'gross' ? t('gross', 'إجمالي', language) : t('net', 'صافي', language)}</p>
          </CardHeader>
          <CardBody className="px-4 py-3">
            <Chart type="donut" series={deptShare} labels={departments} height={250} donutSize="68%" dir={dir} locale={language} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="px-5 py-3.5">
            <h2 className="text-base font-semibold">{t('Payroll by Nationality', 'الرواتب حسب الجنسية', language)}</h2>
            <p className="text-xs text-gray-400">{t('Where payroll spend goes', 'توزيع الإنفاق على الرواتب', language)}</p>
          </CardHeader>
          <CardBody className="px-4 py-3">
            <Chart type="pie" series={natShare} labels={natNames} height={250} dir={dir} locale={language} />
          </CardBody>
        </Card>

        <Card className="md:col-span-2 xl:col-span-1">
          <CardHeader className="px-5 py-3.5">
            <h2 className="text-base font-semibold">{t('GOSI Trend', 'اتجاه التأمينات', language)}</h2>
            <p className="text-xs text-gray-400">{t('Employee vs employer share per period', 'حصة الموظف مقابل صاحب العمل', language)}</p>
          </CardHeader>
          <CardBody className="px-4 py-3">
            <Chart
              type="line"
              series={[
                { name: t('Employee share', 'حصة الموظف', language), data: gosiEmp },
                { name: t('Employer share', 'حصة صاحب العمل', language), data: gosiEr },
              ]}
              categories={trendCats}
              height={250}
              colors={[palette[5], palette[3]]}
              dir={dir}
              locale={language}
            />
          </CardBody>
        </Card>
      </div>

      {/* ===== Department table + top pay ===== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between px-5 py-3.5">
            <div>
              <h2 className="text-base font-semibold">{t('Department Cost Breakdown', 'تفصيل تكلفة الأقسام', language)}</h2>
              <p className="text-xs text-gray-400">{t('Headcount, payroll, GOSI and change vs comparison period', 'العدد والرواتب والتأمينات والتغير مقابل فترة المقارنة', language)}</p>
            </div>
            <Link href="/payroll" className="text-xs font-medium text-primary hover:underline">
              {t('Open Payroll', 'فتح الرواتب', language)} →
            </Link>
          </CardHeader>
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-start text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-2.5 text-start">{t('Department', 'القسم', language)}</th>
                  <th className="px-3 py-2.5 text-start">{t('Headcount', 'العدد', language)}</th>
                  <th className="px-3 py-2.5 text-start">{basis === 'gross' ? t('Gross', 'إجمالي', language) : t('Net', 'صافي', language)}</th>
                  <th className="px-3 py-2.5 text-start">{t('GOSI', 'التأمينات', language)}</th>
                  <th className="px-5 py-2.5 text-start">{t('Change', 'التغير', language)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/60">
                {deptTable.map((r) => {
                  const pct = r.prevAmount && r.prevAmount > 0 ? ((r.amount - r.prevAmount) / r.prevAmount) * 100 : null;
                  return (
                    <tr key={r.dept} className="transition-colors hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">{r.dept}</td>
                      <td className="px-3 py-3 text-gray-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Users2 className="h-3.5 w-3.5 text-gray-300" />{r.headcount}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-semibold text-gray-900">{formatCurrency(r.amount)}</td>
                      <td className="px-3 py-3 text-gray-600">{formatCurrency(r.gosi)}</td>
                      <td className="px-5 py-3">
                        {pct === null ? (
                          <span className="text-xs text-gray-300">—</span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${pct > 0.05 ? 'bg-warning/10 text-warning' : pct < -0.05 ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-500'}`}>
                            {pct > 0.05 ? <TrendingUp className="h-3 w-3" /> : pct < -0.05 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                            {`${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center gap-2.5 px-5 py-3.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10 text-accent">
              <Crown className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold">{t('Top Pay', 'أعلى الرواتب', language)}</h2>
              <p className="text-xs text-gray-400">{monthLabel(period, language, true)}</p>
            </div>
          </CardHeader>
          <CardBody className="px-3 py-2">
            <div className="divide-y divide-gray-100/60">
              {topPay.map((r, i) => (
                <div key={r.employeeId} className="flex items-center gap-3 px-2 py-2.5">
                  <span className="w-4 shrink-0 text-center text-xs font-bold text-gray-300">{i + 1}</span>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    {r.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{language === 'ar' ? r.nameAr : r.name}</p>
                    <p className="text-[11px] text-gray-400">{r.department}</p>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(amountOf(r))}</p>
                    <p className="text-[10px] text-gray-400">
                      <Percent className="me-0.5 inline h-2.5 w-2.5" />
                      {curAmount ? ((amountOf(r) / curAmount) * 100).toFixed(1) : 0}% {t('of total', 'من الإجمالي', language)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-1 flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2">
              <PiggyBank className="h-4 w-4 shrink-0 text-gray-400" />
              <p className="text-[11px] leading-snug text-gray-500">
                {t('GOSI computed on fixed wage up to the SAR 45,000 cap. SANED applies to Saudi nationals only.', 'تُحتسب التأمينات على الأجر الثابت حتى سقف 45,000 ريال. ساند للسعوديين فقط.', language)}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
