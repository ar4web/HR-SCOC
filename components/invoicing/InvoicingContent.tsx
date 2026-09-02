'use client';

/**
 * ZATCA Invoicing — Saudi e-invoicing (Fatoora) module.
 *
 * - Stats strip: month sales/VAT, counts, hash-chain integrity badge.
 * - Invoice list with status/type chips + header search.
 * - Create wizard: standard (B2B) vs simplified (B2C), dynamic line items
 *   with per-line VAT (15/5/0%), discounts, live totals preview.
 * - Invoice viewer: bilingual A4 tax invoice with Phase-1 TLV QR, print.
 * - ZATCA rules enforced: issued invoices can be cancelled (with reason),
 *   never deleted; only drafts are deletable; VAT number validation.
 * - Seller settings editor (VAT/CR/address/prefix).
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
import { ModuleSettingsMenu } from '@/components/module-settings/ModuleSettingsMenu';
import { invoicingService, InvoiceStats, ChainStatus } from '@/modules/invoicing/service';
import { InvoiceDocument } from '@/components/invoicing/InvoiceDocument';
import { hasPermission } from '@/lib/rbac';
import { ZatcaInvoice, ZatcaSettings, InvoiceType } from '@/types';
import { t, formatDate } from '@/lib/utils';
import { downloadCsv } from '@/lib/csv';
import PageHeader, { HeaderAction } from '@/components/layout/PageHeader';
import { Toolbar, ToolbarChips, ToolbarDivider, ToolbarSpacer, ToolbarCount } from '@/components/layout/Toolbar';
import { usePageSearch } from '@/stores/search-store';
import {
  ReceiptText, Plus, X, Trash2, Printer, Eye, Settings2, Download,
  ShieldCheck, ShieldAlert, Link2, FileCheck2, FileClock,
  Building2, User as UserIcon, Send, Ban,
} from 'lucide-react';

function money(v: number): string {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}

interface LineDraft {
  key: number;
  description: string;
  descriptionAr: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  vatRate: number;
}

const emptyLine = (key: number): LineDraft => ({
  key, description: '', descriptionAr: '', quantity: '1', unitPrice: '', discount: '', vatRate: 15,
});

const STATUS_META: Record<string, { en: string; ar: string; cls: string }> = {
  draft: { en: 'Draft', ar: 'مسودة', cls: 'bg-gray-100 text-gray-500' },
  issued: { en: 'Issued', ar: 'صادرة', cls: 'bg-success/10 text-success' },
  reported: { en: 'Reported', ar: 'مُبلغ عنها', cls: 'bg-primary/10 text-primary' },
  cancelled: { en: 'Cancelled', ar: 'ملغاة', cls: 'bg-error/10 text-error' },
};

export function InvoicingContent() {
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const canWrite = hasPermission(user?.role, 'invoice:write');

  const [invoices, setInvoices] = React.useState<ZatcaInvoice[]>([]);
  const [stats, setStats] = React.useState<InvoiceStats | null>(null);
  const [chain, setChain] = React.useState<ChainStatus | null>(null);
  const [settings, setSettings] = React.useState<ZatcaSettings | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('');
  const search = usePageSearch('/invoicing', 'Search invoices…', 'ابحث عن فواتير…');

  const [viewing, setViewing] = React.useState<ZatcaInvoice | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [confirmDeleteDraft, setConfirmDeleteDraft] = React.useState<ZatcaInvoice | null>(null);
  const [cancelTarget, setCancelTarget] = React.useState<ZatcaInvoice | null>(null);
  const [cancelReason, setCancelReason] = React.useState('');

  /* create form state */
  const [invType, setInvType] = React.useState<InvoiceType>('standard');
  const lineKey = React.useRef(1);
  const [lines, setLines] = React.useState<LineDraft[]>([emptyLine(0)]);
  const [buyer, setBuyer] = React.useState({ name: '', nameAr: '', vatNumber: '', crNumber: '', address: '', city: '' });
  const [meta, setMeta] = React.useState({ dueDate: '', supplyDate: '', paymentTerms: '', notes: '', invoiceDiscount: '' });

  /* settings form state */
  const [settingsForm, setSettingsForm] = React.useState<ZatcaSettings | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [listRes, statsRes, chainRes, settingsRes] = await Promise.all([
      invoicingService.getInvoices({ status: statusFilter || undefined, invoiceType: typeFilter || undefined, search: search || undefined }),
      invoicingService.getStats(),
      invoicingService.getChainStatus(),
      invoicingService.getSettings(),
    ]);
    if (listRes.success && listRes.data) setInvoices(listRes.data.data);
    if (statsRes.success && statsRes.data) setStats(statsRes.data);
    if (chainRes.success && chainRes.data) setChain(chainRes.data);
    if (settingsRes.success && settingsRes.data) setSettings(settingsRes.data);
    setLoading(false);
  }, [statusFilter, typeFilter, search]);

  React.useEffect(() => { load(); }, [load]);

  /* ---------------- live totals for the create form ---------------- */

  const preview = React.useMemo(() => {
    let subtotal = 0;
    let vat = 0;
    for (const l of lines) {
      const qty = parseFloat(l.quantity) || 0;
      const price = parseFloat(l.unitPrice) || 0;
      const disc = parseFloat(l.discount) || 0;
      const net = Math.max(0, qty * price - disc);
      subtotal += net;
      vat += net * (l.vatRate / 100);
    }
    const invDisc = Math.min(parseFloat(meta.invoiceDiscount) || 0, subtotal);
    const ratio = subtotal > 0 ? (subtotal - invDisc) / subtotal : 0;
    const taxable = subtotal - invDisc;
    const vatAdj = vat * ratio;
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(invDisc * 100) / 100,
      taxable: Math.round(taxable * 100) / 100,
      vat: Math.round(vatAdj * 100) / 100,
      total: Math.round((taxable + vatAdj) * 100) / 100,
    };
  }, [lines, meta.invoiceDiscount]);

  /* ---------------- actions ---------------- */

  const resetCreateForm = () => {
    setInvType('standard');
    setLines([emptyLine(lineKey.current++)]);
    setBuyer({ name: '', nameAr: '', vatNumber: '', crNumber: '', address: '', city: '' });
    setMeta({ dueDate: '', supplyDate: '', paymentTerms: '', notes: '', invoiceDiscount: '' });
  };

  const submitInvoice = async (issueNow: boolean) => {
    setSaving(true);
    try {
      const res = await invoicingService.createInvoice({
        type: invType,
        buyer: {
          name: buyer.name.trim(),
          nameAr: buyer.nameAr.trim() || undefined,
          vatNumber: buyer.vatNumber.trim() || undefined,
          crNumber: buyer.crNumber.trim() || undefined,
          address: buyer.address.trim() || undefined,
          city: buyer.city.trim() || undefined,
        },
        lines: lines.map((l) => ({
          description: l.description.trim(),
          descriptionAr: l.descriptionAr.trim() || undefined,
          quantity: parseFloat(l.quantity) || 0,
          unitPrice: parseFloat(l.unitPrice) || 0,
          discount: parseFloat(l.discount) || undefined,
          vatRate: l.vatRate,
        })),
        discount: parseFloat(meta.invoiceDiscount) || undefined,
        dueDate: meta.dueDate || undefined,
        supplyDate: meta.supplyDate || undefined,
        paymentTerms: meta.paymentTerms.trim() || undefined,
        notes: meta.notes.trim() || undefined,
        issueNow,
      });
      if (res.success && res.data) {
        addToast({
          type: 'success',
          title: t(
            issueNow ? `Invoice ${res.data.invoiceNumber} issued` : `Draft ${res.data.invoiceNumber} saved`,
            issueNow ? `تم إصدار الفاتورة ${res.data.invoiceNumber}` : `تم حفظ المسودة ${res.data.invoiceNumber}`,
            language
          ),
        });
        setShowCreate(false);
        resetCreateForm();
        load();
        if (issueNow) setViewing(res.data);
      } else {
        addToast({ type: 'error', title: res.error || t('Failed to create invoice', 'فشل إنشاء الفاتورة', language) });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleIssueDraft = async (inv: ZatcaInvoice) => {
    const res = await invoicingService.issueDraft(inv.id);
    if (res.success && res.data) {
      addToast({ type: 'success', title: t(`Invoice ${inv.invoiceNumber} issued`, `تم إصدار الفاتورة ${inv.invoiceNumber}`, language) });
      load();
      setViewing(res.data);
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to issue invoice', 'فشل إصدار الفاتورة', language) });
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) {
      addToast({ type: 'error', title: t('Cancellation reason is required', 'سبب الإلغاء مطلوب', language) });
      return;
    }
    setSaving(true);
    const res = await invoicingService.cancelInvoice(cancelTarget.id, cancelReason.trim());
    setSaving(false);
    if (res.success && res.data) {
      addToast({ type: 'success', title: t('Invoice cancelled', 'تم إلغاء الفاتورة', language) });
      setCancelTarget(null);
      setCancelReason('');
      if (viewing?.id === cancelTarget.id) setViewing(res.data);
      load();
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to cancel invoice', 'فشل إلغاء الفاتورة', language) });
    }
  };

  const handleDeleteDraft = async (inv: ZatcaInvoice) => {
    setConfirmDeleteDraft(null);
    const res = await invoicingService.deleteDraft(inv.id);
    if (res.success) {
      addToast({ type: 'success', title: t('Draft deleted', 'تم حذف المسودة', language) });
      load();
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to delete draft', 'فشل حذف المسودة', language) });
    }
  };

  const saveSettings = async () => {
    if (!settingsForm) return;
    setSaving(true);
    const res = await invoicingService.updateSettings(settingsForm);
    setSaving(false);
    if (res.success && res.data) {
      setSettings(res.data);
      setShowSettings(false);
      addToast({ type: 'success', title: t('Invoice settings saved', 'تم حفظ إعدادات الفوترة', language) });
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to save settings', 'فشل حفظ الإعدادات', language) });
    }
  };

  const exportCsv = () => {
    downloadCsv(
      invoices.map((i) => ({
        number: i.invoiceNumber,
        uuid: i.uuid,
        type: i.type,
        status: i.status,
        buyer: i.buyer.name,
        buyerVat: i.buyer.vatNumber || '',
        issueDate: i.issueDate,
        subtotal: i.subtotal,
        vat: i.vatTotal,
        total: i.grandTotal,
        icv: i.icv,
        hash: i.invoiceHash,
      })),
      `zatca-invoices-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const openSettings = () => {
    if (settings) setSettingsForm({ ...settings });
    setShowSettings(true);
  };

  /* ---------------- render ---------------- */

  const statusChips = [
    { value: '', en: 'All', ar: 'الكل' },
    { value: 'issued', en: 'Issued', ar: 'صادرة' },
    { value: 'draft', en: 'Drafts', ar: 'مسودات' },
    { value: 'cancelled', en: 'Cancelled', ar: 'ملغاة' },
  ];
  const typeChips = [
    { value: '', en: 'All types', ar: 'كل الأنواع' },
    { value: 'standard', en: 'Standard (B2B)', ar: 'قياسية (B2B)' },
    { value: 'simplified', en: 'Simplified (B2C)', ar: 'مبسطة (B2C)' },
  ];

  const field = 'block w-full rounded-md border-0 bg-gray-100 px-3 py-2 text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40';

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ReceiptText}
        title={t('ZATCA Invoicing', 'الفوترة الإلكترونية', language)}
        subtitle={t('Saudi e-invoicing (Fatoora) — VAT invoices with compliant QR codes', 'الفوترة الإلكترونية السعودية (فاتورة) — فواتير ضريبية برمز QR متوافق', language)}
        badge={
          chain && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${chain.ok ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
              {chain.ok ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
              {chain.ok
                ? t(`Chain verified (${chain.checked})`, `السلسلة موثقة (${chain.checked})`, language)
                : t(`Chain broken at ${chain.brokenAt}`, `السلسلة مكسورة عند ${chain.brokenAt}`, language)}
            </span>
          )
        }
        actions={
          <>
            <HeaderAction icon={Download} label={t('Export CSV', 'تصدير CSV', language)} onClick={exportCsv} />
            {canWrite && <HeaderAction icon={Settings2} label={t('Seller Settings', 'إعدادات البائع', language)} onClick={openSettings} />}
            <ModuleSettingsMenu module={t('Invoicing', 'الفوترة', language)} onExport={exportCsv} />
            {canWrite && <HeaderAction icon={Plus} label={t('New Invoice', 'فاتورة جديدة', language)} primary onClick={() => setShowCreate(true)} />}
          </>
        }
      />

      {/* stats strip */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { icon: <FileCheck2 className="h-4 w-4" />, chip: 'bg-success/10 text-success', label: t('Issued this month', 'صادرة هذا الشهر', language), value: `${stats.monthCount}` },
            { icon: <ReceiptText className="h-4 w-4" />, chip: 'bg-primary/10 text-primary', label: t('Month sales (SAR)', 'مبيعات الشهر (ريال)', language), value: money(stats.monthTotal) },
            { icon: <Link2 className="h-4 w-4" />, chip: 'bg-secondary/10 text-secondary', label: t('Month VAT (SAR)', 'ضريبة الشهر (ريال)', language), value: money(stats.monthVat) },
            { icon: <FileClock className="h-4 w-4" />, chip: 'bg-warning/10 text-warning', label: t('Drafts', 'مسودات', language), value: `${stats.drafts}` },
          ].map((s, idx) => (
            <div key={idx} className="flex items-center gap-3 rounded-md bg-white p-4 shadow-card">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${s.chip}`}>{s.icon}</span>
              <div className="min-w-0">
                <p className="truncate text-lg font-bold tabular-nums text-gray-900">{s.value}</p>
                <p className="truncate text-xs text-gray-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardBody className="space-y-4">
          {/* filter chips */}
          <Toolbar>
            <ToolbarChips
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusChips.map((s) => ({ value: s.value, label: t(s.en, s.ar, language) }))}
            />
            <ToolbarDivider />
            <ToolbarChips
              value={typeFilter}
              onChange={setTypeFilter}
              options={typeChips.map((s) => ({ value: s.value, label: t(s.en, s.ar, language) }))}
            />
            <ToolbarSpacer />
            <ToolbarCount>{t(`${invoices.length} invoice(s)`, `${invoices.length} فاتورة`, language)}</ToolbarCount>
          </Toolbar>

          {/* list */}
          {loading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <ReceiptText className="h-10 w-10 text-gray-200" />
              <p className="text-sm text-gray-400">{t('No invoices yet.', 'لا توجد فواتير بعد.', language)}</p>
              {canWrite && (
                <button onClick={() => setShowCreate(true)} className="text-sm font-medium text-primary hover:underline">
                  {t('Create your first invoice', 'أنشئ أول فاتورة', language)}
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {invoices.map((inv) => {
                const sm = STATUS_META[inv.status] || STATUS_META.draft;
                return (
                  <div
                    key={inv.id}
                    onClick={() => setViewing(inv)}
                    className="flex cursor-pointer items-center gap-3 px-2 py-3 transition-colors hover:bg-gray-50"
                  >
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${inv.type === 'standard' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                      {inv.type === 'standard' ? <Building2 className="h-5 w-5" /> : <UserIcon className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-sm font-semibold text-gray-900">{inv.invoiceNumber}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${sm.cls}`}>
                          {t(sm.en, sm.ar, language)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-gray-400">
                        {language === 'ar' && inv.buyer.nameAr ? inv.buyer.nameAr : inv.buyer.name}
                        {inv.buyer.vatNumber ? ` • VAT ${inv.buyer.vatNumber}` : ''} • {formatDate(inv.issueDate, language)}
                      </p>
                    </div>
                    <div className="hidden text-end sm:block">
                      <p className="text-sm font-bold tabular-nums text-gray-900">SAR {money(inv.grandTotal)}</p>
                      <p className="text-[11px] tabular-nums text-gray-400">{t('VAT', 'الضريبة', language)} {money(inv.vatTotal)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="grid h-8 w-8 place-items-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                        onClick={() => setViewing(inv)}
                        title={t('View', 'عرض', language)}
                        aria-label={t('View', 'عرض', language)}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {canWrite && inv.status === 'draft' && (
                        <>
                          <button
                            className="grid h-8 w-8 place-items-center rounded-md text-gray-400 transition-colors hover:bg-success/10 hover:text-success"
                            onClick={() => handleIssueDraft(inv)}
                            title={t('Issue', 'إصدار', language)}
                            aria-label={t('Issue', 'إصدار', language)}
                          >
                            <Send className="h-4 w-4" />
                          </button>
                          <button
                            className="grid h-8 w-8 place-items-center rounded-md text-gray-400 transition-colors hover:bg-error/10 hover:text-error"
                            onClick={() => setConfirmDeleteDraft(inv)}
                            title={t('Delete draft', 'حذف المسودة', language)}
                            aria-label={t('Delete draft', 'حذف المسودة', language)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {canWrite && (inv.status === 'issued' || inv.status === 'reported') && (
                        <button
                          className="grid h-8 w-8 place-items-center rounded-md text-gray-400 transition-colors hover:bg-error/10 hover:text-error"
                          onClick={() => { setCancelTarget(inv); setCancelReason(''); }}
                          title={t('Cancel invoice', 'إلغاء الفاتورة', language)}
                          aria-label={t('Cancel invoice', 'إلغاء الفاتورة', language)}
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* ------------------- VIEWER ------------------- */}
      {viewing && (
        <div
          className="fixed inset-0 z-[80] overflow-y-auto bg-gray-900/80 p-4 py-8 animate-fade-in"
          role="dialog"
          aria-modal="true"
          onClick={() => setViewing(null)}
        >
          <div className="mx-auto max-w-[850px]" onClick={(e) => e.stopPropagation()}>
            <div className="no-print mb-3 flex items-center justify-between">
              <p className="font-mono text-sm font-semibold text-white">{viewing.invoiceNumber}</p>
              <div className="flex items-center gap-1">
                {canWrite && viewing.status === 'draft' && (
                  <button
                    className="grid h-9 w-9 place-items-center rounded-md text-gray-300 hover:bg-white/10 hover:text-white"
                    onClick={() => handleIssueDraft(viewing)}
                    title={t('Issue', 'إصدار', language)}
                    aria-label={t('Issue', 'إصدار', language)}
                  >
                    <Send className="h-5 w-5" />
                  </button>
                )}
                {canWrite && (viewing.status === 'issued' || viewing.status === 'reported') && (
                  <button
                    className="grid h-9 w-9 place-items-center rounded-md text-gray-300 hover:bg-white/10 hover:text-white"
                    onClick={() => { setCancelTarget(viewing); setCancelReason(''); }}
                    title={t('Cancel invoice', 'إلغاء الفاتورة', language)}
                    aria-label={t('Cancel invoice', 'إلغاء الفاتورة', language)}
                  >
                    <Ban className="h-5 w-5" />
                  </button>
                )}
                <button
                  className="grid h-9 w-9 place-items-center rounded-md text-gray-300 hover:bg-white/10 hover:text-white"
                  onClick={() => window.print()}
                  title={t('Print', 'طباعة', language)}
                  aria-label={t('Print', 'طباعة', language)}
                >
                  <Printer className="h-5 w-5" />
                </button>
                <button
                  className="grid h-9 w-9 place-items-center rounded-md text-gray-300 hover:bg-white/10 hover:text-white"
                  onClick={() => setViewing(null)}
                  title={t('Close', 'إغلاق', language)}
                  aria-label={t('Close', 'إغلاق', language)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <InvoiceDocument invoice={viewing} />
          </div>
        </div>
      )}

      {/* ------------------- CREATE MODAL ------------------- */}
      {showCreate && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-10 animate-fade-in"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowCreate(false)}
        >
          <div className="w-full max-w-3xl rounded-md bg-white shadow-modal animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-5">
              <h2 className="text-base font-semibold text-gray-900">{t('New Invoice', 'فاتورة جديدة', language)}</h2>
              <button onClick={() => setShowCreate(false)} className="rounded-md p-1 text-gray-300 hover:bg-gray-100 hover:text-gray-500" aria-label={t('Close', 'إغلاق', language)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-5 px-6 py-5">
              {/* type toggle */}
              <div className="flex items-center gap-1 rounded-md bg-gray-100 p-1">
                {([
                  { v: 'standard', icon: <Building2 className="h-4 w-4" />, en: 'Standard — B2B tax invoice', ar: 'قياسية — فاتورة ضريبية B2B' },
                  { v: 'simplified', icon: <UserIcon className="h-4 w-4" />, en: 'Simplified — B2C', ar: 'مبسطة — B2C' },
                ] as { v: InvoiceType; icon: React.ReactNode; en: string; ar: string }[]).map((o) => (
                  <button
                    key={o.v}
                    onClick={() => setInvType(o.v)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      invType === o.v ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {o.icon}
                    {t(o.en, o.ar, language)}
                  </button>
                ))}
              </div>

              {/* buyer */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t('Buyer', 'المشتري', language)}</p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input label={t('Name (English)', 'الاسم (إنجليزي)', language)} value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} placeholder={t('Customer or company name', 'اسم العميل أو الشركة', language)} />
                  <Input label={t('Name (Arabic)', 'الاسم (عربي)', language)} value={buyer.nameAr} onChange={(e) => setBuyer({ ...buyer, nameAr: e.target.value })} placeholder={t('Optional', 'اختياري', language)} />
                  {invType === 'standard' && (
                    <>
                      <Input label={t('Buyer VAT Number *', 'الرقم الضريبي للمشتري *', language)} value={buyer.vatNumber} onChange={(e) => setBuyer({ ...buyer, vatNumber: e.target.value.replace(/\D/g, '').slice(0, 15) })} placeholder="3XXXXXXXXXXXXX3" />
                      <Input label={t('Buyer CR Number', 'السجل التجاري للمشتري', language)} value={buyer.crNumber} onChange={(e) => setBuyer({ ...buyer, crNumber: e.target.value })} placeholder={t('Optional', 'اختياري', language)} />
                    </>
                  )}
                  <Input label={t('Address', 'العنوان', language)} value={buyer.address} onChange={(e) => setBuyer({ ...buyer, address: e.target.value })} placeholder={t('Optional', 'اختياري', language)} />
                  <Input label={t('City', 'المدينة', language)} value={buyer.city} onChange={(e) => setBuyer({ ...buyer, city: e.target.value })} placeholder={t('Optional', 'اختياري', language)} />
                </div>
                {buyer.vatNumber && !/^3\d{13}3$/.test(buyer.vatNumber) && (
                  <p className="mt-1.5 text-xs text-warning">{t('VAT number must be 15 digits, starting and ending with 3', 'الرقم الضريبي يجب أن يكون 15 رقماً يبدأ وينتهي بـ 3', language)}</p>
                )}
              </div>

              {/* lines */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('Line Items', 'البنود', language)}</p>
                  <button
                    onClick={() => setLines((ls) => [...ls, emptyLine(lineKey.current++)])}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t('Add line', 'إضافة بند', language)}
                  </button>
                </div>
                <div className="space-y-2">
                  {lines.map((l, i) => (
                    <div key={l.key} className="rounded-md bg-gray-50 p-3">
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-[2fr_1fr_1fr_1fr_auto_auto]">
                        <input
                          className={field}
                          value={l.description}
                          onChange={(e) => setLines((ls) => ls.map((x) => (x.key === l.key ? { ...x, description: e.target.value } : x)))}
                          placeholder={t(`Item ${i + 1} description`, `وصف البند ${i + 1}`, language)}
                        />
                        <input
                          className={field}
                          type="number" min="0" step="any"
                          value={l.quantity}
                          onChange={(e) => setLines((ls) => ls.map((x) => (x.key === l.key ? { ...x, quantity: e.target.value } : x)))}
                          placeholder={t('Qty', 'الكمية', language)}
                          aria-label={t('Quantity', 'الكمية', language)}
                        />
                        <input
                          className={field}
                          type="number" min="0" step="any"
                          value={l.unitPrice}
                          onChange={(e) => setLines((ls) => ls.map((x) => (x.key === l.key ? { ...x, unitPrice: e.target.value } : x)))}
                          placeholder={t('Unit price', 'سعر الوحدة', language)}
                          aria-label={t('Unit price', 'سعر الوحدة', language)}
                        />
                        <input
                          className={field}
                          type="number" min="0" step="any"
                          value={l.discount}
                          onChange={(e) => setLines((ls) => ls.map((x) => (x.key === l.key ? { ...x, discount: e.target.value } : x)))}
                          placeholder={t('Discount', 'الخصم', language)}
                          aria-label={t('Discount', 'الخصم', language)}
                        />
                        <select
                          className={field}
                          value={l.vatRate}
                          onChange={(e) => setLines((ls) => ls.map((x) => (x.key === l.key ? { ...x, vatRate: Number(e.target.value) } : x)))}
                          aria-label={t('VAT rate', 'نسبة الضريبة', language)}
                        >
                          <option value={15}>15%</option>
                          <option value={5}>5%</option>
                          <option value={0}>0%</option>
                        </select>
                        <button
                          onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : ls))}
                          disabled={lines.length <= 1}
                          className="grid h-9 w-9 place-items-center self-center rounded-md text-gray-300 transition-colors hover:bg-error/10 hover:text-error disabled:opacity-30"
                          title={t('Remove line', 'إزالة البند', language)}
                          aria-label={t('Remove line', 'إزالة البند', language)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* meta + totals */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="grid grid-cols-2 gap-3">
                  <Input label={t('Supply Date', 'تاريخ التوريد', language)} type="date" value={meta.supplyDate} onChange={(e) => setMeta({ ...meta, supplyDate: e.target.value })} />
                  <Input label={t('Due Date', 'تاريخ الاستحقاق', language)} type="date" value={meta.dueDate} onChange={(e) => setMeta({ ...meta, dueDate: e.target.value })} />
                  <Input label={t('Invoice Discount (SAR)', 'خصم الفاتورة (ريال)', language)} type="number" min={0} value={meta.invoiceDiscount} onChange={(e) => setMeta({ ...meta, invoiceDiscount: e.target.value })} />
                  <Input label={t('Payment Terms', 'شروط الدفع', language)} value={meta.paymentTerms} onChange={(e) => setMeta({ ...meta, paymentTerms: e.target.value })} placeholder="Net 30" />
                  <div className="col-span-2">
                    <Input label={t('Notes', 'ملاحظات', language)} value={meta.notes} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} placeholder={t('Optional', 'اختياري', language)} />
                  </div>
                </div>
                <div className="space-y-1.5 rounded-md bg-gray-50 p-4 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>{t('Subtotal', 'الإجمالي قبل الضريبة', language)}</span>
                    <span className="tabular-nums">{money(preview.subtotal)}</span>
                  </div>
                  {preview.discount > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>{t('Discount', 'الخصم', language)}</span>
                      <span className="tabular-nums">-{money(preview.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>{t('Taxable amount', 'الخاضع للضريبة', language)}</span>
                    <span className="tabular-nums">{money(preview.taxable)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>{t('VAT', 'ضريبة القيمة المضافة', language)}</span>
                    <span className="tabular-nums">{money(preview.vat)}</span>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
                    <span>{t('Total', 'الإجمالي', language)}</span>
                    <span className="tabular-nums">SAR {money(preview.total)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 pb-5">
              <Button variant="ghost" onClick={() => setShowCreate(false)}>{t('Cancel', 'إلغاء', language)}</Button>
              <Button variant="secondary" loading={saving} onClick={() => submitInvoice(false)}>
                {t('Save Draft', 'حفظ كمسودة', language)}
              </Button>
              <Button loading={saving} onClick={() => submitInvoice(true)}>
                {t('Issue Invoice', 'إصدار الفاتورة', language)}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------- SETTINGS MODAL ------------------- */}
      {showSettings && settingsForm && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-10 animate-fade-in"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowSettings(false)}
        >
          <div className="w-full max-w-2xl rounded-md bg-white shadow-modal animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-5">
              <h2 className="text-base font-semibold text-gray-900">{t('Seller Settings (ZATCA)', 'إعدادات البائع (زاتكا)', language)}</h2>
              <button onClick={() => setShowSettings(false)} className="rounded-md p-1 text-gray-300 hover:bg-gray-100 hover:text-gray-500" aria-label={t('Close', 'إغلاق', language)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 px-6 py-5 md:grid-cols-2">
              <Input label={t('Seller Name (EN)', 'اسم البائع (إنجليزي)', language)} value={settingsForm.sellerName} onChange={(e) => setSettingsForm({ ...settingsForm, sellerName: e.target.value })} />
              <Input label={t('Seller Name (AR)', 'اسم البائع (عربي)', language)} value={settingsForm.sellerNameAr} onChange={(e) => setSettingsForm({ ...settingsForm, sellerNameAr: e.target.value })} />
              <Input label={t('VAT Number', 'الرقم الضريبي', language)} value={settingsForm.vatNumber} onChange={(e) => setSettingsForm({ ...settingsForm, vatNumber: e.target.value.replace(/\D/g, '').slice(0, 15) })} placeholder="3XXXXXXXXXXXXX3" />
              <Input label={t('CR Number', 'السجل التجاري', language)} value={settingsForm.crNumber} onChange={(e) => setSettingsForm({ ...settingsForm, crNumber: e.target.value })} />
              <Input label={t('Address (EN)', 'العنوان (إنجليزي)', language)} value={settingsForm.address} onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })} />
              <Input label={t('Address (AR)', 'العنوان (عربي)', language)} value={settingsForm.addressAr} onChange={(e) => setSettingsForm({ ...settingsForm, addressAr: e.target.value })} />
              <Input label={t('City', 'المدينة', language)} value={settingsForm.city} onChange={(e) => setSettingsForm({ ...settingsForm, city: e.target.value })} />
              <Input label={t('District', 'الحي', language)} value={settingsForm.district} onChange={(e) => setSettingsForm({ ...settingsForm, district: e.target.value })} />
              <Input label={t('Building No.', 'رقم المبنى', language)} value={settingsForm.buildingNumber} onChange={(e) => setSettingsForm({ ...settingsForm, buildingNumber: e.target.value })} />
              <Input label={t('Postal Code', 'الرمز البريدي', language)} value={settingsForm.postalCode} onChange={(e) => setSettingsForm({ ...settingsForm, postalCode: e.target.value })} />
              <Input label={t('Invoice Prefix', 'بادئة رقم الفاتورة', language)} value={settingsForm.invoicePrefix} onChange={(e) => setSettingsForm({ ...settingsForm, invoicePrefix: e.target.value.toUpperCase().slice(0, 12) })} />
              <Input label={t('Default Payment Terms', 'شروط الدفع الافتراضية', language)} value={settingsForm.defaultPaymentTerms} onChange={(e) => setSettingsForm({ ...settingsForm, defaultPaymentTerms: e.target.value })} />
            </div>
            {settingsForm.vatNumber && !/^3\d{13}3$/.test(settingsForm.vatNumber) && (
              <p className="px-6 pb-2 text-xs text-warning">{t('VAT number must be 15 digits, starting and ending with 3', 'الرقم الضريبي يجب أن يكون 15 رقماً يبدأ وينتهي بـ 3', language)}</p>
            )}
            <div className="flex justify-end gap-2 px-6 pb-5">
              <Button variant="ghost" onClick={() => setShowSettings(false)}>{t('Cancel', 'إلغاء', language)}</Button>
              <Button loading={saving} onClick={saveSettings}>{t('Save Settings', 'حفظ الإعدادات', language)}</Button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------- CANCEL DIALOG (reason required) ------------------- */}
      {cancelTarget && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 animate-fade-in"
          role="alertdialog"
          aria-modal="true"
          onClick={() => setCancelTarget(null)}
        >
          <div className="w-full max-w-sm rounded-md bg-white shadow-modal animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 p-5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-error/10 text-error">
                <Ban className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <h2 className="text-sm font-semibold text-gray-900">
                  {t(`Cancel ${cancelTarget.invoiceNumber}?`, `إلغاء ${cancelTarget.invoiceNumber}؟`, language)}
                </h2>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  {t('ZATCA rules: issued invoices cannot be deleted, only cancelled. A reason is required.', 'قواعد زاتكا: لا يمكن حذف الفواتير الصادرة، فقط إلغاؤها. السبب مطلوب.', language)}
                </p>
                <input
                  className={`mt-3 ${field}`}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder={t('Cancellation reason…', 'سبب الإلغاء…', language)}
                  autoFocus
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 pb-4">
              <Button variant="ghost" size="sm" onClick={() => setCancelTarget(null)}>{t('Keep Invoice', 'الاحتفاظ بالفاتورة', language)}</Button>
              <Button variant="danger" size="sm" loading={saving} onClick={handleCancel}>{t('Cancel Invoice', 'إلغاء الفاتورة', language)}</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeleteDraft}
        title={t('Delete draft?', 'حذف المسودة؟', language)}
        message={
          confirmDeleteDraft
            ? t(`Draft ${confirmDeleteDraft.invoiceNumber} will be permanently removed.`, `سيتم حذف المسودة ${confirmDeleteDraft.invoiceNumber} نهائياً.`, language)
            : undefined
        }
        confirmLabel={t('Delete', 'حذف', language)}
        onConfirm={() => confirmDeleteDraft && handleDeleteDraft(confirmDeleteDraft)}
        onClose={() => setConfirmDeleteDraft(null)}
      />
    </div>
  );
}
