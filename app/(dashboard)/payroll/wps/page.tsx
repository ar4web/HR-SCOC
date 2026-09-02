'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { payrollService } from '@/modules/payroll/service';
import { t } from '@/lib/utils';
import { FileText, Download, RefreshCw, Info } from 'lucide-react';

export default function WPSPage() {
  const { language } = useLanguageStore();
  const { addToast } = useToast();
  const [period, setPeriod] = React.useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [content, setContent] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleGenerate = async () => {
    if (!period) return;
    setLoading(true);
    setContent(null);
    const res = await payrollService.getWPS(period);
    if (res.success && res.data != null) {
      setContent(String(res.data));
      addToast({ type: 'success', title: t('WPS file generated', 'تم إنشاء ملف WPS', language) });
    } else {
      addToast({ type: 'error', title: res.error || t('No payroll records for this period. Process payroll first.', 'لا توجد سجلات رواتب لهذه الفترة. قم بمعالجة الرواتب أولاً.', language) });
    }
    setLoading(false);
  };

  const handleDownload = () => {
    if (content === null) return;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WPS_${period}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">
          {t('WPS Salary Files', 'ملفات رواتب WPS', language)}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {t('Generate a SAMA-approved wage protection system file for bank disbursement', 'إنشاء ملف نظام حماية الأجور المعتمد من البنك المركزي للدفع', language)}
        </p>
      </div>

      <Card>
        <CardHeader className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">
            {t('Generate WPS File', 'إنشاء ملف WPS', language)}
          </h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                {t('Payroll Period', 'فترة الرواتب', language)}
              </label>
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="rounded-md border-0 bg-gray-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button onClick={handleGenerate} loading={loading} title={t(content === null ? 'Generate' : 'Regenerate', content === null ? 'إنشاء' : 'إعادة إنشاء', language)} aria-label={t(content === null ? 'Generate' : 'Regenerate', content === null ? 'إنشاء' : 'إعادة إنشاء', language)}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            {content !== null && (
              <Button variant="outline" onClick={handleDownload} title={t('Download', 'تحميل', language)} aria-label={t('Download', 'تحميل', language)}>          <Download className="h-4 w-4" />
        </Button>
        
            )}
          </div>

          <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 text-sm text-gray-600">
            <Info className="h-4 w-4 inline me-1 text-primary" />
            {t(
              'The WPS file uses the SAMA-approved HDR/DET/TRL format and is ready for upload to your bank. Process a payroll period before generating.',
              'يستخدم ملف WPS تنسيق HDR/DET/TRL المعتمد من البنك المركزي وهو جاهز للرفع في البنك. قم بمعالجة فترة الرواتب قبل الإنشاء.',
              language
            )}
          </div>
        </CardBody>
      </Card>

      {content !== null && (
        <Card>
          <CardHeader className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">
              {t('Preview', 'معاينة', language)}
            </h2>
          </CardHeader>
          <CardBody className="p-0">
            <pre className="overflow-x-auto p-5 text-xs leading-relaxed text-gray-700 bg-gray-50 rounded-lg m-2 max-h-96 overflow-y-auto font-mono">
              {content}
            </pre>
          </CardBody>
        </Card>
      )}
    </div>
  );
}