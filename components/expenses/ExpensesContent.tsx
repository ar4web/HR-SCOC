'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { downloadCsv } from '@/lib/csv';
import { useToast } from '@/components/ui/Toast';
import { expenseService, ExpenseSummary } from '@/modules/expense-management/service';
import { ModuleSettingsMenu } from '@/components/module-settings/ModuleSettingsMenu';
import { Expense, ExpenseStatus, PaymentMethod } from '@/types';
import { t, formatDate, formatCurrency } from '@/lib/utils';
import {
  ReceiptText,
  Plus,
  Trash2,
  Search,
  Pencil,
  Wallet,
  CheckCircle2,
  Clock,
  RefreshCcw,
  Lightbulb,
  Download,
  Check,
  X,
} from 'lucide-react';

const statusStyles: Record<ExpenseStatus, string> = {
  pending: 'bg-warning/10 text-warning',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-error/10 text-error',
  reimbursed: 'bg-info/10 text-info',
};

const paymentMethods: { value: PaymentMethod; en: string; ar: string }[] = [
  { value: 'cash', en: 'Cash', ar: 'نقدي' },
  { value: 'card', en: 'Card', ar: 'بطاقة' },
  { value: 'bank_transfer', en: 'Bank Transfer', ar: 'تحويل بنكي' },
  { value: 'mobile_payment', en: 'Mobile Payment', ar: 'دفع جوال' },
  { value: 'other', en: 'Other', ar: 'أخرى' },
];

