'use client';

import React from 'react';
import { useCompanyStore } from '@/stores/company-store';
import { useLanguageStore } from '@/stores/language-store';
import { useTheme } from '@/engines/theme-engine';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { t } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { THEME_PRESETS, TOKEN_FIELDS, tokensToBranding, type ThemePreset } from '@/lib/theme-tokens';
import { Palette, Save } from 'lucide-react';

export default function ThemeStudioPage() {
  const { language } = useLanguageStore();
  const { addToast } = useToast();
  const { company, updateBranding } = useCompanyStore();
  const { tokens, setLiveTokens, themeCode } = useTheme();
  const [draft, setDraft] = React.useState(tokens);
  const [code, setCode] = React.useState(themeCode);
  const [prevTokens, setPrevTokens] = React.useState(tokens);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (prevTokens !== tokens) {
      setPrevTokens(tokens);
      setDraft(tokens);
      setCode(themeCode);
    }
  }, [tokens, themeCode, prevTokens]);

  const paint = (next: typeof tokens, nextCode?: string) => {
    setDraft(next);
    setLiveTokens(next);
    if (nextCode) setCode(nextCode);
  };

  const handleSave = async () => {
    if (!company) return;
    setSaving(true);
    try {
      const result = await updateBranding(tokensToBranding(draft, company.branding));
      if (result?.success === false) {
        addToast({ type: 'error', title: result.error || t('Failed to save theme', 'فشل حفظ الثيم', language) });
        return;
      }
      addToast({
        type: 'success',
        title: t('Theme saved and activated', 'تم حفظ الثيم وتفعيله', language),
      });
    } finally {
      setSaving(false);
    }
  };

  const groups = ['Brand', 'Chrome', 'Surfaces', 'Status'];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Theme Studio', 'استوديو الثيم', language)}
        subtitle={t('Pick a preset or fine-tune every color token. Changes apply live, save to persist.', 'اختر قالباً أو عدّل كل لون مباشرة. التغييرات تظهر فوراً، احفظ لتثبيتها.', language)}
        actions={
          <Button onClick={handleSave} loading={saving} title={t('Save Theme', 'حفظ الثيم', language)} aria-label={t('Save Theme', 'حفظ الثيم', language)}>
            <Save className="h-4 w-4" />
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {THEME_PRESETS.map((p: ThemePreset) => (
          <button
            key={p.code}
            onClick={() => paint(p.tokens, p.code)}
            className={`card p-4 text-start transition-colors hover:border-primary/40 ${
              code === p.code ? 'ring-2 ring-accent' : ''
            }`}
          >
            <div className="mb-2.5 flex h-10 overflow-hidden rounded-md">
              {[p.tokens.brand, p.tokens.accent, p.tokens.sidebar, p.tokens.paper, p.tokens.ok].map((c, i) => (
                <span key={i} className="flex-1" style={{ background: c }} />
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-[14.5px] font-semibold text-gray-900">{language === 'ar' ? p.nameAr : p.name}</div>
              {code === p.code && (
                <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                  {t('live', 'مفعّل', language)}
                </span>
              )}
            </div>
            <p className="mt-1 text-[12px] text-gray-500">{p.blurb}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{t('Color tokens — live edit', 'رموز الألوان — تعديل مباشر', language)}</h2>
              <p className="text-xs text-gray-500">{t('Every color in the app, grouped.', 'كل ألوان التطبيق، مجمّعة.', language)}</p>
            </div>
          </CardHeader>
          <CardBody>
            {groups.map((g) => (
              <div key={g} className="mb-5">
                <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-gray-400">{g}</div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {TOKEN_FIELDS.filter((f) => f.group === g && f.key !== 'radius').map((f) => (
                    <label
                      key={f.key}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2"
                    >
                      <input
                        type="color"
                        className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent"
                        value={String(draft[f.key])}
                        onChange={(e) => paint({ ...draft, [f.key]: e.target.value })}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-semibold text-gray-700">
                          {language === 'ar' ? f.labelAr : f.label}
                        </span>
                        <span className="block font-mono text-[10px] text-gray-400">{String(draft[f.key])}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <div className="space-y-3 self-start">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('Live preview', 'معاينة مباشرة', language)}</div>
          <div className="card overflow-hidden">
            <div className="px-4 py-3 text-white" style={{ background: draft.sidebar }}>
              <div className="text-[15px] font-bold">{language === 'ar' ? 'مركز الموارد البشرية' : 'HR Center'}</div>
              <div className="mt-2 h-6 rounded" style={{ background: draft.brand, width: '70%' }} />
              <div className="mt-1.5 h-6 rounded opacity-50" style={{ background: draft.sidebarText, width: '55%' }} />
            </div>
            <div className="p-4" style={{ background: draft.paper, color: draft.ink }}>
              <div className="mb-2 text-[16px] font-semibold">{language === 'ar' ? 'بيان الموظف' : 'Employee Statement'}</div>
              <div className="mb-3 h-1.5 rounded" style={{ background: draft.accent, width: 80 }} />
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr style={{ borderBottom: `1.5px solid ${draft.brand}` }}>
                    <th className="py-1 text-start">{language === 'ar' ? 'البنود' : 'Item'}</th>
                    <th className="py-1 text-end">{language === 'ar' ? 'المبلغ' : 'Amt'}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-1">{language === 'ar' ? 'الراتب الأساسي' : 'Base Salary'}</td>
                    <td className="py-1 text-end font-mono">12,500</td>
                  </tr>
                  <tr>
                    <td className="py-1" style={{ color: draft.muted }}>
                      {language === 'ar' ? 'البدلات' : 'Allowances'}
                    </td>
                    <td className="py-1 text-end font-mono">1,250</td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-3 flex gap-1.5">
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: draft.okSoft, color: draft.ok }}>
                  {language === 'ar' ? 'ساري' : 'LIVE'}
                </span>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: draft.accentSoft, color: draft.brand }}>
                  {language === 'ar' ? 'ذهبي' : 'GOLD'}
                </span>
              </div>
            </div>
          </div>
          <p className="text-[12px] leading-relaxed text-gray-500">
            {language === 'ar'
              ? 'التغييرات تظهر فوراً على الشريط والقوائم والجداول. احفظ لتثبيتها لكل المستخدمين.'
              : 'Changes paint the chrome, tables and documents instantly. Save to persist for every user.'}
          </p>
        </div>
      </div>
    </div>
  );
}