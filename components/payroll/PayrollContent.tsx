'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguageStore } from '@/stores/language-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { payrollService, TimesheetUploadResult } from '@/modules/payroll/service';
import { ModuleSettingsMenu } from '@/components/module-settings/ModuleSettingsMenu';
import { useAuthStore } from '@/stores/auth-store';
import { hasPermission } from '@/lib/rbac';
import { Payroll } from '@/types';
import { t, formatCurrency, formatDate } from '@/lib/utils';
import { Wallet, Play, Download, Eye, FileSpreadsheet, Upload, ClipboardList, AlertCircle, FilePlus2 } from 'lucide-react';
import { TimesheetCreateDialog } from '@/components/payroll/TimesheetCreateDialog';
import { Badge } from '@/components/ui/Badge';
import { getStoredToken } from '@/lib/client-token';

export function PayrollContent() {
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const canManage = hasPermission(user?.role, 'payroll:manage');
  const { addToast } = useToast();
  const [records, setRecords] = React.useState<Payroll[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [processing, setProcessing] = React.useState(false);
  const [period, setPeriod] = React.useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [tsExpanded, setTsExpanded] = React.useState(false);
  const [tsFile, setTsFile] = React.useState<File | null>(null);
  const [tsPeriod, setTsPeriod] = React.useState(period);
  const [otMultiplier, setOtMultiplier] = React.useState(1.5);
  const [dailyRateMode, setDailyRateMode] = React.useState<'auto' | 'custom'>('auto');
  const [customDailyRate, setCustomDailyRate] = React.useState('');
  const [customOtRate, setCustomOtRate] = React.useState('');
  const [tsPreview, setTsPreview] = React.useState<TimesheetUploadResult | null>(null);
  const [tsUploading, setTsUploading] = React.useState(false);
  const [tsApplying, setTsApplying] = React.useState(false);
  const [tsCreateOpen, setTsCreateOpen] = React.useState(false);
  const tsFileRef = React.useRef<HTMLInputElement>(null);

  const loadRecords = React.useCallback(async () => {
    setLoading(true);
    const res = await payrollService.list({});
    if (res.success && res.data) {
      setRecords(res.data.data);
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to load payroll', 'فشل تحميل الرواتب', language) });
    }
    setLoading(false);
  }, [addToast, language]);

  React.useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleProcess = async () => {
    if (!period) return;
    setProcessing(true);
    const res = await payrollService.process(period);
    if (res.success && res.data) {
      const result = res.data;
      addToast({
        type: 'success',
        title: result.count > 0
          ? t(`Payroll processed for ${result.count} employees`, `تمت معالجة رواتب ${result.count} موظف`, language)
          : t('No employees to process', 'لا يوجد موظفون للمعالجة', language),
      });
      loadRecords();
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to process payroll', 'فشل معالجة الرواتب', language) });
    }
    setProcessing(false);
  };

  const totalNet = records.reduce((sum, r) => sum + r.netPay, 0);
  const totalGosi = records.reduce((sum, r) => sum + r.gosiContribution, 0);

  const downloadTimesheetTemplate = async () => {
    try {
      const token = getStoredToken();
      const res = await fetch(payrollService.getTimesheetTemplateUrl(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'timesheet-template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast({ type: 'success', title: t('Timesheet template downloaded', 'تم تحميل قالب جدول العمل', language) });
    } catch {
      addToast({ type: 'error', title: t('Failed to download template', 'فشل تحميل القالب', language) });
    }
  };

  const handleTimesheetFile = async (f: File | null) => {
    setTsFile(f);
    setTsPreview(null);
    if (!f) return;
    setTsUploading(true);
    const res = await payrollService.uploadTimesheet(f, tsPeriod, {
      otMultiplier,
      dailyRateMode,
      customDailyRate: customDailyRate ? Number(customDailyRate) : undefined,
      customOtRate: customOtRate ? Number(customOtRate) : undefined,
    });
    if (res.success && res.data) {
      setTsPreview(res.data);
      addToast({
        type: 'success',
        title: t(`Parsed ${res.data.summaries.length} employee(s) from timesheet`, `تم تحليل جداول ${res.data.summaries.length} موظف`, language),
      });
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to read timesheet', 'فشل قراءة جدول العمل', language) });
    }
    setTsUploading(false);
  };

  const handleApplyTimesheet = async () => {
    if (!tsPreview || tsPreview.summaries.length === 0) return;
    setTsApplying(true);
    const res = await payrollService.applyTimesheet(
      tsPeriod,
      {
        otMultiplier,
        dailyRateMode,
        customDailyRate: customDailyRate ? Number(customDailyRate) : undefined,
        customOtRate: customOtRate ? Number(customOtRate) : undefined,
      },
      tsPreview.rows
    );
    if (res.success && res.data) {
      const errors = res.data.errors.filter((e) => e.toLowerCase().includes('already'));
      addToast({
        type: res.data.count > 0 ? 'success' : 'info',
        title: t(
          `Payroll created for ${res.data.count} employee(s) from timesheet`,
          `تم إنشاء رواتب ${res.data.count} موظف من جدول العمل`,
          language
        ),
      });
      if (errors.length > 0) {
        addToast({
          type: 'info',
          title: t(`${errors.length} employee(s) already processed for this period`, `تمت معالجة ${errors.length} موظف مسبقاً لهذه الفترة`, language),
        });
      }
      setTsPreview(null);
      setTsFile(null);
      if (tsFileRef.current) tsFileRef.current.value = '';
      loadRecords();
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to apply timesheet', 'فشل تطبيق جدول العمل', language) });
    }
    setTsApplying(false);
  };
  const periods = Array.from(new Set(records.map((r) => r.period))).sort().reverse();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {t('Payroll Overview', 'نظرة عامة على الرواتب', language)}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('Process payroll and review monthly records', 'معالجة الرواتب ومراجعة السجلات الشهرية', language)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-md border-0 bg-gray-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
          />
          {canManage && (
            <>
              <Button onClick={handleProcess} loading={processing} title={t('Process Payroll', 'معالجة الرواتب', language)} aria-label={t('Process Payroll', 'معالجة الرواتب', language)}>
                <Play className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                title={t('Export', 'تصدير', language)}
                aria-label={t('Export', 'تصدير', language)}
                onClick={async () => {
                  const token = getStoredToken();
                  const res = await fetch(`/api/payroll/export?period=${encodeURIComponent(period || 'all')}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  if (!res.ok) return;
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `payroll-${period || 'all'}.xlsx`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
            </>
          )}
          <ModuleSettingsMenu module={t('Payroll', 'الرواتب', language)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-xs text-gray-500">{t('Records', 'السجلات', language)}</div>
                <div className="text-xl font-bold text-gray-900">{records.length}</div>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-xs text-gray-500">{t('Net Pay Total', 'إجمالي صافي الرواتب', language)}</div>
            <div className="text-xl font-bold text-gray-900">{formatCurrency(totalNet)}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-xs text-gray-500">{t('GOSI Total', 'إجمالي التأمينات', language)}</div>
            <div className="text-xl font-bold text-gray-900">{formatCurrency(totalGosi)}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-xs text-gray-500">{t('Processed Periods', 'الفترات المعالجة', language)}</div>
            <div className="text-xl font-bold text-gray-900">{periods.length}</div>
          </CardBody>
        </Card>
      </div>

      {canManage && (
      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ClipboardList className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">
                {t('Timesheet & Adjustments', 'جدول العمل والتعديلات', language)}
              </h2>
              <p className="text-xs text-gray-500 truncate">
                {t('Upload a timesheet to pay by days worked and overtime hours', 'ارفع جدول عمل للدفع حسب أيام العمل وساعات الإضافي', language)}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setTsCreateOpen(true)}>
              <FilePlus2 className="h-4 w-4" />
              {t('New Timesheet', 'جدول عمل جديد', language)}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setTsExpanded(!tsExpanded)}>
              {tsExpanded ? t('Hide options', 'إخفاء الخيارات', language) : t('Options', 'خيارات', language)}
            </Button>
          </div>
        </CardHeader>
        {tsExpanded && (
          <CardBody className="p-4 sm:p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  {t('Payroll Period', 'فترة الرواتب', language)}
                </label>
                <input
                  type="month"
                  value={tsPeriod}
                  onChange={(e) => setTsPeriod(e.target.value)}
                  className="w-full rounded-md border-0 bg-gray-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  {t('Overtime Multiplier', 'مضاعف ساعات الإضافي', language)}
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={otMultiplier}
                  onChange={(e) => setOtMultiplier(Number(e.target.value) || 1.5)}
                  className="w-full rounded-md border-0 bg-gray-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {t('OT rate = (daily salary / 8h) × multiplier', 'سعر الإضافي = (الراتب اليومي / 8 ساعات) × المضاعف', language)}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  {t('Daily Rate Source', 'مصدر الراتب اليومي', language)}
                </label>
                <select
                  value={dailyRateMode}
                  onChange={(e) => setDailyRateMode(e.target.value as 'auto' | 'custom')}
                  className="w-full rounded-md border-0 bg-gray-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                >
                  <option value="auto">{t('Auto (monthly salary / 30)', 'تلقائي (الراتب الشهري / 30)', language)}</option>
                  <option value="custom">{t('Custom rate for all employees', 'سعر مخصص لجميع الموظفين', language)}</option>
                </select>
              </div>
              {dailyRateMode === 'custom' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    {t('Custom Daily Rate (﷼)', 'الراتب اليومي المخصص (ريال)', language)}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={customDailyRate}
                    onChange={(e) => setCustomDailyRate(e.target.value)}
                    className="w-full rounded-md border-0 bg-gray-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  {t('Custom OT Rate (﷼/hr, optional)', 'سعر الإضافي المخصص (ريال/ساعة، اختياري)', language)}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={customOtRate}
                  onChange={(e) => setCustomOtRate(e.target.value)}
                  className="w-full rounded-md border-0 bg-gray-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button variant="outline" onClick={() => setTsCreateOpen(true)} title={t('Create Timesheet', 'إنشاء جدول العمل', language)} aria-label={t('Create Timesheet', 'إنشاء جدول العمل', language)}>
                  <FilePlus2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={downloadTimesheetTemplate} title={t('Template', 'القالب', language)} aria-label={t('Template', 'القالب', language)}>
                  <FileSpreadsheet className="h-4 w-4" />
                </Button>
                <input
                  ref={tsFileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => handleTimesheetFile(e.target.files?.[0] || null)}
                />
                <Button variant="outline" onClick={() => tsFileRef.current?.click()} disabled={tsUploading} title={tsUploading ? t('Reading...', 'جارٍ القراءة...', language) : tsFile ? tsFile.name : t('Upload Timesheet', 'رفع جدول العمل', language)} aria-label={tsUploading ? t('Reading...', 'جارٍ القراءة...', language) : tsFile ? tsFile.name : t('Upload Timesheet', 'رفع جدول العمل', language)}>
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {tsPreview && tsPreview.summaries.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">{t('Employees', 'الموظفون', language)}</div>
                    <div className="text-lg font-bold text-gray-900">{tsPreview.summaries.length}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">{t('Days Worked', 'أيام العمل', language)}</div>
                    <div className="text-lg font-bold text-gray-900">{tsPreview.totals.daysWorked}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">{t('OT Hours', 'ساعات الإضافي', language)}</div>
                    <div className="text-lg font-bold text-gray-900">{tsPreview.totals.otHours.toFixed(1)}</div>
                  </div>
                  <div className="rounded-xl bg-primary/5 p-3">
                    <div className="text-xs text-gray-500">{t('Gross Pay', 'إجمالي الرواتب', language)}</div>
                    <div className="text-lg font-bold text-gray-900">{formatCurrency(tsPreview.totals.grossPay)}</div>
                  </div>
                </div>

                <div className="max-h-72 overflow-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Employee', 'الموظف', language)}</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Days', 'أيام', language)}</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Daily Rate', 'الراتب اليومي', language)}</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Base Pay', 'الراتب الأساسي', language)}</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('OT Hrs', 'س. إضافي', language)}</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('OT Rate', 'سعر الإضافي', language)}</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('OT Pay', 'دفع الإضافي', language)}</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Gross', 'الإجمالي', language)}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {tsPreview.summaries.map((s) => (
                        <tr key={s.employeeId} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-gray-900">{s.employeeDisplayId}</p>
                            <p className="text-xs text-gray-500">{s.fullName}</p>
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{s.daysWorked}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{formatCurrency(s.dailyRate)}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-900">{formatCurrency(s.basePay)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{s.otHours.toFixed(1)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{formatCurrency(s.otRate)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{formatCurrency(s.otPay)}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{formatCurrency(s.grossPay)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {tsPreview.errors.length > 0 && (
                  <div className="rounded-xl border border-warning/20 bg-warning/5 p-3 text-sm">
                    <p className="flex items-center gap-1.5 font-medium text-warning mb-1">
                      <AlertCircle className="h-4 w-4" />
                      {t('Warnings', 'تحذيرات', language)}
                    </p>
                    <ul className="space-y-0.5 text-gray-600">
                      {tsPreview.errors.slice(0, 6).map((e, i) => (
                        <li key={i} className="truncate">{e}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3">
                  <Button
                    onClick={handleApplyTimesheet}
                    loading={tsApplying}
                    disabled={tsPreview.summaries.length === 0}
                    title={t('Apply to Payroll', 'تطبيق على الرواتب', language)} aria-label={t('Apply to Payroll', 'تطبيق على الرواتب', language)}>
                  <ClipboardList className="h-4 w-4" />
                </Button>
                </div>
              </div>
            )}
          </CardBody>
        )}
      </Card>
      )}

      <Card>
        <CardHeader className="flex items-center gap-3">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">
            {t('Payroll Records', 'سجلات الرواتب', language)}
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-6">
              <TableSkeleton rows={5} cols={6} />
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              {t('No payroll records yet. Process a period to generate payslips.', 'لا توجد سجلات رواتب بعد. قم بمعالجة فترة لتوليد قسائم الرواتب.', language)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Employee', 'الموظف', language)}
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Period', 'الفترة', language)}
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Net Pay', 'صافي الراتب', language)}
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('GOSI', 'التأمينات', language)}
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Status', 'الحالة', language)}
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Processed At', 'تاريخ المعالجة', language)}
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Payslip', 'قسيمة الراتب', language)}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{r.employeeDisplayId || r.employeeId}</p>
                        {r.employeeName && <p className="text-xs text-gray-500">{r.employeeName}</p>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{r.period}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">{formatCurrency(r.netPay)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-right">{formatCurrency(r.gosiContribution)}</td>
                      <td className="px-6 py-4"><Badge status={r.status} locale={language} /></td>
                      <td className="px-6 py-4 text-sm text-gray-500">{r.processedAt ? formatDate(r.processedAt, language) : '--'}</td>
                      <td className="px-6 py-4 text-right">
                        <a
                          href={payrollService.getPayslipUrl(r.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary-dark transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                          {t('View', 'عرض', language)}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-gray-600">
            {t(
              'Process a payroll period to generate employee records. Manage salaries, GOSI, WPS files and payslips from the sidebar.',
              'قم بمعالجة فترة رواتب لتوليد سجلات الموظفين. إدارة الأجور والتأمينات وملفات WPS وقسائم الرواتب من القائمة الجانبية.',
              language
            )}
          </div>
          <Link href="/payroll/wps" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-dark">
            <Download className="h-4 w-4" />
            {t('Generate WPS File', 'إنشاء ملف WPS', language)}
          </Link>
        </CardBody>
      </Card>
      <TimesheetCreateDialog
        open={tsCreateOpen}
        period={tsPeriod}
        onPeriodChange={setTsPeriod}
        onUpload={(f) => handleTimesheetFile(f)}
        onClose={() => setTsCreateOpen(false)}
      />
    </div>
  );
}
