'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { t } from '@/lib/utils';
import { Download, Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { getStoredToken } from '@/lib/client-token';

interface ImportPreviewRow {
  rowNumber: number;
  name: string;
  email: string;
  department: string;
  position: string;
  salary: number;
  valid: boolean;
  errors: string[];
}

interface ImportResult {
  created: number;
  skipped: number;
  preview: ImportPreviewRow[];
  failures: { rowNumber: number; errors: string[] }[];
}

interface EmployeeImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

export function EmployeeImportDialog({ open, onClose, onImported }: EmployeeImportDialogProps) {
  const { language } = useLanguageStore();
  const { addToast } = useToast();
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<ImportPreviewRow[] | null>(null);
  const [totalRows, setTotalRows] = React.useState(0);
  const [validCount, setValidCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) {
      setFile(null);
      setPreview(null);
      setResult(null);
      setLoading(false);
    }
  }, [open]);

  const downloadTemplate = async () => {
    try {
      const token = getStoredToken();
      const res = await fetch('/api/employees/template', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'employee-import-template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast({ type: 'success', title: t('Template downloaded', 'تم تحميل القالب', language) });
    } catch {
      addToast({ type: 'error', title: t('Failed to download template', 'فشل تحميل القالب', language) });
    }
  };

  const handleFile = (f: File | null) => {
    setFile(f);
    setPreview(null);
    setResult(null);
    if (f) uploadPreview(f);
  };

  const uploadPreview = async (f: File) => {
    setLoading(true);
    const form = new FormData();
    form.set('file', f);
    form.set('action', 'preview');
    try {
      const token = getStoredToken();
      const res = await fetch('/api/employees/import', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        addToast({ type: 'error', title: data.error || t('Failed to read file', 'فشل قراءة الملف', language) });
      } else {
        setPreview(data.preview);
        setTotalRows(data.total);
        setValidCount(data.validCount);
      }
    } catch {
      addToast({ type: 'error', title: t('Network error', 'خطأ في الشبكة', language) });
    }
    setLoading(false);
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    const form = new FormData();
    form.set('file', file);
    form.set('action', 'import');
    try {
      const token = getStoredToken();
      const res = await fetch('/api/employees/import', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        addToast({ type: 'error', title: data.error || t('Import failed', 'فشل الاستيراد', language) });
      } else {
        setResult(data);
        addToast({
          type: data.created > 0 ? 'success' : 'info',
          title: t(
            `${data.created} employee(s) imported, ${data.skipped} skipped`,
            `تم استيراد ${data.created} موظف، تم تخطي ${data.skipped}`,
            language
          ),
        });
        onImported();
      }
    } catch {
      addToast({ type: 'error', title: t('Network error', 'خطأ في الشبكة', language) });
    }
    setLoading(false);
  };

  if (!open) return null;

  const invalidRows = preview?.filter((r) => !r.valid) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-md bg-white shadow-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('Bulk import employees', 'استيراد الموظفين بالجملة', language)}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {t('Bulk Import Employees', 'استيراد الموظفين بالجملة', language)}
              </h2>
              <p className="text-xs text-gray-500">
                {t('Upload an Excel file with employee records', 'ارفع ملف إكسل يحتوي على بيانات الموظفين', language)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" aria-label={t('Close', 'إغلاق', language)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-4">
            <div className="flex items-center gap-3 min-w-0">
              <Download className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{t('Step 1: Download the template', 'الخطوة 1: حمّل القالب', language)}</p>
                <p className="text-xs text-gray-500 truncate">
                  {t('Fill one employee per row and save as .xlsx', 'املأ موظفاً واحداً لكل صف واحفظ كملف xlsx', language)}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={downloadTemplate} className="shrink-0" title={t('Template', 'القالب', language)} aria-label={t('Template', 'القالب', language)}>
              <Download className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-4">
            <div className="flex items-center gap-3 min-w-0">
              <Upload className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{t('Step 2: Upload the filled file', 'الخطوة 2: ارفع الملف المعبأ', language)}</p>
                <p className="text-xs text-gray-500 truncate">
                  {file ? file.name : t('.xlsx or .xls files only', 'ملفات xlsx أو xls فقط', language)}
                </p>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="shrink-0">
              <Upload className="h-4 w-4" />
              {t('Choose File', 'اختر الملف', language)}
            </Button>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              {t('Reading file...', 'جارٍ قراءة الملف...', language)}
            </div>
          )}

          {!loading && preview && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${validCount === totalRows ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                  {validCount === totalRows ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  {t(`${validCount} of ${totalRows} rows valid`, `${validCount} من ${totalRows} صف صالح`, language)}
                </span>
              </div>

              <div className="max-h-56 overflow-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Row', 'الصف', language)}</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Name', 'الاسم', language)}</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Department', 'القسم', language)}</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Salary', 'الراتب', language)}</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Status', 'الحالة', language)}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {preview.slice(0, 50).map((r) => (
                      <tr key={r.rowNumber} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2 text-gray-500">{r.rowNumber}</td>
                        <td className="px-4 py-2 font-medium text-gray-900">{r.name}</td>
                        <td className="px-4 py-2 text-gray-600">{r.department || '—'}</td>
                        <td className="px-4 py-2 text-right text-gray-600">{r.salary > 0 ? r.salary.toLocaleString() : '—'}</td>
                        <td className="px-4 py-2">
                          {r.valid ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                              <CheckCircle2 className="h-3.5 w-3.5" /> {t('OK', 'صالح', language)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-error">
                              <AlertCircle className="h-3.5 w-3.5" /> {t('Error', 'خطأ', language)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {invalidRows.length > 0 && (
                <div className="rounded-xl border border-error/20 bg-error/5 p-3 text-sm">
                  <p className="font-medium text-error mb-1">{t('Fix these rows and re-upload', 'صحح هذه الصفوف وأعد الرفع', language)}</p>
                  <ul className="space-y-1 text-gray-600">
                    {invalidRows.slice(0, 5).map((r) => (
                      <li key={r.rowNumber}>
                        <span className="font-medium text-gray-900">#{r.rowNumber}</span> {r.errors.join('; ')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {result && (
            <div className={`rounded-xl border p-4 text-sm ${result.created > 0 ? 'border-success/20 bg-success/5' : 'border-warning/20 bg-warning/5'}`}>
              <p className="font-medium text-gray-900">
                {t(`${result.created} imported`, `تم استيراد ${result.created}`, language)}
                {result.skipped > 0 && t(` · ${result.skipped} skipped`, ` · تم تخطي ${result.skipped}`, language)}
              </p>
              {result.failures.length > 0 && (
                <ul className="mt-2 space-y-1 text-gray-600">
                  {result.failures.slice(0, 5).map((f) => (
                    <li key={f.rowNumber}>
                      <span className="font-medium">#{f.rowNumber}</span>: {f.errors.join('; ')}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            {t('Close', 'إغلاق', language)}
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || loading || !preview}
           title={t('Import Employees', 'استيراد الموظفين', language)} aria-label={t('Import Employees', 'استيراد الموظفين', language)}>          <Upload className="h-4 w-4" />
        </Button>
        
        </div>
      </div>
    </div>
  );
}