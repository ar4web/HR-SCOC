'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Payroll } from '@/types';
import { payrollService } from '@/modules/payroll/service';
import { t, formatCurrency, formatDate } from '@/lib/utils';
import { ReceiptText, ExternalLink, Download } from 'lucide-react';

export default function PayslipsPage() {
  const { language } = useLanguageStore();
  const { addToast } = useToast();
  const [records, setRecords] = React.useState<Payroll[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await payrollService.list({});
    if (res.success && res.data) {
      setRecords(res.data.data);
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to load payslips', 'فشل تحميل قسائم الرواتب', language) });
    }
    setLoading(false);
  }, [addToast, language]);

  React.useEffect(() => {
    load();
  }, [load]);

  const periods = Array.from(new Set(records.map((r) => r.period))).sort().reverse();

  const downloadPayslip = async (id: string, filename: string) => {
    try {
      const res = await fetch(payrollService.getPayslipUrl(id));
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast({ type: 'success', title: t('Payslip downloaded', 'تم تحميل قسيمة الراتب', language) });
    } catch {
      addToast({ type: 'error', title: t('Failed to download payslip', 'فشل تحميل قسيمة الراتب', language) });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">
          {t('Employee Payslips', 'قسائم رواتب الموظفين', language)}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {t('View and download payslips for processed payroll periods', 'عرض وتحميل قسائم رواتب الفترات المعالجة', language)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary/10 text-xs font-medium text-primary">
          {periods.length} {t('periods', 'فترات', language)}
        </span>
        <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-success/10 text-xs font-medium text-success">
          {records.length} {t('payslips', 'قسيمة', language)}
        </span>
      </div>

      <Card>
        <CardHeader className="flex items-center gap-3">
          <ReceiptText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">
            {t('Payslip Records', 'سجلات قسائم الرواتب', language)}
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-6">
              <TableSkeleton rows={5} cols={6} />
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              {t('No payslips yet. Process a payroll period to generate them.', 'لا توجد قسائم رواتب بعد. قم بمعالجة فترة رواتب لتوليدها.', language)}
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
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Status', 'الحالة', language)}
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Processed At', 'تاريخ المعالجة', language)}
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Actions', 'الإجراءات', language)}
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
                      <td className="px-6 py-4"><Badge status={r.status} locale={language} /></td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {r.processedAt ? formatDate(r.processedAt, language) : '--'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <a
                            href={payrollService.getPayslipUrl(r.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary-dark transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                            {t('View', 'عرض', language)}
                          </a>
                          <button
                            onClick={() => downloadPayslip(r.id, `Payslip_${r.employeeDisplayId || r.employeeId}_${r.period}.html`)}
                            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                          >
                            <Download className="h-4 w-4" />
                            {t('Download', 'تحميل', language)}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
