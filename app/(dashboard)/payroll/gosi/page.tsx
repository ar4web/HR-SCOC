'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { calculateGOSI, GOSI_WAGE_CAP } from '@/lib/payroll-engine';
import { t, formatCurrency } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import { Shield, Calculator, TrendingUp, Users } from 'lucide-react';

export default function GOSIPage() {
  const { language } = useLanguageStore();
  const [wage, setWage] = React.useState(10000);
  const [isSaudi, setIsSaudi] = React.useState(true);

  const result = calculateGOSI(wage, isSaudi);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('GOSI Compliance Calculator', 'حاسبة التوافق مع التأمينات الاجتماعية', language)}
        subtitle={t('Calculate GOSI contribution breakdown and verify compliance with 2024 regulations', 'احسب تفاصيل الاشتراكات التأمينية وتأكد من التوافق مع أنظمة 2024', language)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="flex items-center gap-3">
              <Calculator className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">
                {t('Inputs', 'المدخلات', language)}
              </h2>
            </CardHeader>
            <CardBody className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('Monthly Wage (﷼)', 'الراتب الشهري (ر.س)', language)}
                </label>
                <input
                  type="number"
                  min={0}
                  max={100000}
                  value={wage}
                  onChange={(e) => setWage(Number(e.target.value) || 0)}
                  className="w-full rounded-md border-0 bg-gray-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {t(`Contribution cap is ${GOSI_WAGE_CAP.toLocaleString()} per month`, `سقف الاشتراك ${GOSI_WAGE_CAP.toLocaleString()} ريال شهرياً`, language)}
                </p>
              </div>

              <div>
                <span className="block text-sm font-medium text-gray-700 mb-2">
                  {t('Nationality', 'الجنسية', language)}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setIsSaudi(true)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isSaudi ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                    }`}
                  >
                    {t('Saudi', 'سعودي', language)}
                  </button>
                  <button
                    onClick={() => setIsSaudi(false)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      !isSaudi ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                    }`}
                  >
                    {t('Non-Saudi', 'غير سعودي', language)}
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
                <div className="text-xs text-gray-500 mb-1">
                  {t('Applicable Wage', 'الراتب الخاضع للاشتراك', language)}
                </div>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(result.applicableWage)}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardBody className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-error/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-error" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">{t('Employee Share', 'حصة الموظف', language)}</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatCurrency(result.totalEmployee)}
                  </div>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">{t('Employer Share', 'حصة صاحب العمل', language)}</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatCurrency(result.totalEmployer)}
                  </div>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-accent-800" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">{t('Total Contribution', 'إجمالي الاشتراك', language)}</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatCurrency(result.total)}
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">
                {t('Contribution Breakdown', 'تفاصيل الاشتراكات', language)}
              </h2>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('Insurance Type', 'نوع التأمين', language)}
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('Employee', 'الموظف', language)}
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('Employer', 'صاحب العمل', language)}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {result.rows.map((d) => (
                      <tr key={d.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {t(d.label, d.labelAr, language)}
                          </div>
                          <div className="text-xs text-gray-400">{t(d.note, d.noteAr, language)}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 text-right">
                          {d.employeeShare > 0 ? formatCurrency(d.employeeShare) : '--'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 text-right">
                          {d.employerShare > 0 ? formatCurrency(d.employerShare) : '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-50/50">
                      <td className="px-6 py-3 text-sm font-semibold text-gray-900">
                        {t('Totals', 'الإجمالي', language)}
                      </td>
                      <td className="px-6 py-3 text-sm font-bold text-error text-right">
                        {formatCurrency(result.totalEmployee)}
                      </td>
                      <td className="px-6 py-3 text-sm font-bold text-secondary text-right">
                        {formatCurrency(result.totalEmployer)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardBody>
          </Card>

          <div className="rounded-xl bg-accent/10 border border-accent/20 p-4 text-sm text-gray-700">
            <strong className="font-semibold">{t('Compliance Notes:', 'ملاحظات التوافق:', language)}</strong>
            <ul className="list-disc ml-4 mt-2 space-y-1">
              <li>
                {t(
                  'GOSI contribution is 9% + 9% for the old-age insurance from 2024, with a monthly wage cap of ﷼45,000.',
                  'تبلغ نسبة اشتراك التأمينات 9% + 9% لتأمين الشيخوخة اعتباراً من 2024، مع سقف راتب شهري قدره 45,000 ريال.',
                  language
                )}
              </li>
              <li>
                {t(
                  'Employers must register all employees with GOSI within 7 days of start date.',
                  'يجب على أصحاب العمل تسجيل جميع الموظفين لدى التأمينات خلال 7 أيام من تاريخ بدء العمل.',
                  language
                )}
              </li>
              <li>
                {t(
                  'SANED unemployment insurance applies to Saudi nationals only (0.75% employee + 0.75% employer).',
                  'تطبق اشتراكات ساند للتعطل عن العمل على السعوديين فقط (0.75% للموظف + 0.75% لصاحب العمل).',
                  language
                )}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
