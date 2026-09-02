'use client';

/**
 * Documents — full files manager with gallery.
 *
 * - Real file upload (drag & drop or browse) stored as base64 data URLs.
 * - Gallery view with live image thumbnails and file-type tiles.
 * - List view with compact rows and inline actions.
 * - Split view (list + docked viewer pane).
 * - Full-screen lightbox viewer with ←/→ navigation and keyboard support.
 * - Real rendering: images via <img>, PDFs & text via <iframe>, others via
 *   a download fallback. Download works for every file with content.
 * - Expiry health tracking (expired / expiring soon / valid) preserved.
 */

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { documentService } from '@/modules/document-management/service';
import { ModuleSettingsMenu } from '@/components/module-settings/ModuleSettingsMenu';
import { hasPermission } from '@/lib/rbac';
import { HRDocument, DocumentCategory } from '@/types';
import { t, formatDate, daysUntil } from '@/lib/utils';
import { downloadCsv } from '@/lib/csv';
import PageHeader, { HeaderAction } from '@/components/layout/PageHeader';
import { Toolbar, ToolbarSegments, ToolbarChips, ToolbarSpacer, ToolbarCount } from '@/components/layout/Toolbar';
import { usePageSearch } from '@/stores/search-store';
import {
  FileText,
  FolderOpen,
  RefreshCw,
  Trash2,
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
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  File,
  FileType2,
  Maximize2,
  CloudUpload,
  Paperclip,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* constants & helpers                                                 */
/* ------------------------------------------------------------------ */

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

type DocViewMode = 'gallery' | 'list' | 'split';
const VIEW_KEY = 'hrscoc-docs-view';

type FileKind = 'image' | 'pdf' | 'text' | 'other' | 'none';

function fileKind(doc: HRDocument): FileKind {
  if (!doc.fileData) return 'none';
  const m = doc.mimeType || '';
  if (m.startsWith('image/')) return 'image';
  if (m === 'application/pdf') return 'pdf';
  if (m.startsWith('text/')) return 'text';
  return 'other';
}

function formatSize(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB — JSON store guard

/* ------------------------------------------------------------------ */
/* thumbnail                                                           */
/* ------------------------------------------------------------------ */

function DocThumb({ doc, className = '' }: { doc: HRDocument; className?: string }) {
  const kind = fileKind(doc);
  if (kind === 'image') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={doc.fileData}
        alt={doc.name}
        className={`h-full w-full object-cover ${className}`}
        draggable={false}
      />
    );
  }
  const tile: Record<Exclude<FileKind, 'image'>, { icon: React.ReactNode; bg: string }> = {
    pdf: { icon: <FileType2 className="h-8 w-8 text-error/70" />, bg: 'bg-error/5' },
    text: { icon: <FileText className="h-8 w-8 text-primary/60" />, bg: 'bg-primary/5' },
    other: { icon: <File className="h-8 w-8 text-gray-400" />, bg: 'bg-gray-100' },
    none: { icon: <Paperclip className="h-7 w-7 text-gray-300" />, bg: 'bg-gray-50' },
  };
  const { icon, bg } = tile[kind];
  return (
    <div className={`flex h-full w-full flex-col items-center justify-center gap-1.5 ${bg} ${className}`}>
      {icon}
      <span className="max-w-[90%] truncate text-[10px] font-medium uppercase tracking-wide text-gray-400">
        {kind === 'none' ? '' : (doc.fileName || '').split('.').pop() || doc.mimeType}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* file preview (shared by split pane + lightbox)                      */
/* ------------------------------------------------------------------ */

function FilePreview({ doc, tall = false }: { doc: HRDocument; tall?: boolean }) {
  const { language } = useLanguageStore();
  const kind = fileKind(doc);
  const h = tall ? 'h-[70vh]' : 'h-80';

  if (kind === 'image') {
    return (
      <div className={`flex ${h} items-center justify-center overflow-hidden rounded-md bg-gray-900/[0.03]`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={doc.fileData} alt={doc.name} className="max-h-full max-w-full object-contain" draggable={false} />
      </div>
    );
  }
  if (kind === 'pdf' || kind === 'text') {
    return (
      <iframe
        src={doc.fileData}
        title={doc.name}
        className={`${h} w-full rounded-md bg-white`}
      />
    );
  }
  return (
    <div className={`flex ${h} flex-col items-center justify-center gap-3 rounded-md bg-gray-50`}>
      {kind === 'other' ? <File className="h-10 w-10 text-gray-300" /> : <Paperclip className="h-10 w-10 text-gray-300" />}
      <p className="text-sm text-gray-400">
        {kind === 'other'
          ? t('Preview not available for this file type', 'المعاينة غير متاحة لهذا النوع من الملفات', language)
          : t('No file attached to this document', 'لا يوجد ملف مرفق بهذا المستند', language)}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* main component                                                      */
/* ------------------------------------------------------------------ */

export function DocumentsContent() {
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const canManage = hasPermission(user?.role, 'employee:manage');

  const [docs, setDocs] = React.useState<HRDocument[]>([]);
  const [alerts, setAlerts] = React.useState<{ expired: HRDocument[]; expiringSoon: HRDocument[]; total: number }>({ expired: [], expiringSoon: [], total: 0 });
  const [loading, setLoading] = React.useState(true);
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const search = usePageSearch('/documents', 'Search documents…', 'ابحث عن مستندات…');
  const [view, setView] = React.useState<DocViewMode>('gallery');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [lightboxId, setLightboxId] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<HRDocument | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState<HRDocument | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [sendingReminder, setSendingReminder] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [form, setForm] = React.useState({
    name: '',
    nameAr: '',
    category: 'contract' as DocumentCategory,
    description: '',
    expiryDate: '',
    remindDaysBefore: 30,
    owner: '',
    department: '',
    fileName: '',
    fileSize: 0,
    mimeType: '',
    fileData: '',
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

  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === 'gallery' || saved === 'list' || saved === 'split') setView(saved);
      else if (saved === 'grid') setView('gallery');
      else if (saved === 'viewer') setView('split');
    } catch {}
  }, []);

  React.useEffect(() => {
    try { localStorage.setItem(VIEW_KEY, view); } catch {}
  }, [view]);

  /* ---------------- filtering ---------------- */

  const matchesFilters = React.useCallback((d: HRDocument) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      d.name.toLowerCase().includes(q) ||
      (d.nameAr || '').toLowerCase().includes(q) ||
      (d.fileName || '').toLowerCase().includes(q) ||
      (d.owner || '').toLowerCase().includes(q);
    const matchCategory = !categoryFilter || d.category === categoryFilter;
    return matchSearch && matchCategory;
  }, [search, categoryFilter]);

  const shown = React.useMemo(() => (
    statusFilter === 'expired'
      ? alerts.expired.filter(matchesFilters)
      : statusFilter === 'expiring_soon'
        ? alerts.expiringSoon.filter(matchesFilters)
        : docs.filter(matchesFilters)
  ), [statusFilter, alerts, docs, matchesFilters]);

  const selected = shown.find((d) => d.id === selectedId) || null;
  const lightboxIndex = shown.findIndex((d) => d.id === lightboxId);
  const lightboxDoc = lightboxIndex >= 0 ? shown[lightboxIndex] : null;

  /* ---------------- lightbox keyboard nav ---------------- */

  const stepLightbox = React.useCallback((dir: 1 | -1) => {
    if (lightboxIndex < 0 || shown.length === 0) return;
    const next = (lightboxIndex + dir + shown.length) % shown.length;
    setLightboxId(shown[next].id);
  }, [lightboxIndex, shown]);

  React.useEffect(() => {
    if (!lightboxDoc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxId(null);
      if (e.key === 'ArrowRight') stepLightbox(1);
      if (e.key === 'ArrowLeft') stepLightbox(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightboxDoc, stepLightbox]);

  /* ---------------- upload handling ---------------- */

  const attachFile = (file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      addToast({ type: 'error', title: t('File too large — 5 MB max', 'الملف كبير جداً — الحد الأقصى 5 ميجابايت', language) });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({
        ...f,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        fileData: String(reader.result || ''),
        name: f.name || file.name.replace(/\.[^.]+$/, ''),
      }));
    };
    reader.readAsDataURL(file);
  };

  const clearFile = () => setForm((f) => ({ ...f, fileName: '', fileSize: 0, mimeType: '', fileData: '' }));

  /* ---------------- CRUD ---------------- */

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', nameAr: '', category: 'contract', description: '', expiryDate: '', remindDaysBefore: 30, owner: '', department: '', fileName: '', fileSize: 0, mimeType: '', fileData: '' });
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
      fileName: doc.fileName || '',
      fileSize: doc.fileSize || 0,
      mimeType: doc.mimeType || '',
      fileData: doc.fileData || '',
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
      const payload: Partial<HRDocument> = {
        name: form.name.trim(),
        nameAr: form.nameAr.trim() || undefined,
        category: form.category,
        description: form.description.trim() || undefined,
        expiryDate: form.expiryDate || undefined,
        remindDaysBefore: form.remindDaysBefore,
        owner: form.owner.trim() || undefined,
        department: form.department.trim() || undefined,
        fileName: form.fileName || undefined,
        fileSize: form.fileSize || undefined,
        mimeType: form.mimeType || undefined,
        fileData: form.fileData || undefined,
        uploadedBy: user?.name || 'HR Admin',
        uploadedAt: new Date().toISOString(),
      };
      const res = editing
        ? await documentService.updateDocument(editing.id, payload)
        : await documentService.createDocument(payload);
      if (res.success && res.data) {
        addToast({
          type: 'success',
          title: t(editing ? 'Document updated' : 'Document uploaded', editing ? 'تم تحديث المستند' : 'تم رفع المستند', language),
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

  const handleDelete = async (doc: HRDocument) => {
    setConfirmDelete(null);
    setDeleting(true);
    const res = await documentService.deleteDocument(doc.id);
    setDeleting(false);
    if (res.success) {
      if (selectedId === doc.id) setSelectedId(null);
      if (lightboxId === doc.id) setLightboxId(null);
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
        addToast({ type: 'success', title: t(`Reminders sent (${res.data.sent})`, `تم إرسال التذكيرات (${res.data.sent})`, language) });
      } else {
        addToast({ type: 'error', title: res.error || t('Failed to send reminders', 'فشل إرسال التذكيرات', language) });
      }
    } finally {
      setSendingReminder(false);
    }
  };

  const handleDownload = (doc: HRDocument) => {
    if (!doc.fileData) {
      addToast({ type: 'error', title: t('No file attached', 'لا يوجد ملف مرفق', language) });
      return;
    }
    const a = document.createElement('a');
    a.href = doc.fileData;
    a.download = doc.fileName || doc.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const exportCsv = () => {
    downloadCsv(
      shown.map((d) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        fileName: d.fileName || '',
        fileSize: d.fileSize || '',
        mimeType: d.mimeType || '',
        owner: d.owner || '',
        department: d.department || '',
        expiryDate: d.expiryDate || '',
      })),
      `documents-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  /* ---------------- small render helpers ---------------- */

  const renderHealthBadge = (doc: HRDocument, compact = false) => {
    const days = daysUntil(doc.expiryDate);
    if (days === null) return null;
    if (days < 0) {
      return (
        <span className="inline-flex items-center rounded-full bg-error/10 px-2 py-0.5 text-[11px] font-semibold text-error">
          <AlertTriangle className="me-1 h-3 w-3" />
          {t('Expired', 'منتهي', language)}
        </span>
      );
    }
    if (days <= doc.remindDaysBefore) {
      return (
        <span className="inline-flex items-center rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
          <Clock className="me-1 h-3 w-3" />
          {t(`${days}d left`, `بقي ${days} يوم`, language)}
        </span>
      );
    }
    if (compact) return null;
    return (
      <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
        <CheckCircle2 className="me-1 h-3 w-3" />
        {t(`${days} days`, `بقي ${days} يوم`, language)}
      </span>
    );
  };

  const iconBtn = 'grid h-8 w-8 place-items-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700';

  const docActions = (doc: HRDocument, opts: { onWhite?: boolean } = {}) => (
    <div className={`flex items-center gap-0.5 ${opts.onWhite ? '' : ''}`}>
      <button className={iconBtn} onClick={(e) => { e.stopPropagation(); setLightboxId(doc.id); }} title={t('Preview', 'معاينة', language)} aria-label={t('Preview', 'معاينة', language)}>
        <Eye className="h-4 w-4" />
      </button>
      <button
        className={`${iconBtn} ${!doc.fileData ? 'opacity-30' : ''}`}
        onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
        title={t('Download', 'تنزيل', language)}
        aria-label={t('Download', 'تنزيل', language)}
      >
        <Download className="h-4 w-4" />
      </button>
      {canManage && (
        <>
          <button className={iconBtn} onClick={(e) => { e.stopPropagation(); openEdit(doc); }} title={t('Edit', 'تعديل', language)} aria-label={t('Edit', 'تعديل', language)}>
            <Pencil className="h-4 w-4" />
          </button>
          <button
            className="grid h-8 w-8 place-items-center rounded-md text-gray-400 transition-colors hover:bg-error/10 hover:text-error"
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(doc); }}
            title={t('Delete', 'حذف', language)}
            aria-label={t('Delete', 'حذف', language)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );

  /* ------------------------------------------------------------------ */
  /* render                                                              */
  /* ------------------------------------------------------------------ */

  const VIEW_MODES: { key: DocViewMode; en: string; ar: string; icon: React.ReactNode }[] = [
    { key: 'gallery', en: 'Gallery', ar: 'معرض', icon: <LayoutGrid className="h-4 w-4" /> },
    { key: 'list', en: 'List', ar: 'قائمة', icon: <LayoutList className="h-4 w-4" /> },
    { key: 'split', en: 'List + Viewer', ar: 'قائمة + عارض', icon: <Columns3 className="h-4 w-4" /> },
  ];

  const statusChips = [
    { value: '', en: 'All', ar: 'الكل' },
    { value: 'valid', en: 'Valid', ar: 'ساري' },
    { value: 'expiring_soon', en: 'Expiring Soon', ar: 'تنتهي قريباً' },
    { value: 'expired', en: 'Expired', ar: 'منتهي' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FolderOpen}
        title={t('Documents', 'المستندات', language)}
        subtitle={t('Company files manager — upload, preview and track expiry', 'مدير ملفات الشركة — رفع ومعاينة وتتبع الانتهاء', language)}
        actions={
          <>
            <HeaderAction icon={sendingReminder ? RefreshCw : Send} spinning={sendingReminder} disabled={sendingReminder} label={t('Send Reminders', 'إرسال التذكيرات', language)} onClick={handleSendReminders} />
            <HeaderAction icon={Download} label={t('Export CSV', 'تصدير CSV', language)} onClick={exportCsv} />
            <ModuleSettingsMenu module={t('Documents', 'المستندات', language)} onExport={exportCsv} />
            {canManage && <HeaderAction icon={Upload} label={t('Upload File', 'رفع ملف', language)} primary onClick={openCreate} />}
          </>
        }
      />

      {/* expiry alert strip */}
      {(alerts.expired.length > 0 || alerts.expiringSoon.length > 0) && (
        <div className={`flex items-start gap-3 rounded-md p-4 ${alerts.expired.length > 0 ? 'bg-error/5' : 'bg-warning/5'}`}>
          <AlertTriangle className={`mt-0.5 h-5 w-5 ${alerts.expired.length > 0 ? 'text-error' : 'text-warning'}`} />
          <div>
            <p className={`text-sm font-semibold ${alerts.expired.length > 0 ? 'text-error' : 'text-warning'}`}>
              {alerts.expired.length > 0
                ? t(`${alerts.expired.length} document(s) expired`, `${alerts.expired.length} مستندات منتهية`, language)
                : t(`${alerts.expiringSoon.length} document(s) expiring soon`, `${alerts.expiringSoon.length} مستندات تنتهي قريباً`, language)}
            </p>
            <p className="mt-0.5 text-sm text-gray-600">
              {t('Renew them as soon as possible to avoid penalties.', 'جددها في أقرب وقت لتجنب الغرامات.', language)}
            </p>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => { setStatusFilter(alerts.expired.length > 0 ? 'expired' : 'expiring_soon'); }}
            className={`text-sm font-medium hover:underline ${alerts.expired.length > 0 ? 'text-error' : 'text-warning'}`}
          >
            {t('View', 'عرض', language)}
          </button>
        </div>
      )}

      <Card>
        <CardBody className="space-y-4">
          {/* toolbar: view switch + status chips + category chips */}
          <Toolbar>
            <ToolbarSegments
              value={view}
              onChange={setView}
              iconOnly
              options={VIEW_MODES.map((m) => ({ value: m.key, icon: m.icon, title: t(m.en, m.ar, language) }))}
            />
            <ToolbarChips
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); load(categoryFilter, v, search); }}
              options={statusChips.map((s) => ({ value: s.value, label: t(s.en, s.ar, language) }))}
            />
            <ToolbarSpacer />
            <ToolbarCount>{t(`${shown.length} file(s)`, `${shown.length} ملف`, language)}</ToolbarCount>
          </Toolbar>

          <ToolbarChips
            value={categoryFilter}
            onChange={(v) => { setCategoryFilter(v); load(v, statusFilter, search); }}
            options={[
              { value: '', label: t('All Categories', 'كل التصنيفات', language) },
              ...categories.map((c) => ({ value: c.value, label: language === 'ar' ? c.ar : c.en })),
            ]}
          />

          {/* content */}
          {loading ? (
            <TableSkeleton rows={5} cols={4} />
          ) : shown.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <FolderOpen className="h-10 w-10 text-gray-200" />
              <p className="text-sm text-gray-400">{t('No documents found.', 'لا توجد مستندات.', language)}</p>
              {canManage && (
                <button onClick={openCreate} className="text-sm font-medium text-primary hover:underline">
                  {t('Upload your first file', 'ارفع أول ملف', language)}
                </button>
              )}
            </div>
          ) : view === 'gallery' ? (
            /* ------------------- GALLERY ------------------- */
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {shown.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setLightboxId(doc.id)}
                  className="group cursor-pointer overflow-hidden rounded-md bg-gray-50 transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-white">
                    <DocThumb doc={doc} />
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/0 opacity-0 transition-all group-hover:bg-gray-900/30 group-hover:opacity-100">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-gray-700">
                        <Maximize2 className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="absolute start-2 top-2">{renderHealthBadge(doc, true)}</div>
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold text-gray-900" title={language === 'ar' && doc.nameAr ? doc.nameAr : doc.name}>
                      {language === 'ar' && doc.nameAr ? doc.nameAr : doc.name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-400">
                      <span className="rounded-full bg-gray-100 px-1.5 py-0.5 font-medium text-gray-500">{categoryLabel(doc.category, language)}</span>
                      <span>{formatSize(doc.fileSize)}</span>
                    </p>
                    <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2" onClick={(e) => e.stopPropagation()}>
                      {docActions(doc)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ------------------- LIST / SPLIT ------------------- */
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="min-w-0 flex-1 divide-y divide-gray-100">
                {shown.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => (view === 'split' ? setSelectedId(doc.id) : setLightboxId(doc.id))}
                    className={`flex cursor-pointer items-center gap-3 px-2 py-2.5 transition-colors ${
                      view === 'split' && selectedId === doc.id ? 'bg-primary/5' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-gray-50">
                      <DocThumb doc={doc} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {language === 'ar' && doc.nameAr ? doc.nameAr : doc.name}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-400">
                        <span>{doc.fileName || t('No file', 'بدون ملف', language)}</span>
                        <span>•</span>
                        <span>{formatSize(doc.fileSize)}</span>
                        <span>•</span>
                        <span>{categoryLabel(doc.category, language)}</span>
                        {doc.owner && (
                          <>
                            <span>•</span>
                            <span>{doc.owner}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="hidden shrink-0 sm:block">{renderHealthBadge(doc)}</div>
                    <div className="hidden w-24 shrink-0 text-end text-[11px] text-gray-400 md:block">
                      {formatDate(doc.uploadedAt, language)}
                    </div>
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      {docActions(doc)}
                    </div>
                  </div>
                ))}
              </div>

              {view === 'split' && (
                <div className="w-full shrink-0 lg:w-[420px]">
                  <div className="sticky top-4 rounded-md bg-gray-50 p-4">
                    {selected ? (
                      <>
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {language === 'ar' && selected.nameAr ? selected.nameAr : selected.name}
                          </p>
                          <div className="flex items-center gap-0.5">
                            <button className={iconBtn} onClick={() => setLightboxId(selected.id)} title={t('Full screen', 'ملء الشاشة', language)} aria-label={t('Full screen', 'ملء الشاشة', language)}>
                              <Maximize2 className="h-4 w-4" />
                            </button>
                            <button className={iconBtn} onClick={() => setSelectedId(null)} title={t('Close', 'إغلاق', language)} aria-label={t('Close', 'إغلاق', language)}>
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <FilePreview doc={selected} />
                        <div className="mt-3 space-y-1.5 text-xs text-gray-500">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full bg-gray-200/70 px-2 py-0.5 font-medium text-gray-600">{categoryLabel(selected.category, language)}</span>
                            {renderHealthBadge(selected)}
                          </div>
                          {selected.description && <p className="text-gray-500">{selected.description}</p>}
                          <p>
                            <span className="font-medium text-gray-700">{t('File', 'الملف', language)}:</span>{' '}
                            {selected.fileName || '—'} ({formatSize(selected.fileSize)})
                          </p>
                          {selected.expiryDate && (
                            <p>
                              <span className="font-medium text-gray-700">{t('Expires', 'ينتهي', language)}:</span>{' '}
                              {formatDate(selected.expiryDate, language)}
                            </p>
                          )}
                          <p>
                            <span className="font-medium text-gray-700">{t('Uploaded', 'مرفوع', language)}:</span>{' '}
                            {formatDate(selected.uploadedAt, language)}
                          </p>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <Button size="sm" onClick={() => handleDownload(selected)} disabled={!selected.fileData}>
                            <Download className="me-1.5 h-4 w-4" />
                            {t('Download', 'تنزيل', language)}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
                        <Eye className="h-8 w-8 text-gray-300" />
                        <p className="text-sm text-gray-400">
                          {t('Select a file to preview it here', 'اختر ملفاً لمعاينته هنا', language)}
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

      {/* ------------------- LIGHTBOX ------------------- */}
      {lightboxDoc && (
        <div
          className="fixed inset-0 z-[80] flex flex-col bg-gray-900/90 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label={lightboxDoc.name}
          onClick={() => setLightboxId(null)}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3" onClick={(e) => e.stopPropagation()}>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {language === 'ar' && lightboxDoc.nameAr ? lightboxDoc.nameAr : lightboxDoc.name}
              </p>
              <p className="truncate text-xs text-gray-400">
                {lightboxDoc.fileName || t('No file', 'بدون ملف', language)} • {formatSize(lightboxDoc.fileSize)} • {categoryLabel(lightboxDoc.category, language)}
                {shown.length > 1 ? ` • ${lightboxIndex + 1}/${shown.length}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                className={`grid h-9 w-9 place-items-center rounded-md text-gray-300 hover:bg-white/10 hover:text-white ${!lightboxDoc.fileData ? 'opacity-30' : ''}`}
                onClick={() => handleDownload(lightboxDoc)}
                title={t('Download', 'تنزيل', language)}
                aria-label={t('Download', 'تنزيل', language)}
              >
                <Download className="h-5 w-5" />
              </button>
              {canManage && (
                <button
                  className="grid h-9 w-9 place-items-center rounded-md text-gray-300 hover:bg-white/10 hover:text-white"
                  onClick={() => { setLightboxId(null); openEdit(lightboxDoc); }}
                  title={t('Edit', 'تعديل', language)}
                  aria-label={t('Edit', 'تعديل', language)}
                >
                  <Pencil className="h-5 w-5" />
                </button>
              )}
              <button
                className="grid h-9 w-9 place-items-center rounded-md text-gray-300 hover:bg-white/10 hover:text-white"
                onClick={() => setLightboxId(null)}
                title={t('Close', 'إغلاق', language)}
                aria-label={t('Close', 'إغلاق', language)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-14 pb-6" onClick={(e) => e.stopPropagation()}>
            {shown.length > 1 && (
              <button
                className="absolute start-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={() => stepLightbox(-1)}
                aria-label={t('Previous', 'السابق', language)}
              >
                <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
              </button>
            )}
            <div className="h-full w-full max-w-4xl">
              {fileKind(lightboxDoc) === 'image' ? (
                <div className="flex h-full items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={lightboxDoc.fileData} alt={lightboxDoc.name} className="max-h-full max-w-full rounded-md object-contain" draggable={false} />
                </div>
              ) : fileKind(lightboxDoc) === 'pdf' || fileKind(lightboxDoc) === 'text' ? (
                <iframe src={lightboxDoc.fileData} title={lightboxDoc.name} className="h-full w-full rounded-md bg-white" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-4 rounded-md bg-white/5">
                  {fileKind(lightboxDoc) === 'other' ? <File className="h-14 w-14 text-gray-500" /> : <ImageIcon className="h-14 w-14 text-gray-500" />}
                  <p className="text-sm text-gray-300">
                    {fileKind(lightboxDoc) === 'other'
                      ? t('Preview not available — download the file to open it', 'المعاينة غير متاحة — نزّل الملف لفتحه', language)
                      : t('No file attached to this document', 'لا يوجد ملف مرفق بهذا المستند', language)}
                  </p>
                  {lightboxDoc.fileData && (
                    <Button size="sm" onClick={() => handleDownload(lightboxDoc)}>
                      <Download className="me-1.5 h-4 w-4" />
                      {t('Download', 'تنزيل', language)}
                    </Button>
                  )}
                </div>
              )}
            </div>
            {shown.length > 1 && (
              <button
                className="absolute end-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={() => stepLightbox(1)}
                aria-label={t('Next', 'التالي', language)}
              >
                <ChevronRight className="h-5 w-5 rtl:rotate-180" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ------------------- UPLOAD / EDIT MODAL ------------------- */}
      {showForm && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-10 animate-fade-in"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowForm(false)}
        >
          <div className="w-full max-w-2xl rounded-md bg-white shadow-modal animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-5">
              <h2 className="text-base font-semibold text-gray-900">
                {t(editing ? 'Edit Document' : 'Upload File', editing ? 'تعديل مستند' : 'رفع ملف', language)}
              </h2>
              <button onClick={() => setShowForm(false)} className="rounded-md p-1 text-gray-300 hover:bg-gray-100 hover:text-gray-500" aria-label={t('Close', 'إغلاق', language)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              {/* dropzone */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) attachFile(f);
                  e.target.value = '';
                }}
              />
              {form.fileData ? (
                <div className="flex items-center gap-3 rounded-md bg-gray-50 p-3">
                  <div className="h-14 w-20 shrink-0 overflow-hidden rounded-md bg-white">
                    <DocThumb doc={{ ...(editing || ({} as HRDocument)), fileData: form.fileData, mimeType: form.mimeType, fileName: form.fileName, name: form.name } as HRDocument} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{form.fileName || t('Attached file', 'ملف مرفق', language)}</p>
                    <p className="text-xs text-gray-400">{form.mimeType} • {formatSize(form.fileSize)}</p>
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} className="text-xs font-medium text-primary hover:underline">
                    {t('Replace', 'استبدال', language)}
                  </button>
                  <button onClick={clearFile} className="rounded-md p-1.5 text-gray-300 hover:bg-gray-100 hover:text-error" aria-label={t('Remove file', 'إزالة الملف', language)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) attachFile(f);
                  }}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md py-8 transition-colors ${
                    dragOver ? 'bg-primary/10' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <CloudUpload className={`h-8 w-8 ${dragOver ? 'text-primary' : 'text-gray-300'}`} />
                  <p className="text-sm font-medium text-gray-600">
                    {t('Drop a file here or click to browse', 'أسقط ملفاً هنا أو انقر للاختيار', language)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {t('Images, PDF, any file — up to 5 MB', 'صور، PDF، أي ملف — حتى 5 ميجابايت', language)}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">{t('Category', 'التصنيف', language)}</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as DocumentCategory })}
                    className="block w-full rounded-md border-0 bg-gray-100 px-3 py-2 text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            </div>
            <div className="flex justify-end gap-2 px-6 pb-5">
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                {t('Cancel', 'إلغاء', language)}
              </Button>
              <Button onClick={handleSave} loading={saving}>
                {t(editing ? 'Save Changes' : 'Upload', editing ? 'حفظ التغييرات' : 'رفع', language)}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title={t('Delete document?', 'حذف المستند؟', language)}
        message={
          confirmDelete
            ? t(
                `"${confirmDelete.name}" and its file will be permanently removed.`,
                `سيتم حذف "${confirmDelete.nameAr || confirmDelete.name}" وملفه نهائياً.`,
                language
              )
            : undefined
        }
        confirmLabel={t('Delete', 'حذف', language)}
        loading={deleting}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}
