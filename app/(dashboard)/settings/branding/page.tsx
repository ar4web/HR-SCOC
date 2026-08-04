'use client';

import React from 'react';
import { useCompanyStore } from '@/stores/company-store';
import { useLanguageStore } from '@/stores/language-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { t } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { Palette, Save, Upload } from 'lucide-react';

const themePresets = [
  {
    name: 'Saudi Emerald',
    primary: '#009B77',
    secondary: '#00205B',
    accent: '#FFC72C',
  },
  {
    name: 'Desert Gold',
    primary: '#C8A45C',
    secondary: '#4A3728',
    accent: '#E8D5A3',
  },
  {
    name: 'Red Sea',
    primary: '#1B7FBA',
    secondary: '#0A2C4E',
    accent: '#F5A623',
  },
  {
    name: 'Royal Purple',
    primary: '#6B3FA0',
    secondary: '#2D1B4E',
    accent: '#D4A5F5',
  },
];

export default function BrandingPage() {
  const { company, updateBranding } = useCompanyStore();
  const { language } = useLanguageStore();
  const { addToast } = useToast();
  const [primary, setPrimary] = React.useState('#009B77');
  const [secondary, setSecondary] = React.useState('#00205B');
  const [accent, setAccent] = React.useState('#FFC72C');

  React.useEffect(() => {
    if (company) {
      setPrimary(company.branding.primaryColor);
      setSecondary(company.branding.secondaryColor);
      setAccent(company.branding.accentColor);
    }
  }, [company]);

  const handleSave = () => {
    updateBranding({ ...company!.branding, primaryColor: primary, secondaryColor: secondary, accentColor: accent });
    addToast({ type: 'success', title: t('Branding updated!', 'تم تحديث العلامة التجارية!', language) });
  };

  const applyPreset = (preset: typeof themePresets[0]) => {
    setPrimary(preset.primary);
    setSecondary(preset.secondary);
    setAccent(preset.accent);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t('Branding & Themes', 'العلامة التجارية والسمات', language)}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {t('Customize your company appearance', 'تخصيص مظهر شركتك', language)}
        </p>
      </div>

      <Card>
        <CardHeader className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">{t('Theme Presets', 'السمات الجاهزة', language)}</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {themePresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="p-3 rounded-lg border border-gray-200 hover:border-primary transition-colors text-left"
              >
                <div className="flex gap-1 mb-2">
                  <div className="h-6 w-6 rounded" style={{ background: preset.primary }} />
                  <div className="h-6 w-6 rounded" style={{ background: preset.secondary }} />
                  <div className="h-6 w-6 rounded" style={{ background: preset.accent }} />
                </div>
                <p className="text-xs font-medium text-gray-700">{preset.name}</p>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">{t('Custom Colors', 'الألوان المخصصة', language)}</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: t('Primary', 'أساسي', language), value: primary, setter: setPrimary },
              { label: t('Secondary', 'ثانوي', language), value: secondary, setter: setSecondary },
              { label: t('Accent', 'مميز', language), value: accent, setter: setAccent },
            ].map((c) => (
              <div key={c.label}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{c.label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={c.value}
                    onChange={(e) => c.setter(e.target.value)}
                    className="h-10 w-10 rounded cursor-pointer border border-gray-300"
                  />
                  <input
                    type="text"
                    value={c.value}
                    onChange={(e) => c.setter(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 flex gap-3">
            <Button onClick={handleSave}>
              <Save className="h-4 w-4" />
              {t('Save Branding', 'حفظ العلامة التجارية', language)}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
