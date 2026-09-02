'use client';

// Expenses — redesigned.
// Logic upgrades: role-aware approval workflow (approvers get an actionable
// "Needs approval" queue), optimistic status updates with rollback, debounced
// server search, client-side category/date refinement, live insights (spend by
// category donut + top categories) computed from the visible dataset, real
// category picker fed by the categories endpoint, and a slide-over detail
// drawer so the table stays scannable.
// Style: KPI strip, segmented status control, icon-coded categories, and the
// app's core theme tokens throughout (primary/success/warning/error/info).

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { expenseService, ExpenseSummary } from '@/modules/expense-management/service';
import { ModuleSettingsMenu } from '@/components/module-settings/ModuleSettingsMenu';
import PageHeader, { HeaderAction } from '@/components/layout/PageHeader';
import { Toolbar, ToolbarSegments, ToolbarSpacer } from '@/components/layout/Toolbar';
import { usePageSearch } from '@/stores/search-store';
import { Chart } from '@/engines/chart-engine';
import { downloadCsv } from '@/lib/csv';
import { hasPermission } from '@/lib/rbac';
import { Expense, ExpenseCategory, ExpenseStatus, PaymentMethod } from '@/types';
import { t, formatDate, formatCurrency, getPaymentMethodLabel } from '@/lib/utils';
import {
  ReceiptText, Plus, Trash2, Pencil, Wallet, CheckCircle2, Clock,
  RefreshCcw, Download, Check, X, ChevronRight, Banknote, Plane, Car, Utensils,
  Hotel, Cpu, Fuel, Zap, Megaphone, GraduationCap, Wrench, PartyPopper,
  HeartPulse, Package, CalendarDays, CreditCard, Building2, Hash, StickyNote,
  TrendingUp, Filter,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* meta                                                                */
/* ------------------------------------------------------------------ */

const statusMeta: Record<ExpenseStatus, { chip: string; dot: string; en: string; ar: string }> = {
  pending: { chip: 'bg-warning/10 text-warning', dot: 'bg-warning', en: 'Pending', ar: 'قيد الانتظار' },
  approved: { chip: 'bg-success/10 text-success', dot: 'bg-success', en: 'Approved', ar: 'موافق عليه' },
  rejected: { chip: 'bg-error/10 text-error', dot: 'bg-error', en: 'Rejected', ar: 'مرفوض' },
  reimbursed: { chip: 'bg-info/10 text-info', dot: 'bg-info', en: 'Reimbursed', ar: 'مسترد' },
};

const paymentMethods: { value: PaymentMethod; en: string; ar: string }[] = [
  { value: 'cash', en: 'Cash', ar: 'نقدي' },
  { value: 'card', en: 'Card', ar: 'بطاقة' },
  { value: 'bank_transfer', en: 'Bank Transfer', ar: 'تحويل بنكي' },
  { value: 'mobile_payment', en: 'Mobile Payment', ar: 'دفع جوال' },
  { value: 'other', en: 'Other', ar: 'أخرى' },
];

// Icon per category (matched loosely against EN/AR names).
const CATEGORY_ICONS: { match: RegExp; icon: React.ElementType }[] = [
  { match: /office|لوازم/i, icon: Package },
  { match: /travel|سفر/i, icon: Plane },
  { match: /transport|مواصلات/i, icon: Car },
  { match: /meal|وجبات/i, icon: Utensils },
  { match: /accommodation|إقامة/i, icon: Hotel },
  { match: /tech|تقنية/i, icon: Cpu },
  { match: /fuel|وقود/i, icon: Fuel },
  { match: /utilit|مرافق/i, icon: Zap },
  { match: /marketing|تسويق/i, icon: Megaphone },
  { match: /training|تدريب/i, icon: GraduationCap },
  { match: /mainten|صيانة/i, icon: Wrench },
  { match: /entertain|ترفيه/i, icon: PartyPopper },
  { match: /medical|علاج/i, icon: HeartPulse },
];

function categoryIcon(name: string): React.ElementType {
  return CATEGORY_ICONS.find((c) => c.match.test(name))?.icon || ReceiptText;
}

const selectCls =
  'block w-full rounded-md border-0 bg-gray-100 px-3 py-2 text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40';

type StatusTab = '' | ExpenseStatus;

const emptyForm = {
  date: '', amount: '', category: '', description: '',
  paymentMethod: 'cash' as PaymentMethod, vendor: '', receiptNumber: '', notes: '',
};

/* ------------------------------------------------------------------ */
/* component                                                           */
/* ------------------------------------------------------------------ */

export function ExpensesContent() {
  const { language, dir } = useLanguageStore();
  const { user } = useAuthStore();
  const { addToast } = useToast();

  const canApprove = hasPermission(user?.role, 'expense:approve');

  // data
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [summary, setSummary] = React.useState<ExpenseSummary | null>(null);
  const [categories, setCategories] = React.useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = React.useState(true);

  // filters
  const [statusTab, setStatusTab] = React.useState<StatusTab>('');
  const search = usePageSearch('/expenses', 'Search expenses…', 'ابحث في المصروفات…');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [showFilters, setShowFilters] = React.useState(false);
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');

  // detail / form
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState<Expense | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [actingId, setActingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(emptyForm);

  /* ------------------------------ data ------------------------------ */

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const load = React.useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    const [listRes, sumRes, catRes] = await Promise.all([
      expenseService.getExpenses({ search: debouncedSearch || undefined }),
      expenseService.getSummary(),
      expenseService.getCategories(),
    ]);
    if (listRes.success && listRes.data) setExpenses(listRes.data.data);
    if (sumRes.success && sumRes.data) setSummary(sumRes.data);
    if (catRes.success && catRes.data) setCategories(catRes.data.data);
    setLoading(false);
  }, [debouncedSearch]);

  React.useEffect(() => { load(); }, [load]);

  /* ---------------------------- derived ----------------------------- */

  // Client-side refinement keeps status/category/date switching instant.
  const visible = React.useMemo(() => {
    return expenses
      .filter((e) => (statusTab ? e.status === statusTab : true))
      .filter((e) => (categoryFilter ? e.category === categoryFilter : true))
      .filter((e) => (dateFrom ? e.date >= dateFrom : true))
      .filter((e) => (dateTo ? e.date <= dateTo : true));
  }, [expenses, statusTab, categoryFilter, dateFrom, dateTo]);

  const statusCounts = React.useMemo(() => {
    const base: Record<string, number> = { '': expenses.length, pending: 0, approved: 0, rejected: 0, reimbursed: 0 };
    for (const e of expenses) base[e.status] = (base[e.status] || 0) + 1;
    return base;
  }, [expenses]);

  // Insights from the currently visible data.
  const byCategory = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const e of visible) map.set(e.category, (map.get(e.category) || 0) + e.amount);
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [visible]);

  const visibleTotal = React.useMemo(() => visible.reduce((s, e) => s + e.amount, 0), [visible]);
  const pendingQueue = React.useMemo(() => expenses.filter((e) => e.status === 'pending'), [expenses]);
  const selected = expenses.find((e) => e.id === selectedId) || null;

  const stats = summary || { total: 0, pending: 0, approved: 0, reimbursed: 0, totalAmount: 0, pendingAmount: 0 };

  const activeFilterCount = (categoryFilter ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  /* ---------------------------- actions ----------------------------- */

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, date: new Date().toISOString().split('T')[0] });
    setShowForm(true);
  };

  const openEdit = (exp: Expense) => {
    setEditing(exp);
    setForm({
      date: exp.date, amount: String(exp.amount), category: exp.category,
      description: exp.description, paymentMethod: exp.paymentMethod,
      vendor: exp.vendor || '', receiptNumber: exp.receiptNumber || '', notes: exp.notes || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    const amount = Number(form.amount);
    if (!form.category.trim() || !form.description.trim() || !amount || amount <= 0 || !form.date) {
      addToast({ type: 'error', title: t('Date, amount, category and description are required', 'التاريخ والمبلغ والتصنيف والوصف مطلوبة', language) });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        date: form.date, amount,
        category: form.category.trim(),
        description: form.description.trim(),
        paymentMethod: form.paymentMethod,
        vendor: form.vendor.trim() || undefined,
        receiptNumber: form.receiptNumber.trim() || undefined,
        notes: form.notes.trim() || undefined,
        requestedBy: user?.id || 'system',
        status: 'pending' as ExpenseStatus,
      };
      const res = editing
        ? await expenseService.updateExpense(editing.id, payload)
        : await expenseService.createExpense(payload);
      if (res.success && res.data) {
        addToast({ type: 'success', title: t(editing ? 'Expense updated' : 'Expense submitted', editing ? 'تم تحديث المصروف' : 'تم تقديم المصروف', language) });
        setShowForm(false);
        load({ silent: true });
      } else {
        addToast({ type: 'error', title: res.error || t('Failed to save expense', 'فشل حفظ المصروف', language) });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const prev = expenses;
    setExpenses((cur) => cur.filter((e) => e.id !== id)); // optimistic
    if (selectedId === id) setSelectedId(null);
    const res = await expenseService.deleteExpense(id);
    if (res.success) {
      addToast({ type: 'success', title: t('Expense deleted', 'تم حذف المصروف', language) });
      load({ silent: true });
    } else {
      setExpenses(prev); // rollback
      addToast({ type: 'error', title: res.error || t('Failed to delete expense', 'فشل حذف المصروف', language) });
    }
  };

  // Optimistic status change with rollback on failure.
  const handleStatus = async (id: string, status: ExpenseStatus) => {
    const prev = expenses;
    setActingId(id);
    setExpenses((cur) => cur.map((e) => (e.id === id ? { ...e, status } : e)));
    const res = await expenseService.updateStatus(id, status);
    setActingId(null);
    if (res.success) {
      addToast({
        type: status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'info',
        title:
          status === 'approved' ? t('Expense approved', 'تمت الموافقة على المصروف', language)
          : status === 'rejected' ? t('Expense rejected', 'تم رفض المصروف', language)
          : t('Expense reimbursed', 'تم استرداد المصروف', language),
      });
      load({ silent: true });
    } else {
      setExpenses(prev);
      addToast({ type: 'error', title: res.error || t('Failed to update status', 'فشل تحديث الحالة', language) });
    }
  };

  const exportCsv = () => {
    downloadCsv(
      visible.map((e) => ({
        id: e.id, date: e.date, category: e.category, amount: e.amount,
        paymentMethod: e.paymentMethod, vendor: e.vendor || '',
        receiptNumber: e.receiptNumber || '', status: e.status, description: e.description || '',
      })),
      `expenses-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const categoryDisplay = (name: string) => {
    const cat = categories.find((c) => c.name === name || c.nameAr === name);
    if (!cat) return name;
    return language === 'ar' ? cat.nameAr : cat.name;
  };

  /* ----------------------------- render ----------------------------- */

  const kpis = [
    {
      label: t('Total Spend', 'إجمالي الإنفاق', language),
      value: formatCurrency(stats.totalAmount),
      sub: `${stats.total} ${t('expenses', 'مصروف', language)}`,
      icon: Wallet, tone: 'bg-primary/10 text-primary',
    },
    {
      label: t('Awaiting Approval', 'بانتظار الموافقة', language),
      value: formatCurrency(stats.pendingAmount),
      sub: `${stats.pending} ${t('pending', 'قيد الانتظار', language)}`,
      icon: Clock, tone: 'bg-warning/10 text-warning',
    },
    {
      label: t('Approved', 'موافق عليها', language),
      value: String(stats.approved),
      sub: t('ready to reimburse', 'جاهزة للاسترداد', language),
      icon: CheckCircle2, tone: 'bg-success/10 text-success',
    },
    {
      label: t('Reimbursed', 'مستردة', language),
      value: String(stats.reimbursed),
      sub: t('completed', 'مكتملة', language),
      icon: RefreshCcw, tone: 'bg-info/10 text-info',
    },
  ];

  const statusTabs: { value: StatusTab; label: string }[] = [
    { value: '', label: t('All', 'الكل', language) },
    { value: 'pending', label: statusMeta.pending[language === 'ar' ? 'ar' : 'en'] },
    { value: 'approved', label: statusMeta.approved[language === 'ar' ? 'ar' : 'en'] },
    { value: 'rejected', label: statusMeta.rejected[language === 'ar' ? 'ar' : 'en'] },
    { value: 'reimbursed', label: statusMeta.reimbursed[language === 'ar' ? 'ar' : 'en'] },
  ];

  return (
    <div className="space-y-5" dir={dir}>
      {/* header */}
      <PageHeader
        icon={ReceiptText}
        title={t('Expenses', 'المصروفات', language)}
        subtitle={
          canApprove
            ? t('Track, approve and reimburse company spend', 'تتبّع واعتمد واسترد مصروفات الشركة', language)
            : t('Submit and track your expense claims', 'قدّم وتتبّع مطالبات مصروفاتك', language)
        }
        actions={
          <>
            <HeaderAction icon={Download} label={t('Export CSV', 'تصدير CSV', language)} onClick={exportCsv} disabled={visible.length === 0} />
            <ModuleSettingsMenu module={t('Expenses', 'المصروفات', language)} />
            <HeaderAction icon={Plus} label={t('New Expense', 'مصروف جديد', language)} primary onClick={openCreate} />
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl bg-white p-4 shadow-card">
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${k.tone}`}>
                <k.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs text-gray-400">{k.label}</p>
                <p className="truncate text-lg font-bold text-gray-900">{k.value}</p>
                <p className="truncate text-[11px] text-gray-400">{k.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* approver queue */}
      {canApprove && pendingQueue.length > 0 && (
        <div className="rounded-2xl border border-warning/20 bg-warning/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-warning" />
            <p className="text-sm font-semibold text-gray-800">
              {t('Needs your approval', 'بحاجة إلى موافقتك', language)}
              <span className="ms-2 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-bold text-warning">{pendingQueue.length}</span>
            </p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {pendingQueue.slice(0, 8).map((e) => {
              const Icon = categoryIcon(e.category);
              return (
                <div key={e.id} className="flex w-64 shrink-0 items-center gap-3 rounded-xl bg-white p-3 shadow-card">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{formatCurrency(e.amount)}</p>
                    <p className="truncate text-xs text-gray-400">{categoryDisplay(e.category)} · {formatDate(e.date, language)}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => handleStatus(e.id, 'approved')}
                      disabled={actingId === e.id}
                      className="rounded-lg bg-success/10 p-1.5 text-success transition-colors hover:bg-success/20 disabled:opacity-50"
                      title={t('Approve', 'موافقة', language)}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatus(e.id, 'rejected')}
                      disabled={actingId === e.id}
                      className="rounded-lg bg-error/10 p-1.5 text-error transition-colors hover:bg-error/20 disabled:opacity-50"
                      title={t('Reject', 'رفض', language)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* ============================ list ============================ */}
        <div className="min-w-0 xl:col-span-2">
          <div className="rounded-2xl bg-white shadow-card">
            {/* toolbar */}
            <div className="space-y-3 border-b border-gray-100 p-4">
              <Toolbar className="gap-2">
                <ToolbarSegments
                  value={statusTab}
                  onChange={setStatusTab}
                  options={statusTabs.map((tab) => ({ value: tab.value, label: tab.label, count: statusCounts[tab.value] ?? 0 }))}
                />
                <ToolbarSpacer />
                <button
                  type="button"
                  onClick={() => setShowFilters((s) => !s)}
                  className={`relative rounded-md p-2 transition-colors ${showFilters || activeFilterCount > 0 ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:bg-gray-100'}`}
                  title={t('More filters', 'مزيد من الفلاتر', language)}
                >
                  <Filter className="h-4 w-4" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -end-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </Toolbar>

              {showFilters && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-500">{t('Category', 'التصنيف', language)}</label>
                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={selectCls}>
                      <option value="">{t('All categories', 'كل التصنيفات', language)}</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>{language === 'ar' ? c.nameAr : c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-500">{t('From', 'من', language)}</label>
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={selectCls} />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-500">{t('To', 'إلى', language)}</label>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={selectCls} />
                  </div>
                </div>
              )}
            </div>

            {/* rows */}
            {loading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
                      <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
                    </div>
                    <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
                  </div>
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="mb-3 rounded-full bg-gray-100 p-4">
                  <ReceiptText className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700">
                  {search || statusTab || activeFilterCount > 0
                    ? t('No expenses match your filters', 'لا توجد مصروفات مطابقة للفلاتر', language)
                    : t('No expenses yet', 'لا توجد مصروفات بعد', language)}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {t('Record your first expense to get started.', 'سجّل أول مصروف للبدء.', language)}
                </p>
                <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  {t('New Expense', 'مصروف جديد', language)}
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {visible.map((e) => {
                  const Icon = categoryIcon(e.category);
                  const meta = statusMeta[e.status];
                  return (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(e.id)}
                        className="group flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-gray-50/70"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary transition-colors group-hover:bg-primary/10">
                          <Icon className="h-[18px] w-[18px]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-gray-900">{categoryDisplay(e.category)}</span>
                            <span className={`hidden shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline-flex ${meta.chip}`}>
                              <span className={`h-1 w-1 rounded-full ${meta.dot}`} />
                              {language === 'ar' ? meta.ar : meta.en}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-gray-400">
                            {e.description}
                            {e.vendor ? ` · ${e.vendor}` : ''}
                          </span>
                        </span>
                        <span className="shrink-0 text-end">
                          <span className="block text-sm font-bold text-gray-900">{formatCurrency(e.amount)}</span>
                          <span className="block text-[11px] text-gray-400">{formatDate(e.date, language)}</span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* footer summary */}
            {!loading && visible.length > 0 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5 text-xs text-gray-400">
                <span>{visible.length} {t('expenses', 'مصروف', language)}</span>
                <span className="font-semibold text-gray-600">{formatCurrency(visibleTotal)}</span>
              </div>
            )}
          </div>
        </div>

        {/* ========================== insights ========================== */}
        <div className="space-y-5">
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-gray-800">{t('Spend by Category', 'الإنفاق حسب التصنيف', language)}</h2>
            </div>
            {byCategory.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-400">{t('No data for the current filters', 'لا توجد بيانات للفلاتر الحالية', language)}</p>
            ) : (
              <>
                <Chart
                  type="donut"
                  series={byCategory.slice(0, 6).map((c) => c.amount)}
                  labels={byCategory.slice(0, 6).map((c) => categoryDisplay(c.name))}
                  height={200}
                  showLegend={false}
                  dir={dir}
                />
                <ul className="mt-4 space-y-2.5">
                  {byCategory.slice(0, 5).map((c) => {
                    const Icon = categoryIcon(c.name);
                    const pct = visibleTotal > 0 ? Math.round((c.amount / visibleTotal) * 100) : 0;
                    return (
                      <li key={c.name} className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-xs font-medium text-gray-700">{categoryDisplay(c.name)}</span>
                            <span className="shrink-0 text-xs font-semibold text-gray-900">{formatCurrency(c.amount)}</span>
                          </div>
                          <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ========================= detail drawer ========================= */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/30" dir={dir} onClick={() => setSelectedId(null)}>
          <div
            className="flex h-full w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl animate-slide-in"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
              {(() => { const Icon = categoryIcon(selected.category); return (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
              ); })()}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{categoryDisplay(selected.category)}</p>
                <p className="text-xs text-gray-400">{formatDate(selected.date, language)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label={t('Close', 'إغلاق', language)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="rounded-2xl bg-gray-50 p-5 text-center">
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(selected.amount)}</p>
                <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta[selected.status].chip}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusMeta[selected.status].dot}`} />
                  {language === 'ar' ? statusMeta[selected.status].ar : statusMeta[selected.status].en}
                </span>
              </div>

              <dl className="mt-5 space-y-3">
                {[
                  { icon: StickyNote, label: t('Description', 'الوصف', language), value: selected.description },
                  { icon: CalendarDays, label: t('Date', 'التاريخ', language), value: formatDate(selected.date, language) },
                  { icon: CreditCard, label: t('Payment Method', 'طريقة الدفع', language), value: getPaymentMethodLabel(selected.paymentMethod, language) },
                  ...(selected.vendor ? [{ icon: Building2, label: t('Vendor', 'المورد', language), value: selected.vendor }] : []),
                  ...(selected.receiptNumber ? [{ icon: Hash, label: t('Receipt #', 'رقم الإيصال', language), value: selected.receiptNumber }] : []),
                  ...(selected.reimbursedAt ? [{ icon: Banknote, label: t('Reimbursed on', 'تاريخ الاسترداد', language), value: formatDate(selected.reimbursedAt, language) }] : []),
                  ...(selected.notes ? [{ icon: StickyNote, label: t('Notes', 'ملاحظات', language), value: selected.notes }] : []),
                ].map((row, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-gray-100 p-3">
                    <row.icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                    <div className="min-w-0">
                      <dt className="text-[11px] uppercase tracking-wide text-gray-400">{row.label}</dt>
                      <dd className="mt-0.5 break-words text-sm text-gray-800">{row.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 px-5 py-4">
              {canApprove && selected.status === 'pending' && (
                <>
                  <Button onClick={() => handleStatus(selected.id, 'approved')} loading={actingId === selected.id}>
                    <Check className="h-4 w-4" />
                    {t('Approve', 'موافقة', language)}
                  </Button>
                  <Button variant="danger" onClick={() => handleStatus(selected.id, 'rejected')} loading={actingId === selected.id}>
                    <X className="h-4 w-4" />
                    {t('Reject', 'رفض', language)}
                  </Button>
                </>
              )}
              {canApprove && selected.status === 'approved' && (
                <Button onClick={() => handleStatus(selected.id, 'reimbursed')} loading={actingId === selected.id}>
                  <Banknote className="h-4 w-4" />
                  {t('Mark Reimbursed', 'تحديد كمسترد', language)}
                </Button>
              )}
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => { setSelectedId(null); openEdit(selected); }}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary"
                title={t('Edit', 'تعديل', language)}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(selected.id)}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-error/10 hover:text-error"
                title={t('Delete', 'حذف', language)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================== form modal =========================== */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/30 p-0 sm:items-center sm:p-6" dir={dir}>
          <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3.5">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${editing ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'}`}>
                <ReceiptText className="h-4 w-4" />
              </span>
              <h2 className="flex-1 text-base font-semibold text-gray-900">
                {t(editing ? 'Edit Expense' : 'New Expense', editing ? 'تعديل المصروف' : 'مصروف جديد', language)}
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label={t('Close', 'إغلاق', language)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t('Amount (SAR)', 'المبلغ (ريال)', language)}
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                />
                <Input
                  label={t('Date', 'التاريخ', language)}
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>

              {/* category picker — real categories with icons */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">{t('Category', 'التصنيف', language)}</label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {categories.map((c) => {
                    const name = language === 'ar' ? c.nameAr : c.name;
                    const active = form.category === c.name || form.category === c.nameAr;
                    const Icon = categoryIcon(c.name);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setForm({ ...form, category: c.name })}
                        className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center transition-colors ${
                          active ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="w-full truncate text-[10px] font-medium leading-tight">{name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">{t('Description', 'الوصف', language)}</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder={t('What was this expense for?', 'ما الغرض من هذا المصروف؟', language)}
                  className="block w-full rounded-md border-0 bg-gray-100 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">{t('Payment Method', 'طريقة الدفع', language)}</label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as PaymentMethod })}
                    className={selectCls}
                  >
                    {paymentMethods.map((m) => (
                      <option key={m.value} value={m.value}>{language === 'ar' ? m.ar : m.en}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label={t('Vendor (optional)', 'المورد (اختياري)', language)}
                  value={form.vendor}
                  onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t('Receipt # (optional)', 'رقم الإيصال (اختياري)', language)}
                  value={form.receiptNumber}
                  onChange={(e) => setForm({ ...form, receiptNumber: e.target.value })}
                />
                <Input
                  label={t('Notes (optional)', 'ملاحظات (اختياري)', language)}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3.5">
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                {t('Cancel', 'إلغاء', language)}
              </Button>
              <Button onClick={handleSave} loading={saving}>
                {t(editing ? 'Save Changes' : 'Submit Expense', editing ? 'حفظ التغييرات' : 'تقديم المصروف', language)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
