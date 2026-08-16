'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { t, formatDate, formatNumber } from '@/lib/utils';
import { contractsService } from '@/modules/contracts/service';
import { CONTRACT_TYPES } from '@/lib/contracts-engine';
import type { Contract, ContractStatus } from '@/types';
import { FileText, Plus, Trash2, Search, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';

const FILTERS: Array<{ value: ContractStatus | 'all'; en: string; ar: string }> = [
  { value: 'all', en: 'All', ar: 'الكل' },
  { value: 'active', en: 'Active', ar: 'نشط' },
  { value: 'expiring', en: 'Renewal window', ar: 'نافذة التجديد' },
  { value: 'expired', en: 'Expired', ar: 'منتهي' },
];

function statusBadge(status: ContractStatus): { cls: string; en: string; ar: string } {
  switch (status) {
    case 'active':
      return { cls: 'bg-success/10 text-success', en: 'Active', ar: 'نشط' };
    case 'expiring':
      return { cls: 'bg-warning/10 text-warning', en: 'Renewal', ar: 'تجديد' };
    case 'expired':
      return { cls: 'bg-error/10 text-error', en: 'Expired', ar: 'منتهي' };
  }
}

function typeLabel(value: string, locale: 'en' | 'ar'): string {
  const c = CONTRACT_TYPES.find((x) => x.value === value);
  if (!c) return value;
  return locale === 'ar' ? c.ar : c.en;
}

export function ContractsContent() {
  const { language } = useLanguageStore();
  const { addToast } = useToast();
  const [contracts, setContracts] = React.useState<Contract[]>([]);
  const [employees, setEmployees] = React.useState<Array<{ id: string; employeeId: string; fullName: string }>>([]);
  const [summary, setSummary] = React.useState<{ total: number; active: number; expiring: number; expired: number; totalValue: number }>({
    total: 0,
    active: 0,
    expiring: 0,
    expired: 0,
    totalValue: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<ContractStatus | 'all'>('all');
  const [search, setSearch] = React.useState('');
  const [showForm, setShowForm] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    contractType: 'employment',
    title: '',
    partyB: '',
    employeeId: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    renewalNoticeDays: '30',
    value: '',
    currency: 'SAR',
    notes: '',
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await contractsService.list({ status: filter === 'all' ? 'all' : filter, search: search || undefined });
    if (res.success && res.data) {
      setContracts(res.data.data);
      setSummary(res.data.summary);
      setEmployees(res.data.employees || []);
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to load contracts', 'فشل تحميل العقود', language) });
    }
    setLoading(false);
  }, [addToast, filter, language, search]);

  React.useEffect(() => {
    const debounce = setTimeout(() => load(), search ? 250 : 0);
    return () => clearTimeout(debounce);
  }, [load, search]);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.partyB.trim() || !form.endDate) {
      addToast({ type: 'error', title: t('Title, second party and end date are required', 'العنوان والطرف الثاني وتاريخ الانتهاء مطلوبة', language) });
      return;
    }
    setSaving(true);
    try {
      const res = await contractsService.create({
        contractType: form.contractType,
        title: form.title.trim(),
        partyB: form.partyB.trim(),
        employeeId: form.employeeId || undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        renewalNoticeDays: Number(form.renewalNoticeDays) || 30,
        value: Number(form.value) || 0,
        currency: form.currency || 'SAR',
        notes: form.notes.trim() || undefined,
      });
      if (res.success && res.data) {
        addToast({
          type: 'success',
          title: t('Contract created', 'تم إنشاء العقد', language),
          message: res.data.contractNo,
        });
        setShowForm(false);
        setForm({ ...form, title: '', partyB: '', value: '', notes: '', endDate: '' });
        load();
      } else {
        addToast({ type: 'error', title: res.error || t('Failed to create contract', 'فشل إنشاء العقد', language) });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await contractsService.remove(id);
    if (res.success) {
      addToast({ type: 'success', title: t('Contract deleted', 'تم حذف العقد', language) });
      load();
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to delete contract', 'فشل حذف العقد', language) });
    }
  };

  const stats = [
    { label: t('Active contracts', 'عقود نشطة', language), value: summary.active, cls: 'text-success', icon: CheckCircle2 },
    { label: t('In renewal window', 'في نافذة التجديد', language), value: summary.expiring, cls: 'text-warning', icon: Clock },
    { label: t('Expired', 'منتهية', language), value: summary.expired, cls: 'text-error', icon: XCircle },
    { label: t('Active value', 'قيمة النشطة', language), value: formatNumber(summary.totalValue), cls: 'text-accent', icon: AlertTriangle },
  ];

return (
    <div className="space-y-6">
      <PageHeader
        title={t('Contracts & Agreements', 'العقود والاتفاقيات', language)}
        subtitle={t('Employment contracts, service agreements and NDAs with expiry tracking', 'عقود العمل واتفاقيات الخدمة واتفاقيات عدم الإفصاح مع تتبع انتهاء الصلاحية', language)}
        actions={
          <Button
            onClick={() => setShowForm((s) => !s)}
            title={t('New Contract', 'عقد جديد', language)}
            aria-label={t('New Contract', 'عقد جديد', language)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-2">
              <s.icon className={`h-4 w-4 ${s.cls}`} />
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
            <div className={`mt-1.5 text-2xl font-bold leading-none ${s.cls}`}>{s.value}</div>
          </Card>
        ))}
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{t('New Contract', 'عقد جديد', language)}</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">{t('Type', 'النوع', language)}</label>
                <select
                  value={form.contractType}
                  onChange={(e) => setForm({ ...form, contractType: e.target.value })}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {CONTRACT_TYPES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {language === 'ar' ? c.ar : c.en}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">{t('Linked employee', 'موظف مرتبط', language)}</label>
                <select
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">{t('— none —', '— لا شيء —', language)}</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employeeId} · {emp.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('Title *', 'العنوان *', language)}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={t('e.g. Service Agreement — Phase II', 'مثال: اتفاقية خدمة — المرحلة الثانية', language)}
              />
              <Input
                label={t('Second party *', 'الطرف الثاني *', language)}
                value={form.partyB}
                onChange={(e) => setForm({ ...form, partyB: e.target.value })}
                placeholder={t('Company or person', 'شركة أو شخص', language)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Input
                label={t('Start date', 'تاريخ البدء', language)}
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
              <Input
                label={t('End date *', 'تاريخ الانتهاء *', language)}
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
              <Input
                label={t('Renewal notice (days)', 'مهلة التجديد (أيام)', language)}
                type="number"
                min={0}
                value={form.renewalNoticeDays}
                onChange={(e) => setForm({ ...form, renewalNoticeDays: e.target.value })}
              />
              <Input
                label={t('Contract value', 'قيمة العقد', language)}
                type="number"
                min={0}
                step="0.01"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <Input
              label={t('Notes', 'ملاحظات', language)}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                {t('Cancel', 'إلغاء', language)}
              </Button>
              <Button onClick={handleCreate} loading={saving}>
                {t('Create Contract', 'إنشاء العقد', language)}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader className="flex items-center flex-wrap gap-3">
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  filter === f.value
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-200 text-gray-500 hover:border-primary/40 hover:text-primary'
                }`}
              >
                {language === 'ar' ? f.ar : f.en}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 rtl:left-auto rtl:right-3 top-2.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('Search contracts...', 'ابحث عن عقود...', language)}
              className="block w-full sm:w-56 rounded-lg border border-gray-300 pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-6">
              <TableSkeleton rows={4} cols={5} />
            </div>
          ) : contracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-gray-100 p-4 mb-3">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">{t('No contracts yet', 'لا توجد عقود بعد', language)}</p>
              <p className="text-xs text-gray-400 mt-1">{t('Create your first contract to start tracking.', 'أنشئ أول عقد لبدء التتبع.', language)}</p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin" role="region" aria-label={t('Contracts table', 'جدول العقود', language)} tabIndex={0}>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-left rtl:text-right text-xs text-gray-400">
                    <th className="px-6 py-3 font-medium">{t('Contract', 'العقد', language)}</th>
                    <th className="px-6 py-3 font-medium">{t('Type', 'النوع', language)}</th>
                    <th className="px-6 py-3 font-medium">{t('Second party', 'الطرف الثاني', language)}</th>
                    <th className="px-6 py-3 font-medium">{t('Term', 'المدة', language)}</th>
                    <th className="px-6 py-3 font-medium text-end">{t('Value', 'القيمة', language)}</th>
                    <th className="px-6 py-3 font-medium">{t('Status', 'الحالة', language)}</th>
                    <th className="px-6 py-3 font-medium text-end">{t('Actions', 'الإجراءات', language)}</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c) => {
                    const badge = statusBadge(c.status);
                    return (
                      <tr key={c.id} className="border-b border-gray-50 last:border-0" title={c.notes}>
                        <td className="px-6 py-3">
                          <div className="font-mono text-xs font-semibold text-primary">{c.contractNo}</div>
                          <div className="max-w-60 truncate text-sm font-semibold text-gray-700">{c.title}</div>
                        </td>
                        <td className="px-6 py-3">
                          <span className="inline-flex items-center rounded-full bg-secondary/5 px-2.5 py-0.5 text-xs font-medium text-secondary">
                            {typeLabel(c.contractType, language)}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="text-sm text-gray-700">{c.partyB}</div>
                          {c.employeeName && (
                            <div className="font-mono text-[10.5px] text-gray-400">employee: {c.employeeName}</div>
                          )}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap font-mono text-[11.5px] text-gray-500">
                          {formatDate(c.startDate, language)} → {formatDate(c.endDate, language)}
                        </td>
                        <td className="px-6 py-3 text-end text-sm text-gray-700">
                          {c.value > 0 ? formatNumber(c.value) : '—'}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>
                            {language === 'ar' ? badge.ar : badge.en}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-end whitespace-nowrap">
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="p-2 rounded-lg text-gray-400 hover:text-error hover:bg-error/10 transition-colors"
                            title={t('Delete', 'حذف', language)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
    </div>
  );
}