'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { employeeService } from '@/modules/employee-management/service';
import { t } from '@/lib/utils';
import { FilePlus2, Plus, Trash2, X, Download, Play } from 'lucide-react';
const Trash2Icon = Trash2;

interface DraftRow {
  uid: string;
  employeeId: string;
  date: string;
  clockIn: string;
  clockOut: string;
  breakHours: string;
  otHours: string;
}

interface Props {
  open: boolean;
  period: string;
  onPeriodChange: (p: string) => void;
  onUpload: (f: File) => void;
  onClose: () => void;
}

export function TimesheetCreateDialog({ open, period, onPeriodChange, onUpload, onClose }: Props) {
  const { language } = useLanguageStore();
  const { addToast } = useToast();
  const [rows, setRows] = React.useState<DraftRow[]>([]);
  const [emps, setEmps] = React.useState<{ employeeId: string; fullName: string }[]>([]);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [generating, setGenerating] = React.useState(false);
  const empsLoadedRef = React.useRef(false);

  const uid = () => Math.random().toString(36).slice(2, 9);
  const blank = (): DraftRow => ({ uid: uid(), employeeId: '', date: '', clockIn: '08:00', clockOut: '17:00', breakHours: '1', otHours: '0' });
  const addRow = () => setRows((r) => [...r, blank()]);
  const setRow = (uid: string, patch: Partial<DraftRow>) => setRows((r) => r.map((x) => (x.uid === uid ? { ...x, ...patch } : x)));
  const removeRow = (uid: string) => setRows((r) => r.filter((x) => x.uid !== uid));
  const toggleEmp = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  React.useEffect(() => {
    if (!open) return;
    setRows([]);
    setSelected([]);
    if (!empsLoadedRef.current) {
      empsLoadedRef.current = true;
      employeeService.list({ pageSize: 200 }).then((res) => {
        const list = res?.data?.data;
        if (Array.isArray(list)) setEmps(list.map((e) => ({ employeeId: e.employeeId, fullName: e.fullName })));
      });
    }
  }, [open]);

  const autoFillWorkdays = () => {
    const [y = 0, m = 0] = (period || '').split('-').map(Number);
    if (!y || !m) {
      addToast({ type: 'info', title: t('Pick a payroll period first', 'اختر فترة الرواتب أولاً', language) });
      return;
    }
    const days: string[] = [];
    for (let d = 1; d <= new Date(y, m, 0).getDate(); d++) {
      const dow = new Date(y, m - 1, d).getDay();
      if (dow !== 5 && dow !== 6) days.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    const pick = selected.length > 0 ? selected : emps.slice(0, 3).map((e) => e.employeeId);
    if (pick.length === 0) {
      addToast({ type: 'info', title: t('Select at least one employee', 'اختر موظفاً واحداً على الأقل', language) });
      return;
    }
    const built: DraftRow[] = pick.flatMap((emp) => days.map((date) => ({ ...blank(), employeeId: emp, date })));
    setRows(built);
    addToast({ type: 'success', title: t(`${built.length} workday rows pre-filled`, `تم تعبئة ${built.length} صف يوم عمل`, language) });
  };

  const generate = async (upload: boolean) => {
    const expanded = rows.flatMap((r) => {
      if (r.employeeId === '__all' && r.date && r.clockIn) {
        const picks = selected.length > 0 ? selected : emps.slice(0, 3).map((e) => e.employeeId);
        return picks.map((emp) => ({ ...r, employeeId: emp }));
      }
      return [r];
    });
    const valid = expanded.filter((r) => r.employeeId && r.date && r.clockIn);
    if (valid.length === 0) {
      addToast({ type: 'error', title: t('Add at least one complete row (employee + date + clock in)', 'أضف صفاً مكتملاً على الأقل (موظف + تاريخ + دخول)', language) });
      return;
    }
    if (valid.length !== expanded.length) {
      addToast({ type: 'info', title: t(`Skipping ${expanded.length - valid.length} incomplete row(s)`, `تخطي ${expanded.length - valid.length} صف غير مكتمل`, language) });
    }
    setGenerating(true);
    try {
      const token = localStorage.getItem('scos_token');
      const res = await fetch('/api/payroll/timesheet/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          rows: valid.map((r) => ({
            employeeId: r.employeeId,
            date: r.date,
            clockIn: r.clockIn,
            clockOut: r.clockOut,
            breakHours: Number(r.breakHours) || 0,
            otHours: Number(r.otHours) || 0,
          })),
        }),
      });
      if (!res.ok) throw new Error('Generate failed');
      const blob = await res.blob();
      const fileName = `timesheet-${period}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (upload) {
        onUpload(new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      }
      addToast({ type: 'success', title: t('Timesheet file created and downloaded', 'تم إنشاء وتحميل ملف جدول العمل', language) });
      onClose();
    } catch {
      addToast({ type: 'error', title: t('Failed to create timesheet file', 'فشل إنشاء ملف جدول العمل', language) });
    }
    setGenerating(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-4xl flex max-h-[90vh] flex-col rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FilePlus2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{t('Create Timesheet', 'إنشاء جدول العمل', language)}</h3>
              <p className="text-xs text-gray-500">
                {t('Fill rows or auto-generate workdays — output matches the upload template format (Employee ID | Date YYYY-MM-DD | Clock In HH:MM | Clock Out | Break | OT)', 'املأ الصفوف أو ولّد أيام العمل تلقائياً — المخرجات مطابقة لصيغة قالب الرفع (معرف الموظف | التاريخ YYYY-MM-DD | الدخول HH:MM | الخروج | الاستراحة | الإضافي)', language)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" title={t('Close', 'إغلاق', language)} aria-label={t('Close', 'إغلاق', language)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-auto px-6 py-5">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('Payroll Period', 'فترة الرواتب', language)}</label>
              <input type="month" value={period} onChange={(e) => onPeriodChange(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary" />
            </div>
            <div className="min-w-[260px] flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('Employees (for auto-fill)', 'الموظفون (للتعبئة التلقائية)', language)}</label>
              <div className="max-h-32 overflow-auto rounded-lg border border-gray-200 p-2 space-y-0.5">
                {emps.length === 0 && <p className="text-xs text-gray-400">{t('Loading employees...', 'جارٍ تحميل الموظفين...', language)}</p>}
                {emps.map((e) => (
                  <label key={e.employeeId} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-0.5 text-sm text-gray-700 hover:bg-gray-50">
                    <input type="checkbox" checked={selected.includes(e.employeeId)} onChange={() => toggleEmp(e.employeeId)} className="rounded" />
                    <span className="font-mono text-xs text-gray-400">{e.employeeId}</span>
                    <span className="truncate">{e.fullName}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button variant="outline" onClick={autoFillWorkdays} title={t('Auto-fill workdays (Sun-Thu, 08:00-17:00)', 'تعبئة أيام العمل تلقائياً (الأحد-الخميس 08:00-17:00)', language)} aria-label={t('Auto-fill workdays', 'تعبئة أيام العمل تلقائياً', language)}>
              <Play className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={addRow} title={t('Add Row', 'إضافة صف', language)} aria-label={t('Add Row', 'إضافة صف', language)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center text-sm text-gray-400">
              {t('No rows yet — pick employees and press Auto-fill, or add a row manually. Header format matches the upload template.', 'لا توجد صفوف بعد — اختر الموظفين واضغط التعبئة التلقائية، أو أضف صفاً يدوياً. صيغة الترويسة مطابقة لقالب الرفع.', language)}
            </p>
          ) : (
            <div className="max-h-[36vh] overflow-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="border-b border-gray-100">
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('Employee', 'الموظف', language)}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('Date', 'التاريخ', language)}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('In', 'دخول', language)}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('Out', 'خروج', language)}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('OT Hrs', 'س. إضافي', language)}</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((r) => (
                    <tr key={r.uid}>
                      <td className="px-3 py-1.5">
                        <select
                          value={r.employeeId}
                          onChange={(e) => setRow(r.uid, { employeeId: e.target.value })}
                          className="w-44 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary"
                        >
                          <option value="">{t('Select…', 'اختر…', language)}</option>
                          <option value="__all">{t('All selected employees', 'جميع الموظفين المحددين', language)}</option>
                          {emps.map((e) => (
                            <option key={e.employeeId} value={e.employeeId}>
                              {e.employeeId} — {e.fullName}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="date" value={r.date} onChange={(e) => setRow(r.uid, { date: e.target.value })} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="time" value={r.clockIn} onChange={(e) => setRow(r.uid, { clockIn: e.target.value })} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="time" value={r.clockOut} onChange={(e) => setRow(r.uid, { clockOut: e.target.value })} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="number" min="0" step="0.5" value={r.otHours} onChange={(e) => setRow(r.uid, { otHours: e.target.value })} className="w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <button onClick={() => removeRow(r.uid)} className="p-1 text-gray-400 hover:text-error" title={t('Remove', 'حذف', language)} aria-label={t('Remove', 'حذف', language)}>
                          <Trash2Icon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>
              {t('Cancel', 'إلغاء', language)}
            </Button>
            <Button variant="outline" onClick={() => generate(false)} loading={generating} title={t('Generate & Download', 'إنشاء وتحميل', language)} aria-label={t('Generate & Download', 'إنشاء وتحميل', language)}>
              <Download className="h-4 w-4" />
            </Button>
            <Button onClick={() => generate(true)} loading={generating} title={t('Generate, Upload & Preview', 'إنشاء ورفع ومعاينة', language)} aria-label={t('Generate, Upload & Preview', 'إنشاء ورفع ومعاينة', language)}>
              <FilePlus2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
