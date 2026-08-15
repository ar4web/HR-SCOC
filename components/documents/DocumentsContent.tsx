'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { documentService } from '@/modules/document-management/service';
import { ModuleSettingsMenu } from '@/components/module-settings/ModuleSettingsMenu';
import { HRDocument, DocumentCategory } from '@/types';
import { t, formatDate, daysUntil } from '@/lib/utils';
import { downloadCsv } from '@/lib/csv';
import {
  FileText,
  Trash2,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Upload,
  Send,
  Pencil,
  Download,
  LayoutList,
  LayoutGrid,
  Columns3,
  Eye,
  X,
} from 'lucide-react';

const categories: { value: DocumentCategory; en: string; ar: string }[] = [
  { value: 'contract', en: 'Contract', ar: 'عقد' },
  { value: 'id_iqama', en: 'ID / Iqama', ar: 'هوية / إقامة' },
  { value: 'passport', en: 'Passport', ar: 'جواز سفر' },
  { value: 'visa', en: 'Visa', ar: 'تأشيرة' },
  { value: 'certificate', en: 'Certificate', ar: 'شهادة' },
  { value: 'insurance', en: 'Insurance', ar: 'تأمين' },
  { value: 'vehicle', en: 'Vehicle', ar: 'مركبة' },
  { value: 'real_estate', en: 'Real Estate', ar: 'عقار' },
  { value: 'license', en: 'License', ar: 'رخصة' },
  { value: 'other', en: 'Other', ar: 'أخرى' },
];

function categoryLabel(value: string, locale: 'en' | 'ar'): string {
  const c = categories.find((x) => x.value === value);
  if (!c) return value;
  return locale === 'ar' ? c.ar : c.en;
}

type DocViewMode = 'list' | 'grid' | 'viewer';
const VIEW_KEY = 'hrscoc-docs-view';

const VIEW_MODES: { key: DocViewMode; en: string; ar: string; icon: React.ReactNode }[] = [
  { key: 'list', en: 'List', ar: 'قائمة', icon: <LayoutList className="h-4 w-4" /> },
  { key: 'grid', en: 'Grid', ar: 'شبكة', icon: <LayoutGrid className="h-4 w-4" /> },
  { key: 'viewer', en: 'List + Viewer', ar: 'قائمة + عارض', icon: <Columns3 className="h-4 w-4" /> },
];

interface DocSize { w: number; h: number; shape: 'card' | 'passport' | 'a4'; en: string; ar: string }
const DOC_SIZES: Record<string, DocSize> = {
  id_iqama: { w: 85.6, h: 54, shape: 'card', en: 'ID / Iqama card (ATM size)', ar: 'بطاقة هوية / إقامة (حجم بطاقة الصراف)' },
  passport: { w: 125, h: 88, shape: 'passport', en: 'Passport size', ar: 'حجم جواز السفر' },
  visa: { w: 125, h: 88, shape: 'passport', en: 'Passport size (visa page)', ar: 'حجم جواز السفر (صفحة التأشيرة)' },
};
const A4_SIZE: DocSize = { w: 210, h: 297, shape: 'a4', en: 'A4 (210 × 297 mm)', ar: 'A4 (210 × 297 مم)' };
const sizeFor = (category: string): DocSize => DOC_SIZES[category] || A4_SIZE;

