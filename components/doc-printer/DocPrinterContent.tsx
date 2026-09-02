'use client';

/**
 * Doc Printer — complete bilingual HR document generator.
 *
 * - 12 templates: employment contract → resignation letter → certificates,
 *   warnings, clearance, requests — grouped by category.
 * - Employee picker auto-fills every placeholder from live HR data.
 * - Full edit: every paragraph (EN & AR), title and ref are editable inline
 *   before printing.
 * - Branding assets: logo, official seal, signature uploads (persisted).
 * - Paper sizes: A4 / Letter / A5 / Legal, applied on screen and in @page.
 * - Layout: English LTR on the left, Arabic RTL on the right, row-aligned.
 */

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { hasPermission } from '@/lib/rbac';
import { employeeService } from '@/modules/employee-management/service';
import { companyService } from '@/modules/company/service';
import { api } from '@/lib/api';
import { Employee, Company, DocPrinterAssets } from '@/types';
import { t } from '@/lib/utils';
import PageHeader, { HeaderAction } from '@/components/layout/PageHeader';
import { usePageSearch } from '@/stores/search-store';
import { DocSheet, DocSheetData } from '@/components/doc-printer/DocSheet';
import {
  DOC_TEMPLATES, DOC_CATEGORIES, DocTemplate, PaperSize, PAPER_SIZES,
  buildMergeMap, mergeText,
} from '@/lib/doc-templates';
import {
  Printer, FileSignature, ChevronLeft, Stamp, ImageIcon, PenLine,
  X, RotateCcw, FileText, UserRound, Settings2, Pencil, Check,
} from 'lucide-react';

const PAPER_KEY = 'hrscoc-docprinter-paper';

