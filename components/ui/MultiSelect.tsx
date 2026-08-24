'use client';

import React from 'react';
import { cn, t } from '@/lib/utils';
import { Check, ChevronDown, X } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
  labelAr?: string;
}

interface MultiSelectProps {
  label: string;
  labelAr?: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  locale?: 'en' | 'ar';
  className?: string;
}

export function MultiSelect({ label, labelAr, options, value, onChange, locale = 'en', className }: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:border-gray-300 transition-colors max-w-[260px]',
          open && 'border-primary ring-2 ring-primary/10'
        )}
      >
        <span className="truncate">
          {t(label, labelAr || label, locale)}
          {value.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-semibold min-w-[18px] h-[18px] px-1">
              {value.length}
            </span>
          )}
        </span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-gray-400 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute z-30 mt-1.5 w-56 rounded-lg bg-white shadow-xl shadow-gray-200/60 py-1.5 max-h-72 overflow-y-auto">
          {options.map((opt) => {
            const selected = value.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50',
                  selected && 'text-primary font-semibold'
                )}
              >
                <span>{t(opt.label, opt.labelAr || opt.label, locale)}</span>
                <span
                  className={cn(
                    'flex items-center justify-center h-4 w-4 rounded border transition-colors',
                    selected ? 'bg-primary border-primary text-white' : 'border-gray-300 bg-white text-transparent'
                  )}
                >
                  <Check className="h-3 w-3" />
                </span>
              </button>
            );
          })}
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full flex items-center gap-1.5 px-3 py-2 text-xs text-gray-500 hover:text-error border-t border-gray-100 mt-1"
            >
              <X className="h-3 w-3" /> {t('Clear selection', 'مسح التحديد', locale)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}