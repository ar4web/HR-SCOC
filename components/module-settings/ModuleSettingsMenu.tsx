'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useLanguageStore } from '@/stores/language-store';
import { t } from '@/lib/utils';
import { Settings2, Download, Cable, ExternalLink } from 'lucide-react';

interface ModuleSettingsMenuProps {
  module: string;
  moduleAr?: string;
  onExport?: () => void;
  href?: string;
}

export function ModuleSettingsMenu({ module, moduleAr, onExport, href }: ModuleSettingsMenuProps) {
  const router = useRouter();
  const { language } = useLanguageStore();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [open]);

  return (
    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('Module settings', 'إعدادات الوحدة', language)}
        className="rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
      >
        <Settings2 className="h-[18px] w-[18px]" />
      </button>

      {open && (
        <div className="absolute end-0 top-full mt-2 z-50 w-60 rounded-xl border border-gray-200 bg-white shadow-lg p-1.5">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {module}
            {moduleAr ? ` · ${moduleAr}` : ''}
          </div>

          {onExport && (
            <button
              type="button"
              onClick={() => {
                onExport();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-primary/5 hover:text-primary transition-colors"
            >
              <Download className="h-4 w-4" />
              {t('Export CSV', 'تصدير CSV', language)}
            </button>
          )}

          {href && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push(href);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-primary/5 hover:text-primary transition-colors"
            >
              <Cable className="h-4 w-4" />
              {t('Module settings', 'إعدادات الوحدة', language)}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push('/settings/modules');
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-primary/5 hover:text-primary transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            {t('Enable / disable modules', 'تفعيل / تعطيل الوحدات', language)}
          </button>
        </div>
      )}
    </div>
  );
}