export function DocPrinterContent() {
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const canManage = hasPermission(user?.role, 'employee:manage');
  const search = usePageSearch('/doc-printer', 'Search documents…', 'ابحث عن نماذج…');

  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [company, setCompany] = React.useState<Company | null>(null);
  const [assets, setAssets] = React.useState<DocPrinterAssets>({});
  const [template, setTemplate] = React.useState<DocTemplate | null>(null);
  const [employeeId, setEmployeeId] = React.useState('');
  const [paper, setPaper] = React.useState<PaperSize>('a4');
  const [showSeal, setShowSeal] = React.useState(true);
  const [showAssets, setShowAssets] = React.useState(false);
  const [savingAssets, setSavingAssets] = React.useState(false);
  const [editing, setEditing] = React.useState(false);

  /* editable document state (populated on template/employee change) */
  const [doc, setDoc] = React.useState<DocSheetData | null>(null);

  const logoRef = React.useRef<HTMLInputElement>(null);
  const sealRef = React.useRef<HTMLInputElement>(null);
  const sigRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    (async () => {
      const [empRes, coRes, assetRes] = await Promise.all([
        employeeService.list({ pageSize: 500 }),
        companyService.get(),
        api.get<DocPrinterAssets>('/doc-printer'),
      ]);
      if (empRes.success && empRes.data) setEmployees(empRes.data.data);
      if (coRes.success && coRes.data) setCompany(coRes.data);
      if (assetRes.success && assetRes.data) setAssets(assetRes.data);
    })();
    try {
      const saved = localStorage.getItem(PAPER_KEY) as PaperSize | null;
      if (saved && PAPER_SIZES[saved]) setPaper(saved);
    } catch {}
  }, []);

  React.useEffect(() => {
    try { localStorage.setItem(PAPER_KEY, paper); } catch {}
  }, [paper]);

  const employee = employees.find((e) => e.id === employeeId) || null;

  /* regenerate doc whenever template or employee changes */
  React.useEffect(() => {
    if (!template) { setDoc(null); return; }
    const map = buildMergeMap(employee, company, '');
    const salaryRows = template.salaryTable && employee ? [
      { labelEn: 'Basic Salary', labelAr: 'الراتب الأساسي', value: fmt(employee.salary.basic) },
      { labelEn: 'Housing Allowance', labelAr: 'بدل السكن', value: fmt(employee.salary.housing) },
      { labelEn: 'Transportation', labelAr: 'بدل النقل', value: fmt(employee.salary.transportation) },
      { labelEn: 'Other Allowances', labelAr: 'بدلات أخرى', value: fmt(employee.salary.otherAllowances) },
      { labelEn: 'Total Monthly Salary', labelAr: 'إجمالي الراتب الشهري', value: fmt(employee.salary.total) },
    ] : undefined;
    setDoc({
      titleEn: template.title.en,
      titleAr: template.title.ar,
      refNumber: `HR/${template.id.split('-')[0].toUpperCase()}/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 900) + 100)}`,
      dateStr: new Date().toISOString().slice(0, 10),
      paragraphsEn: template.body.en.map((p) => mergeText(p, map)),
      paragraphsAr: template.body.ar.map((p) => mergeText(p, map)),
      salaryRows,
      employeeSigns: template.employeeSigns,
      employeeName: employee?.fullName,
      employeeNameAr: employee?.fullNameAr,
      companyName: company?.name || 'Company',
      companyNameAr: company?.nameAr || company?.name || 'الشركة',
    });
    setEditing(false);
  }, [template, employee, company]);

  function fmt(n: number): string {
    return new Intl.NumberFormat('en-US').format(n);
  }

  /* ---------------- asset upload ---------------- */

  const uploadAsset = (key: 'logo' | 'seal' | 'signature') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast({ type: 'error', title: t('Please choose an image file', 'يرجى اختيار ملف صورة', language) });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      addToast({ type: 'error', title: t('Image too large — 2 MB max', 'الصورة كبيرة جداً — الحد الأقصى 2 ميجابايت', language) });
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const res = await api.put<DocPrinterAssets>('/doc-printer', { [key]: String(reader.result) });
      if (res.success && res.data) {
        setAssets(res.data);
        addToast({ type: 'success', title: t('Uploaded', 'تم الرفع', language) });
      } else {
        addToast({ type: 'error', title: res.error || t('Upload failed', 'فشل الرفع', language) });
      }
    };
    reader.readAsDataURL(file);
  };

  const clearAsset = async (key: 'logo' | 'seal' | 'signature') => {
    const res = await api.put<DocPrinterAssets>('/doc-printer', { [key]: '' });
    if (res.success && res.data) setAssets(res.data);
  };

  const saveSignatory = async () => {
    setSavingAssets(true);
    const res = await api.put<DocPrinterAssets>('/doc-printer', {
      signatoryName: assets.signatoryName || '',
      signatoryTitle: assets.signatoryTitle || '',
      signatoryTitleAr: assets.signatoryTitleAr || '',
    });
    setSavingAssets(false);
    if (res.success && res.data) {
      setAssets(res.data);
      setShowAssets(false);
      addToast({ type: 'success', title: t('Branding saved', 'تم حفظ الهوية', language) });
    }
  };

  /* ---------------- filtering ---------------- */

  const q = search.trim().toLowerCase();
  const visibleTemplates = DOC_TEMPLATES.filter(
    (tp) => !q || tp.title.en.toLowerCase().includes(q) || tp.title.ar.includes(q) || tp.id.includes(q)
  );

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
      active ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
    }`;

  const field = 'block w-full rounded-md border-0 bg-gray-100 px-3 py-2 text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40';

  const editField = 'w-full rounded-md border-0 bg-amber-50 px-2 py-1.5 text-[12.5px] leading-6 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40';

  /* ================================================================ */

  if (!canManage) {
    return (
      <div className="space-y-6">
        <PageHeader icon={FileSignature} title={t('Doc Printer', 'طابعة المستندات', language)} />
        <Card><CardBody><p className="py-10 text-center text-sm text-gray-400">{t('HR managers only.', 'لمديري الموارد البشرية فقط.', language)}</p></CardBody></Card>
      </div>
    );
  }

  /* ---------------- template gallery ---------------- */
  if (!template || !doc) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={FileSignature}
          title={t('Doc Printer', 'طابعة المستندات', language)}
          subtitle={t('Bilingual HR documents — contract to resignation, print-ready', 'مستندات موارد بشرية ثنائية اللغة — من العقد إلى الاستقالة، جاهزة للطباعة', language)}
          actions={<HeaderAction icon={Settings2} label={t('Branding & Seal', 'الهوية والختم', language)} onClick={() => setShowAssets(true)} />}
        />
        {DOC_CATEGORIES.map((cat) => {
          const items = visibleTemplates.filter((tp) => tp.category === cat.id);
          if (!items.length) return null;
          return (
            <Card key={cat.id}>
              <CardBody>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{t(cat.en, cat.ar, language)}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((tp) => (
                    <button
                      key={tp.id}
                      onClick={() => setTemplate(tp)}
                      className="group flex items-center gap-3 rounded-md bg-gray-50 p-4 text-start transition-colors hover:bg-primary/5"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                        <FileText className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-gray-900 group-hover:text-primary">
                          {language === 'ar' ? tp.title.ar : tp.title.en}
                        </span>
                        <span className="block truncate text-xs text-gray-400" dir={language === 'ar' ? 'ltr' : 'rtl'}>
                          {language === 'ar' ? tp.title.en : tp.title.ar}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </CardBody>
            </Card>
          );
        })}
        {renderAssetsModal()}
      </div>
    );
  }

  /* ---------------- editor + preview ---------------- */
  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileSignature}
        title={language === 'ar' ? template.title.ar : template.title.en}
        subtitle={language === 'ar' ? template.title.en : template.title.ar}
        actions={
          <>
            <HeaderAction icon={ChevronLeft} label={t('All templates', 'كل النماذج', language)} onClick={() => setTemplate(null)} />
            <HeaderAction icon={editing ? Check : Pencil} label={editing ? t('Done editing', 'إنهاء التحرير', language) : t('Edit text', 'تحرير النص', language)} onClick={() => setEditing((v) => !v)} />
            <HeaderAction icon={RotateCcw} label={t('Reset text', 'إعادة تعيين النص', language)} onClick={() => { const tp = template; setTemplate(null); setTimeout(() => setTemplate(tp), 0); }} />
            <HeaderAction icon={Settings2} label={t('Branding & Seal', 'الهوية والختم', language)} onClick={() => setShowAssets(true)} />
            <HeaderAction icon={Printer} label={t('Print', 'طباعة', language)} primary onClick={() => window.print()} />
          </>
        }
      />

      {/* toolbar */}
      <Card className="no-print">
        <CardBody className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-gray-400" />
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={`${field} w-56`}>
              <option value="">{t('— Choose employee —', '— اختر الموظف —', language)}</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {language === 'ar' ? e.fullNameAr || e.fullName : e.fullName} ({e.employeeId})
                </option>
              ))}
            </select>
          </div>
          <span className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-1.5">
            {(Object.keys(PAPER_SIZES) as PaperSize[]).map((p) => (
              <button key={p} onClick={() => setPaper(p)} className={chip(paper === p)}>
                {t(PAPER_SIZES[p].en.split(' ')[0], PAPER_SIZES[p].ar.split(' ')[0], language)}
              </button>
            ))}
          </div>
          <span className="h-4 w-px bg-gray-200" />
          <button onClick={() => setShowSeal((v) => !v)} className={chip(showSeal)}>
            <Stamp className="me-1 inline h-3.5 w-3.5" />
            {t('Seal', 'الختم', language)}
          </button>
          <div className="flex-1" />
          <p className="text-xs text-gray-400">
            {t(PAPER_SIZES[paper].en, PAPER_SIZES[paper].ar, language)}
          </p>
        </CardBody>
      </Card>

      {/* inline editor */}
      {editing && (
        <Card className="no-print">
          <CardBody className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label={t('Title (EN)', 'العنوان (إنجليزي)', language)} value={doc.titleEn} onChange={(e) => setDoc({ ...doc, titleEn: e.target.value })} />
              <Input label={t('Title (AR)', 'العنوان (عربي)', language)} value={doc.titleAr} onChange={(e) => setDoc({ ...doc, titleAr: e.target.value })} />
              <Input label={t('Reference No.', 'الرقم المرجعي', language)} value={doc.refNumber} onChange={(e) => setDoc({ ...doc, refNumber: e.target.value })} />
              <Input label={t('Date', 'التاريخ', language)} type="date" value={doc.dateStr} onChange={(e) => setDoc({ ...doc, dateStr: e.target.value })} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('Paragraphs — English left, Arabic right', 'الفقرات — الإنجليزية يساراً والعربية يميناً', language)}</p>
            {doc.paragraphsEn.map((p, i) => (
              <div key={i} className="grid grid-cols-2 gap-3">
                <textarea
                  className={editField}
                  rows={Math.max(2, Math.ceil(p.length / 90))}
                  value={p}
                  dir="ltr"
                  onChange={(e) => setDoc({ ...doc, paragraphsEn: doc.paragraphsEn.map((x, j) => (j === i ? e.target.value : x)) })}
                />
                <textarea
                  className={`${editField} text-right leading-7`}
                  rows={Math.max(2, Math.ceil((doc.paragraphsAr[i] || '').length / 70))}
                  value={doc.paragraphsAr[i] || ''}
                  dir="rtl"
                  onChange={(e) => setDoc({ ...doc, paragraphsAr: doc.paragraphsAr.map((x, j) => (j === i ? e.target.value : x)) })}
                />
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* the sheet */}
      <div className="overflow-x-auto pb-4">
        <DocSheet data={doc} assets={assets} paper={paper} showSeal={showSeal} />
      </div>

      {renderAssetsModal()}
    </div>
  );

  /* ---------------- assets modal ---------------- */
  function renderAssetsModal() {
    if (!showAssets) return null;
    const tile = (
      label: string, labelAr: string, value: string | undefined,
      ref: React.RefObject<HTMLInputElement>, key: 'logo' | 'seal' | 'signature',
      icon: React.ReactNode
    ) => (
      <div className="rounded-md bg-gray-50 p-3 text-center">
        <p className="mb-2 text-xs font-semibold text-gray-500">{t(label, labelAr, language)}</p>
        <div className="grid h-24 place-items-center overflow-hidden rounded-md bg-white">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={label} className="max-h-20 max-w-full object-contain" />
          ) : (
            <span className="text-gray-200">{icon}</span>
          )}
        </div>
        <div className="mt-2 flex items-center justify-center gap-2">
          <button onClick={() => ref.current?.click()} className="text-xs font-medium text-primary hover:underline">
            {value ? t('Replace', 'استبدال', language) : t('Upload', 'رفع', language)}
          </button>
          {value && (
            <button onClick={() => clearAsset(key)} className="text-xs font-medium text-error hover:underline">
              {t('Remove', 'إزالة', language)}
            </button>
          )}
        </div>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={uploadAsset(key)} />
      </div>
    );
    return (
      <div
        className="no-print fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-10 animate-fade-in"
        role="dialog" aria-modal="true"
        onClick={() => setShowAssets(false)}
      >
        <div className="w-full max-w-xl rounded-md bg-white shadow-modal animate-slide-in" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 pt-5">
            <h2 className="text-base font-semibold text-gray-900">{t('Branding, Seal & Signature', 'الهوية والختم والتوقيع', language)}</h2>
            <button onClick={() => setShowAssets(false)} className="rounded-md p-1 text-gray-300 hover:bg-gray-100 hover:text-gray-500" aria-label={t('Close', 'إغلاق', language)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-4 px-6 py-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {tile('Company Logo', 'شعار الشركة', assets.logo, logoRef, 'logo', <ImageIcon className="h-8 w-8" />)}
              {tile('Official Seal', 'الختم الرسمي', assets.seal, sealRef, 'seal', <Stamp className="h-8 w-8" />)}
              {tile('Signature', 'التوقيع', assets.signature, sigRef, 'signature', <PenLine className="h-8 w-8" />)}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input label={t('Signatory Name', 'اسم الموقّع', language)} value={assets.signatoryName || ''} onChange={(e) => setAssets({ ...assets, signatoryName: e.target.value })} />
              <Input label={t('Title (EN)', 'المسمى (إنجليزي)', language)} value={assets.signatoryTitle || ''} onChange={(e) => setAssets({ ...assets, signatoryTitle: e.target.value })} />
              <Input label={t('Title (AR)', 'المسمى (عربي)', language)} value={assets.signatoryTitleAr || ''} onChange={(e) => setAssets({ ...assets, signatoryTitleAr: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 px-6 pb-5">
            <Button variant="ghost" onClick={() => setShowAssets(false)}>{t('Close', 'إغلاق', language)}</Button>
            <Button loading={savingAssets} onClick={saveSignatory}>{t('Save', 'حفظ', language)}</Button>
          </div>
        </div>
      </div>
    );
  }
}