export function ExpensesContent() {
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [summary, setSummary] = React.useState<ExpenseSummary | null>(null);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string[]>([]);
  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState<Expense | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [form, setForm] = React.useState({
    date: '',
    amount: '',
    category: '',
    description: '',
    paymentMethod: 'cash' as PaymentMethod,
    vendor: '',
    receiptNumber: '',
    notes: '',
  });

  const load = React.useCallback(async (status = statusFilter, q = search) => {
    setLoading(true);
    const [listRes, sumRes] = await Promise.all([
      expenseService.getExpenses({ status: status || undefined, search: q || undefined }),
      expenseService.getSummary(),
    ]);
    if (listRes.success && listRes.data) setExpenses(listRes.data.data);
    if (sumRes.success && sumRes.data) setSummary(sumRes.data);
    setLoading(false);
  }, [statusFilter, search]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    const fetchSuggestions = async () => {
      if (!form.category.trim()) {
        setSuggestions([]);
        return;
      }
      const res = await expenseService.getSuggestions(form.category, language);
      if (res.success && res.data) setSuggestions(res.data.data);
    };
    const timer = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(timer);
  }, [form.category, language]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      category: '',
      description: '',
      paymentMethod: 'cash',
      vendor: '',
      receiptNumber: '',
      notes: '',
    });
    setShowForm(true);
  };

  const openEdit = (exp: Expense) => {
    setEditing(exp);
    setForm({
      date: exp.date,
      amount: String(exp.amount),
      category: exp.category,
      description: exp.description,
      paymentMethod: exp.paymentMethod,
      vendor: exp.vendor || '',
      receiptNumber: exp.receiptNumber || '',
      notes: exp.notes || '',
    });
    setShowForm(true);
  };

  const pickSuggestion = (cat: string) => {
    setForm({ ...form, category: cat });
    setShowSuggestions(false);
  };

  const handleSave = async () => {
    const amount = Number(form.amount);
    if (!form.category.trim() || !form.description.trim() || !amount || amount <= 0 || !form.date) {
      addToast({ type: 'error', title: t('Date, amount, category and description are required', 'التاريخ والمبلغ والتصنيف والوصف مطلوبة', language) });
      return;
    }
    setSaving(true);
    const payload = {
      date: form.date,
      amount,
      category: form.category.trim(),
      description: form.description.trim(),
      paymentMethod: form.paymentMethod,
      vendor: form.vendor.trim() || undefined,
      receiptNumber: form.receiptNumber.trim() || undefined,
      notes: form.notes.trim() || undefined,
      requestedBy: user?.id || 'system',
      status: 'pending' as ExpenseStatus,
    };
    setSaving(true);
    try {
      const res = editing
        ? await expenseService.updateExpense(editing.id, payload)
        : await expenseService.createExpense(payload);
      if (res.success && res.data) {
        addToast({
          type: 'success',
          title: t(editing ? 'Expense updated' : 'Expense recorded', editing ? 'تم تحديث المصروف' : 'تم تسجيل المصروف', language),
        });
        setShowForm(false);
        load(statusFilter, search);
      } else {
        addToast({ type: 'error', title: res.error || t('Failed to save expense', 'فشل حفظ المصروف', language) });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await expenseService.deleteExpense(id);
    if (res.success) {
      addToast({ type: 'success', title: t('Expense deleted', 'تم حذف المصروف', language) });
      load(statusFilter, search);
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to delete expense', 'فشل حذف المصروف', language) });
    }
  };

  const handleReimburse = async (id: string) => {
    const res = await expenseService.requestReimbursement(id);
    if (res.success && res.data) {
      addToast({ type: 'success', title: t('Reimbursement requested', 'تم طلب الاسترداد', language) });
      load(statusFilter, search);
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to request reimbursement', 'فشل طلب الاسترداد', language) });
    }
  };

  const handleStatus = async (id: string, status: ExpenseStatus) => {
    const res = await expenseService.updateStatus(id, status);
    if (res.success) {
      addToast({
        type: status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'info',
        title: t(
          `Expense ${status}`,
          `تم ${status === 'approved' ? 'الموافقة على' : status === 'rejected' ? 'رفض' : 'تحديث'} المصروف`,
          language
        ),
      });
      load();
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to update status', 'فشل تحديث الحالة', language) });
    }
  };

  const stats = summary || { total: 0, pending: 0, approved: 0, reimbursed: 0, totalAmount: 0, pendingAmount: 0 };

  const exportCsv = () => {
    downloadCsv(
      visibleExpenses.map((e) => ({
        id: e.id,
        date: e.date,
        category: e.category,
        amount: e.amount,
        paymentMethod: e.paymentMethod,
        vendor: e.vendor || '',
        receiptNumber: e.receiptNumber || '',
        status: e.status,
        description: e.description || '',
      })),
      `expenses-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const visibleExpenses = React.useMemo(
    () => (categoryFilter.length === 0 ? expenses : expenses.filter((e) => categoryFilter.includes(e.category))),
    [expenses, categoryFilter]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-gray-900 sm:text-2xl">{t('Expense Management', 'إدارة المصروفات', language)}</h1>
          <p className="truncate text-sm text-gray-500 mt-1">
            {t('Record daily expenses and request reimbursements', 'سجل المصروفات اليومية واطلب الاسترداد', language)}
          </p>
        </div>
        <Button variant="ghost" onClick={exportCsv} className="shrink-0" title={'CSV'} aria-label={'CSV'}>
          <Download className="h-4 w-4" />
        </Button>
        <ModuleSettingsMenu
          module={t('Expenses', 'المصروفات', language)}
          onExport={exportCsv}
        />
        <Button onClick={openCreate} className="shrink-0" title={t('New Expense', 'مصروف جديد', language)} aria-label={t('New Expense', 'مصروف جديد', language)}>          <Plus className="h-4 w-4" />
        </Button>
        
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.totalAmount)}</p>
              <p className="text-xs text-gray-500">{t('Total', 'الإجمالي', language)}</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.pendingAmount)}</p>
              <p className="text-xs text-gray-500">{t('Pending', 'قيد الانتظار', language)}</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.approved}</p>
              <p className="text-xs text-gray-500">{t('Approved', 'موافق عليها', language)}</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
              <RefreshCcw className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.reimbursed}</p>
              <p className="text-xs text-gray-500">{t('Reimbursed', 'مسترجع', language)}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex items-center gap-3">
            <ReceiptText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">
              {t(editing ? 'Edit Expense' : 'Record Expense', editing ? 'تعديل مصروف' : 'تسجيل مصروف', language)}
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label={t('Date', 'التاريخ', language)}
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
              <Input
                label={t('Amount (﷼)', 'المبلغ (ريال)', language)}
                type="number"
                min={0}
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">{t('Payment Method', 'طريقة الدفع', language)}</label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as PaymentMethod })}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {paymentMethods.map((m) => (
                    <option key={m.value} value={m.value}>
                      {language === 'ar' ? m.ar : m.en}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="relative space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">{t('Category', 'التصنيف', language)}</label>
              <div className="flex gap-2">
                <input
                  value={form.category}
                  onChange={(e) => {
                    setForm({ ...form, category: e.target.value });
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder={t('Start typing for suggestions...', 'ابدأ الكتابة للاقتراحات...', language)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                    {suggestions.slice(0, 8).map((s) => (
                      <button
                        key={s}
                        onClick={() => pickSuggestion(s)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {suggestions.length === 0 && form.category.trim() && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" />
                  {t('New category will be used as-is', 'سيتم استخدام التصنيف الجديد كما هو', language)}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={t('Description', 'الوصف', language)}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t('e.g. Printer paper', 'مثال: ورق للطابعة', language)}
              />
              <Input
                label={t('Vendor', 'المورد', language)}
                value={form.vendor}
                onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                placeholder={t('Optional', 'اختياري', language)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={t('Receipt Number', 'رقم الإيصال', language)}
                value={form.receiptNumber}
                onChange={(e) => setForm({ ...form, receiptNumber: e.target.value })}
                placeholder={t('Optional', 'اختياري', language)}
              />
              <Input
                label={t('Notes', 'ملاحظات', language)}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t('Optional', 'اختياري', language)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                {t('Cancel', 'إلغاء', language)}
              </Button>
              <Button onClick={handleSave} loading={saving}>
                {t(editing ? 'Save Changes' : 'Record Expense', editing ? 'حفظ التغييرات' : 'تسجيل المصروف', language)}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader className="flex items-center gap-3 flex-wrap">
          <ReceiptText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{t('Expense Records', 'سجلات المصروفات', language)}</h2>
          <div className="flex-1" />
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                load(statusFilter, e.target.value);
              }}
              placeholder={t('Search expenses...', 'ابحث عن مصروفات...', language)}
              className="block w-56 rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              load(e.target.value, search);
            }}
            className="block rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">{t('All Statuses', 'كل الحالات', language)}</option>
            <option value="pending">{t('Pending', 'قيد الانتظار', language)}</option>
            <option value="approved">{t('Approved', 'موافق عليها', language)}</option>
            <option value="rejected">{t('Rejected', 'مرفوضة', language)}</option>
            <option value="reimbursed">{t('Reimbursed', 'مسترجع', language)}</option>
          </select>
          <MultiSelect
            label="Category"
            labelAr="الفئة"
            locale={language}
            options={Array.from(new Set(expenses.map((e) => e.category))).map((c) => ({ value: c, label: c }))}
            value={categoryFilter}
            onChange={setCategoryFilter}
          />
        </CardHeader>
        <CardBody>
          {loading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : visibleExpenses.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              {t('No expenses recorded yet.', 'لم يتم تسجيل مصروفات بعد.', language)}
            </p>
          ) : (
            <div className="overflow-x-auto scrollbar-thin" role="region" aria-label={t('Expenses table', 'جدول المصروفات', language)} tabIndex={0}>
              <table className="w-full border-separate border-spacing-0 min-w-[600px] lg:min-w-0">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-3.5 align-middle text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Expense', 'المصروف', language)}
                    </th>
                    <th className="hidden md:table-cell px-6 py-3.5 align-middle text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Details', 'التفاصيل', language)}
                    </th>
                    <th className="px-6 py-3.5 align-middle text-end text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Amount', 'المبلغ', language)}
                    </th>
                    <th className="px-6 py-3.5 align-middle text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Status', 'الحالة', language)}
                    </th>
                    <th className="px-6 py-3.5 align-middle text-end text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Actions', 'الإجراءات', language)}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {visibleExpenses.map((exp) => (
                    <tr key={exp.id} className="group hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 align-middle">
                        <span className="text-sm font-semibold text-gray-900 break-words">{exp.category}</span>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 align-middle min-w-0">
                        <p className="truncate text-sm text-gray-600" title={exp.description}>
                          {exp.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-400">
                          <span className="whitespace-nowrap">{formatDate(exp.date, language)}</span>
                          {exp.vendor && <span className="truncate">{exp.vendor}</span>}
                          <span>{t(exp.paymentMethod, exp.paymentMethod, language)}</span>
                          {exp.reimbursedAt && (
                            <span className="whitespace-nowrap">
                              {t('Reimbursed', 'مسترجع', language)}: {formatDate(exp.reimbursedAt, language)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle text-end whitespace-nowrap">
                        <span className="text-sm font-bold text-primary">{formatCurrency(exp.amount)}</span>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[exp.status]}`}>
                          {t(exp.status, exp.status, language)}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-middle text-end whitespace-nowrap">
                        <div className="flex justify-end gap-1">
                          {exp.status === 'pending' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleReimburse(exp.id)}>
                                <RefreshCcw className="h-3.5 w-3.5" />
                                {t('Reimburse', 'استرداد', language)}
                              </Button>
<Button size="sm" variant="secondary" onClick={() => handleStatus(exp.id, 'approved')} title={t('Approve', 'موافقة', language)} aria-label={t('Approve', 'موافقة', language)}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => handleStatus(exp.id, 'rejected')} title={t('Reject', 'رفض', language)} aria-label={t('Reject', 'رفض', language)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <button
                            onClick={() => openEdit(exp)}
                            className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-gray-100 transition-colors"
                            title={t('Edit', 'تعديل', language)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(exp.id)}
                            className="p-2 rounded-lg text-gray-400 hover:text-error hover:bg-error/10 transition-colors"
                            title={t('Delete', 'حذف', language)}
                          >
                            <Trash2 className="h-4 w-4" />
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
