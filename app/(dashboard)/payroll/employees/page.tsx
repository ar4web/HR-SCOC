'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { payrollService, SalaryUpdate } from '@/modules/payroll/service';
import { useAuthStore } from '@/stores/auth-store';
import { hasPermission } from '@/lib/rbac';
import { t, formatCurrency } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import { Wallet, Save, X, Pencil, Landmark, Phone } from 'lucide-react';

interface SalaryRow {
  id: string;
  employeeId: string;
  fullName: string;
  fullNameAr: string;
  department: string;
  salary: SalaryUpdate;
}

export default function SalarySetupPage() {
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const canManage = hasPermission(user?.role, 'payroll:manage');
  const { addToast } = useToast();
  const [rows, setRows] = React.useState<SalaryRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<SalaryRow | null>(null);
  const [draft, setDraft] = React.useState<SalaryRow['salary'] | null>(null);

  React.useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const res = await payrollService.getSalaries();
    if (res.success && res.data) {
      setRows(res.data.data);
    }
    setLoading(false);
  };

  const startEdit = (row: SalaryRow) => {
    setEditing(row);
    setDraft({ ...row.salary });
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft(null);
  };

  const handleSave = async () => {
    if (!editing || !draft) return;
    const res = await payrollService.updateSalary(editing.id, draft);
    if (res.success && res.data) {
      addToast({
        type: 'success',
        title: t('Salary updated!', 'تم تحديث الراتب!', language),
      });
      setRows((prev) =>
        prev.map((r) =>
          r.id === editing.id ? { ...r, salary: res.data as SalaryUpdate } : r
        )
      );
      cancelEdit();
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to update salary', 'فشل تحديث الراتب', language) });
    }
  };

  const updateDraft = (key: keyof SalaryRow['salary'], value: string) => {
    if (!draft) return;
    const next = { ...draft };
    if (key === 'bankName' || key === 'bankAccount' || key === 'iban') {
      next[key] = value;
    } else {
      next[key] = Number(value) || 0;
    }
    setDraft(next);
  };

  const totalAll = rows.reduce((sum, r) => sum + r.salary.total, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Salary Setup', 'إعداد الرواتب', language)}
        subtitle={t('Configure salary components and bank details for each employee', 'تكوين مكونات الراتب والبيانات البنكية لكل موظف', language)}
        actions={
          <div className="text-right">
            <div className="text-xl font-bold text-primary sm:text-2xl">{formatCurrency(totalAll)}</div>
            <div className="text-xs text-gray-400">
              {t('Monthly Payroll Total', 'إجمالي الرواتب الشهرية', language)}
            </div>
          </div>
        }
      />

      <Card>
        <CardHeader className="flex items-center gap-3">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">
            {t('Employee Salaries', 'رواتب الموظفين', language)}
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-6">
              <TableSkeleton rows={6} cols={6} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Employee', 'الموظف', language)}
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Basic', 'الأساسي', language)}
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Housing', 'السكن', language)}
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Transport', 'النقل', language)}
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Other', 'أخرى', language)}
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Total', 'الإجمالي', language)}
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Bank', 'البنك', language)}
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Actions', 'الإجراءات', language)}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((row) => {
                    const isEditing = editing?.id === row.id;
                    return (
                      <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">
                            {language === 'ar' ? row.fullNameAr || row.fullName : row.fullName}
                          </div>
                          <div className="text-xs text-gray-400">{row.department}</div>
                        </td>
                        {isEditing && draft ? (
                          <>
                            {(['basic', 'housing', 'transportation', 'otherAllowances'] as const).map((key) => (
                              <td key={key} className="px-2 py-4">
                                <input
                                  type="number"
                                  value={draft[key]}
                                  onChange={(e) => updateDraft(key, e.target.value)}
                                  className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-right text-sm focus:ring-2 focus:ring-primary"
                                />
                              </td>
                            ))}
                            <td className="px-4 py-4 text-sm font-semibold text-primary text-right">
                              {formatCurrency(
                                draft.basic + draft.housing + draft.transportation + draft.otherAllowances
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-4 text-sm text-gray-600 text-right">{formatCurrency(row.salary.basic)}</td>
                            <td className="px-4 py-4 text-sm text-gray-600 text-right">{formatCurrency(row.salary.housing)}</td>
                            <td className="px-4 py-4 text-sm text-gray-600 text-right">{formatCurrency(row.salary.transportation)}</td>
                            <td className="px-4 py-4 text-sm text-gray-600 text-right">{formatCurrency(row.salary.otherAllowances)}</td>
                            <td className="px-4 py-4 text-sm font-semibold text-gray-900 text-right">{formatCurrency(row.salary.total)}</td>
                          </>
                        )}
                        <td className="px-6 py-4">
                          {isEditing && draft ? (
                            <input
                              type="text"
                              value={draft.iban}
                              onChange={(e) => updateDraft('iban', e.target.value)}
                              placeholder="SA00 0000 0000 0000 0000 0000"
                              className="w-44 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary"
                            />
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <Landmark className="h-3.5 w-3.5 text-gray-300" />
                              <span className="text-xs text-gray-500">
                                {row.salary.iban || row.salary.bankAccount || '--'}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button size="sm" onClick={handleSave} title={t('Save', 'حفظ', language)} aria-label={t('Save', 'حفظ', language)}>
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={cancelEdit} title={t('Cancel', 'إلغاء', language)} aria-label={t('Cancel', 'إلغاء', language)}>
                                <X className="h-4 w-4" />
                              </Button>
        
                            </div>
                          ) : canManage ? (
                            <button
                                onClick={() => startEdit(row)}
                                className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                                title={t('Edit salary', 'تعديل الراتب', language)}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            ) : (
                            <span className="text-xs text-gray-300">{t('View only', 'عرض فقط', language)}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 text-sm text-gray-600">
        <Phone className="h-4 w-4 inline me-1 text-primary" />
        {t(
          'Inline editing lets you update basic, housing, transportation and other allowances. The total is computed automatically and used by the payroll engine when processing a period.',
          'يتيح التحرير المباشر تحديث الراتب الأساسي وبدل السكن والنقل والبدلات الأخرى. يتم احتساب الإجمالي تلقائياً واستخدامه في محرك الرواتب عند معالجة فترة معينة.',
          language
        )}
      </div>
    </div>
  );
}