export function DocumentsContent() {
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const [docs, setDocs] = React.useState<HRDocument[]>([]);
  const [alerts, setAlerts] = React.useState<{ expired: HRDocument[]; expiringSoon: HRDocument[]; total: number }>({ expired: [], expiringSoon: [], total: 0 });
  const [loading, setLoading] = React.useState(true);
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [view, setView] = React.useState<DocViewMode>('list');
  const [selected, setSelected] = React.useState<HRDocument | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState<HRDocument | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [sendingReminder, setSendingReminder] = React.useState(false);
  const [form, setForm] = React.useState({
    name: '',
    nameAr: '',
    category: 'contract' as DocumentCategory,
    description: '',
    expiryDate: '',
    remindDaysBefore: 30,
    owner: '',
    department: '',
  });

  const load = React.useCallback(async (category = categoryFilter, status = statusFilter, q = search) => {
    setLoading(true);
    const [listRes, alertsRes] = await Promise.all([
      documentService.getDocuments({ category: category || undefined, status: status || undefined, search: q || undefined }),
      documentService.getAlerts(),
    ]);
    if (listRes.success && listRes.data) setDocs(listRes.data.data);
    if (alertsRes.success && alertsRes.data) setAlerts(alertsRes.data);
    setLoading(false);
  }, [categoryFilter, statusFilter, search]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === 'list' || saved === 'grid' || saved === 'viewer') setView(saved);
    } catch {}
  }, []);

  React.useEffect(() => {
    try { localStorage.setItem(VIEW_KEY, view); } catch {}
  }, [view]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      nameAr: '',
      category: 'contract',
      description: '',
      expiryDate: '',
      remindDaysBefore: 30,
      owner: '',
      department: '',
    });
    setShowForm(true);
  };

  const openEdit = (doc: HRDocument) => {
    setEditing(doc);
    setForm({
      name: doc.name,
      nameAr: doc.nameAr || '',
      category: doc.category,
      description: doc.description || '',
      expiryDate: doc.expiryDate || '',
      remindDaysBefore: doc.remindDaysBefore,
      owner: doc.owner || '',
      department: doc.department || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      addToast({ type: 'error', title: t('Document name is required', 'اسم المستند مطلوب', language) });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        nameAr: form.nameAr.trim() || undefined,
        category: form.category,
        description: form.description.trim() || undefined,
        expiryDate: form.expiryDate || undefined,
        remindDaysBefore: form.remindDaysBefore,
        owner: form.owner.trim() || undefined,
        department: form.department.trim() || undefined,
        uploadedBy: user?.name || 'HR Admin',
        uploadedAt: new Date().toISOString(),
      };
      const res = editing
        ? await documentService.updateDocument(editing.id, payload)
        : await documentService.createDocument(payload);
      if (res.success && res.data) {
        addToast({
          type: 'success',
          title: t(editing ? 'Document updated' : 'Document added', editing ? 'تم تحديث المستند' : 'تمت إضافة المستند', language),
        });
        setShowForm(false);
        load(categoryFilter, statusFilter, search);
      } else {
        addToast({ type: 'error', title: res.error || t('Failed to save document', 'فشل حفظ المستند', language) });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await documentService.deleteDocument(id);
    if (res.success) {
      addToast({ type: 'success', title: t('Document deleted', 'تم حذف المستند', language) });
      load(categoryFilter, statusFilter, search);
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to delete document', 'فشل حذف المستند', language) });
    }
  };

  const handleSendReminders = async () => {
    setSendingReminder(true);
    try {
      const res = await documentService.sendReminders();
      if (res.success && res.data) {
        const sent = res.data.sent;
        addToast({
          type: 'success',
          title: t(`Reminders sent (${sent})`, `تم إرسال التذكيرات (${sent})`, language),
        });
      } else {
        addToast({ type: 'error', title: res.error || t('Failed to send reminders', 'فشل إرسال التذكيرات', language) });
      }
    } finally {
      setSendingReminder(false);
    }
  };

  const renderHealthBadge = (doc: HRDocument) => {
    const days = daysUntil(doc.expiryDate);
    if (days === null) return null;
    if (days < 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEE2E2] text-[#991B1B]">
          <AlertTriangle className="h-3 w-3 me-1" />
          {t(`Expired`, 'منتهي', language)}
        </span>
      );
    }
    if (days <= doc.remindDaysBefore) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFEDD5] text-[#9A3412]">
          <Clock className="h-3 w-3 me-1" />
          {t(`${days}d left`, `بقي ${days} يوم`, language)}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#166534]">
        <CheckCircle2 className="h-3 w-3 me-1" />
        {t(`${days} days`, `بقي ${days} يوم`, language)}
      </span>
    );
  };

  const renderActionButtons = (doc: HRDocument) => (
    <>
      <button
        onClick={() => openEdit(doc)}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg p-2 text-gray-400 hover:text-primary hover:bg-gray-100 md:flex-none"
        title={t('Edit', 'تعديل', language)}
      >
        <Pencil className="h-4 w-4" />
        <span className="text-xs font-medium md:hidden">{t('Edit', 'تعديل', language)}</span>
      </button>
      <button
        onClick={() => handleDelete(doc.id)}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg p-2 text-gray-400 hover:text-error hover:bg-error/10 md:flex-none"
        title={t('Delete', 'حذف', language)}
      >
        <Trash2 className="h-4 w-4" />
        <span className="text-xs font-medium md:hidden">{t('Delete', 'حذف', language)}</span>
      </button>
    </>
  );

  const renderSheet = (doc: HRDocument) => {
    const size = sizeFor(doc.category);
    const maxW = 340;
    const maxH = 440;
    const scale = Math.min(maxW / size.w, maxH / size.h);
    const W = Math.round(size.w * scale);
    const H = Math.round(size.h * scale);
    const days = daysUntil(doc.expiryDate);
    const healthText =
      days === null
        ? t('No expiry', 'بدون انتهاء', language)
        : days < 0
          ? t('Expired', 'منتهي', language)
          : days <= doc.remindDaysBefore
            ? t(`${days} days left`, `بقي ${days} يوم`, language)
            : t(`Valid - ${days} days`, `ساري - ${days} يوم`, language);
    const name = language === 'ar' && doc.nameAr ? doc.nameAr : doc.name;
    if (size.shape === 'card') {
      return (
        <div
          className="mx-auto rounded-xl bg-white shadow-lg border border-gray-200 px-4 py-3 flex flex-col justify-between overflow-hidden"
          style={{ width: W, height: H }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center">
                <FileText className="h-3 w-3 text-primary" />
              </div>
              <span className="text-[10px] font-bold text-gray-800 uppercase tracking-wide">SCOS HR</span>
            </div>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-500 uppercase">
              {categoryLabel(doc.category, language)}
            </span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-gray-900">{name}</p>
            <p className="truncate text-[10px] text-gray-500">{doc.owner || t('Employee', 'موظف', language)}</p>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[8px] uppercase tracking-wide text-gray-400">{t('Expires', 'ينتهي', language)}</p>
              <p className={`text-[10px] font-semibold ${days !== null && days < 0 ? 'text-error' : 'text-gray-800'}`}>
                {doc.expiryDate ? formatDate(doc.expiryDate, language) : '—'}
              </p>
            </div>
            <div className="flex gap-0.5">
              <div className="h-6 w-1 rounded bg-gray-800/10" />
              <div className="h-6 w-1 rounded bg-gray-800/10" />
              <div className="h-6 w-1 rounded bg-gray-800/10" />
            </div>
          </div>
        </div>
      );
    }

    if (size.shape === 'passport') {
      return (
        <div
          className="mx-auto overflow-hidden rounded-lg bg-white shadow-lg border border-gray-300 flex flex-col justify-between"
          style={{ width: W, height: H }}
        >
          <div className="flex-1 p-2">
            <div className="flex items-center justify-between border-b border-dotted border-gray-300 pb-1.5">
              <span className="text-[10px] font-bold text-gray-800 uppercase tracking-wide">SCOS HR — Passport</span>
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-500 uppercase">
                {categoryLabel(doc.category, language)}
              </span>
            </div>
            <div className="mt-2 space-y-1.5">
              <p className="truncate text-xs font-semibold text-gray-900">{name}</p>
              <p className="truncate text-[10px] text-gray-500">{doc.owner || t('Employee', 'موظف', language)} • {doc.department || ''}</p>
              <p className="text-[10px] text-gray-600">
                <span className="text-gray-400">{t('Expires', 'ينتهي', language)}:</span>{' '}
                {doc.expiryDate ? formatDate(doc.expiryDate, language) : '—'} • {healthText}
              </p>
            </div>
          </div>
          <div className="bg-primary px-2 py-1">
            <p className="truncate text-[10px] font-semibold text-white">SCOS • {name}</p>
          </div>
        </div>
      );
    }

    return (
      <div
        className="mx-auto overflow-hidden rounded-sm bg-white shadow-xl border border-gray-200 flex flex-col"
        style={{ width: W, height: H }}
      >
        <div className="flex items-center justify-between border-b-2 border-primary/60 px-4 py-3">
          <div>
            <p className="text-[11px] font-bold text-gray-900">SCOS — {categoryLabel(doc.category, language)}</p>
            <p className="text-[9px] text-gray-400">{size.en}</p>
          </div>
          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className="flex-1 px-4 py-2.5 space-y-2">
          <p className="text-sm font-bold text-gray-900">{name}</p>
          <p className="text-[10px] text-gray-500">{doc.description || t('No description provided', 'لا يوجد وصف', language)}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
            <div>
              <p className="text-[8px] uppercase tracking-wide text-gray-400">{t('Owner', 'المالك', language)}</p>
              <p className="text-[10px] font-medium text-gray-700">{doc.owner || '—'}</p>
            </div>
            <div>
              <p className="text-[8px] uppercase tracking-wide text-gray-400">{t('Department', 'القسم', language)}</p>
              <p className="text-[10px] font-medium text-gray-700">{doc.department || '—'}</p>
            </div>
            <div>
              <p className="text-[8px] uppercase tracking-wide text-gray-400">{t('Expires', 'ينتهي', language)}</p>
              <p className={`text-[10px] font-semibold ${days !== null && days < 0 ? 'text-error' : 'text-gray-700'}`}>
                {doc.expiryDate ? formatDate(doc.expiryDate, language) : '—'}
              </p>
            </div>
            <div>
              <p className="text-[8px] uppercase tracking-wide text-gray-400">{t('Status', 'الحالة', language)}</p>
              <p className={`text-[10px] font-semibold ${days !== null && days < 0 ? 'text-error' : days !== null && days <= doc.remindDaysBefore ? 'text-warning' : 'text-success'}`}>
                {healthText}
              </p>
            </div>
          </div>
          <div className="pt-0.5 space-y-1">
            <div className="h-1.5 rounded bg-gray-100" />
            <div className="h-1.5 rounded bg-gray-100" />
            <div className="h-1.5 rounded bg-gray-100 w-3/4" />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2">
          <p className="text-[9px] text-gray-400">
            {t('Authorized document copy', 'نسخة مستند معتمدة', language)} • {doc.uploadedBy}
          </p>
          <p className="text-[9px] text-gray-400">{formatDate(doc.uploadedAt, language)}</p>
        </div>
      </div>
    );
  };

  const matchesFilters = (d: HRDocument) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      d.name.toLowerCase().includes(q) ||
      (d.nameAr || '').toLowerCase().includes(q) ||
      (d.owner || '').toLowerCase().includes(q);
    const matchCategory = !categoryFilter || d.category === categoryFilter;
    return matchSearch && matchCategory;
  };

  const shown = statusFilter === 'expired'
    ? alerts.expired.filter(matchesFilters)
    : statusFilter === 'expiring_soon'
      ? alerts.expiringSoon.filter(matchesFilters)
      : docs.filter(matchesFilters);

  const exportCsv = () => {
    downloadCsv(
      shown.map((d) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        description: d.description || '',
        owner: d.owner || '',
        department: d.department || '',
        expiryDate: d.expiryDate || '',
      })),
      `documents-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('Document Management', 'إدارة المستندات', language)}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('Track document expiry dates and receive renewal reminders', 'تتبع تواريخ انتهاء المستندات واستقبل تذكيرات التجديد', language)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSendReminders} loading={sendingReminder} title={t('Send Reminders', 'إرسال التذكيرات', language)} aria-label={t('Send Reminders', 'إرسال التذكيرات', language)}>
            <Send className="h-4 w-4" />
          </Button>
          <Button variant="ghost" onClick={exportCsv} title={'CSV'} aria-label={'CSV'}>
            <Download className="h-4 w-4" />
          </Button>
          <ModuleSettingsMenu module={t('Documents', 'المستندات', language)} onExport={exportCsv} />
          <Button onClick={openCreate} title={t('Upload Document', 'رفع مستند', language)} aria-label={t('Upload Document', 'رفع مستند', language)}>
            <Upload className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {(alerts.expired.length > 0 || alerts.expiringSoon.length > 0) && (
        <div className={`rounded-xl border p-4 flex items-start gap-3 ${
          alerts.expired.length > 0 ? 'border-error/30 bg-error/5' : 'border-warning/30 bg-warning/5'
        }`}>
          <AlertTriangle className={`h-5 w-5 mt-0.5 ${alerts.expired.length > 0 ? 'text-error' : 'text-warning'}`} />
          <div>
            <p className={`font-semibold text-sm ${alerts.expired.length > 0 ? 'text-error' : 'text-warning'}`}>
              {alerts.expired.length > 0
                ? t(`${alerts.expired.length} document(s) expired`, `${alerts.expired.length} مستندات منتهية`, language)
                : t(`${alerts.expiringSoon.length} document(s) expiring soon`, `${alerts.expiringSoon.length} مستندات تنتهي قريباً`, language)}
            </p>
            <p className="text-sm text-gray-600 mt-0.5">
              {t('Renew them as soon as possible to avoid penalties.', 'جددها في أقرب وقت لتجنب الغرامات.', language)}
            </p>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => setStatusFilter('expired')}
            className={`text-sm font-medium ${alerts.expired.length > 0 ? 'text-error' : 'text-warning'} hover:underline`}
          >
            {t('View', 'عرض', language)}
          </button>
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader className="flex items-center gap-3">
            <Upload className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">
              {t(editing ? 'Edit Document' : 'Add Document', editing ? 'تعديل مستند' : 'إضافة مستند', language)}
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={t('Name (English)', 'الاسم (إنجليزي)', language)}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('e.g. Company CR Renewal', 'مثال: تجديد سجل تجاري', language)}
              />
              <Input
                label={t('Name (Arabic)', 'الاسم (عربي)', language)}
                value={form.nameAr}
                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                placeholder={t('Optional', 'اختياري', language)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">{t('Category', 'التصنيف', language)}</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as DocumentCategory })}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {language === 'ar' ? c.ar : c.en}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label={t('Expiry Date', 'تاريخ الانتهاء', language)}
                type="date"
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={t('Remind Me (days before)', 'تذكيري (أيام قبل)', language)}
                type="number"
                min={0}
                max={365}
                value={String(form.remindDaysBefore)}
                onChange={(e) => setForm({ ...form, remindDaysBefore: Number(e.target.value) || 0 })}
              />
              <Input
                label={t('Owner', 'المالك', language)}
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
                placeholder={t('Department / Person', 'القسم / الشخص', language)}
              />
            </div>
            <Input
              label={t('Description', 'الوصف', language)}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t('Optional notes...', 'ملاحظات اختيارية...', language)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                {t('Cancel', 'إلغاء', language)}
              </Button>
              <Button onClick={handleSave} loading={saving}>
                {t(editing ? 'Save Changes' : 'Add', editing ? 'حفظ التغييرات' : 'إضافة', language)}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader className="flex items-center gap-3 flex-wrap">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{t('Documents', 'المستندات', language)}</h2>
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
            {VIEW_MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => setView(m.key)}
                title={t(m.en, m.ar, language)}
                aria-label={t(m.en, m.ar, language)}
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                  view === m.key ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {m.icon}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 rtl:left-auto rtl:right-3 top-2.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                load(categoryFilter, statusFilter, e.target.value);
              }}
              placeholder={t('Search documents...', 'ابحث عن مستندات...', language)}
              className="block w-full sm:w-56 rounded-lg border border-gray-300 pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              load(categoryFilter, e.target.value, search);
            }}
            className="block rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">{t('All Statuses', 'كل الحالات', language)}</option>
            <option value="valid">{t('Valid', 'ساري', language)}</option>
            <option value="expiring_soon">{t('Expiring Soon', 'تنتهي قريباً', language)}</option>
            <option value="expired">{t('Expired', 'منتهي', language)}</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              load(e.target.value, statusFilter, search);
            }}
            className="block rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">{t('All Categories', 'كل التصنيفات', language)}</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {language === 'ar' ? c.ar : c.en}
              </option>
            ))}
          </select>
        </CardHeader>
        <CardBody>
          {loading ? (
            <TableSkeleton rows={5} cols={4} />
          ) : shown.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              {t('No documents found.', 'لا توجد مستندات.', language)}
            </p>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-1 gap-4 p-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {shown.map((doc) => {
                const days = daysUntil(doc.expiryDate);
                return (
                  <div
                    key={doc.id}
                    onClick={() => { setView('viewer'); setSelected(doc); }}
                    className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-10 w-10 shrink-0 rounded-lg flex items-center justify-center ${days !== null && days < 0 ? 'bg-error/10 text-error' : days !== null && days <= doc.remindDaysBefore ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'}`}>
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{language === 'ar' && doc.nameAr ? doc.nameAr : doc.name}</p>
                          <p className="text-xs text-gray-400">
                            {sizeFor(doc.category).en} • {categoryLabel(doc.category, language)}
                          </p>
                        </div>
                      </div>
                      {renderHealthBadge(doc)}
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-gray-500">
                      {doc.expiryDate && (
                        <p><span className="font-medium text-gray-700">{t('Expires', 'ينتهي', language)}:</span> {formatDate(doc.expiryDate, language)}</p>
                      )}
                      {doc.owner && (
                        <p><span className="font-medium text-gray-700">{t('Owner', 'المالك', language)}:</span> {doc.owner}</p>
                      )}
                      {doc.department && (
                        <p><span className="font-medium text-gray-700">{t('Department', 'القسم', language)}:</span> {doc.department}</p>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-50 pt-2 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                      <button onClick={(e) => { e.stopPropagation(); openEdit(doc); }} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-primary" title={t('Edit', 'تعديل', language)} aria-label={t('Edit', 'تعديل', language)}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }} className="rounded-lg p-2 text-gray-400 hover:bg-error/10 hover:text-error" title={t('Delete', 'حذف', language)} aria-label={t('Delete', 'حذف', language)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="flex-1 min-w-0 divide-y divide-gray-100 border-b border-gray-100">
                {shown.map((doc) => {
                const days = daysUntil(doc.expiryDate);
                const iconColor =
                  days !== null && days < 0
                    ? 'bg-error/10 text-error'
                    : days !== null && days <= doc.remindDaysBefore
                      ? 'bg-warning/10 text-warning'
                      : 'bg-primary/10 text-primary';
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelected(doc)}
                    className={`flex flex-col gap-3 px-4 py-3 transition-colors cursor-pointer md:grid md:grid-cols-[35fr_25fr_30fr_10fr] md:items-center md:gap-4 md:px-4 ${
                      selected?.id === doc.id ? 'bg-primary/5' : 'hover:bg-gray-50'
                    }`}
                  >
                    {view === 'viewer' && (
                      <span className="inline-flex md:hidden">
                        <Eye className="h-4 w-4 text-primary" />
                      </span>
                    )}
                    {/* Zone 1: Icon & Meta (35%) */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-10 w-10 shrink-0 rounded-lg flex items-center justify-center ${iconColor}`}>
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900" title={language === 'ar' && doc.nameAr ? doc.nameAr : doc.name}>
                          {language === 'ar' && doc.nameAr ? doc.nameAr : doc.name}
                        </p>
                        {doc.description && (
                          <p className="mt-0.5 text-xs text-gray-500 break-words whitespace-normal">
                            {doc.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Zone 2: Taxonomy & Badges (25%) */}
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary/5 text-secondary text-xs font-medium">
                        {categoryLabel(doc.category, language)}
                      </span>
                      {renderHealthBadge(doc)}
                    </div>

                    {/* Zone 3: Audit Data (30%) */}
                    <div className="text-xs text-gray-500 md:space-y-1 min-w-0">
                      {doc.expiryDate && (
                        <p className="truncate">
                          <span className="font-medium text-gray-700">{t('Expires', 'ينتهي', language)}:</span>{' '}
                          {formatDate(doc.expiryDate, language)}
                        </p>
                      )}
                      {doc.owner && (
                        <p className="truncate">
                          <span className="font-medium text-gray-700">{t('Owner', 'المالك', language)}:</span> {doc.owner}
                        </p>
                      )}
                      <p className="truncate">
                        <span className="font-medium text-gray-700">{t('Uploaded', 'مرفوع', language)}:</span>{' '}
                        {formatDate(doc.uploadedAt, language)}
                      </p>
                    </div>

                    {/* Zone 4: Actions (10%) — desktop right-aligned, mobile bottom row */}
                    <div className="flex items-center justify-end gap-1 md:justify-end min-w-0">
                      <div className="flex w-full gap-1 md:w-auto">
                        {renderActionButtons(doc)}
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
              {view === 'viewer' && (
                <div className="w-full lg:w-96 shrink-0">
                  <div className="sticky top-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                    {selected ? (
                      <>
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900">
                            {t('Document Preview', 'معاينة المستند', language)}
                          </p>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                            {sizeFor(selected.category).en}
                          </span>
                        </div>
                        <div className="rounded-lg bg-white/60 p-3">
                          {renderSheet(selected)}
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                          <span>
                            {t('Physical size', 'الحجم الفعلي', language)}: {sizeFor(selected.category).w} × {sizeFor(selected.category).h} mm
                          </span>
                          <button
                            onClick={() => setSelected(null)}
                            className="text-gray-400 hover:text-gray-600"
                            title={t('Clear', 'مسح', language)}
                            aria-label={t('Clear', 'مسح', language)}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                        <Eye className="h-8 w-8 text-gray-300" />
                        <p className="text-sm text-gray-400">
                          {t('Select a document to preview at its physical size', 'اختر مستنداً لمعاينته بحجمه الفعلي', language)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
