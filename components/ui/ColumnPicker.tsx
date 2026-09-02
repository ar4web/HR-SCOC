'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { t } from '@/lib/utils';
import { Columns3, Check } from 'lucide-react';
import type { ColumnPickerColumn } from '@/types';

interface ColumnPickerProps {
  columns: ColumnPickerColumn[];
  visibleKeys: string[];
  onChange: (keys: string[]) => void;
}

export function ColumnPicker({ columns, visibleKeys, onChange }: ColumnPickerProps) {
  const { language } = useLanguageStore();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const groups = React.useMemo(() => {
    const map = new Map<string, ColumnPickerColumn[]>();
    for (const col of columns) {
      const g = col.group;
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(col);
    }
    return Array.from(map.entries());
  }, [columns]);

  const filtered = React.useMemo(() => {
    if (!search) return groups;
    const q = search.toLowerCase();
    return groups
      .map(([g, cols]) => [g, cols.filter((c) => c.label.toLowerCase().includes(q) || c.labelAr.includes(q))] as const)
      .filter(([, cols]) => cols.length > 0);
  }, [groups, search]);

  const allVisible = visibleKeys.length === columns.length;
  const noneVisible = visibleKeys.length === 0;

  const toggleAll = () => {
    onChange(allVisible ? [] : columns.map((c) => c.key));
  };

  const toggleGroup = (group: string) => {
    const groupKeys = columns.filter((c) => c.group === group).map((c) => c.key);
    const allGroupVisible = groupKeys.every((k) => visibleKeys.includes(k));
    if (allGroupVisible) {
      onChange(visibleKeys.filter((k) => !groupKeys.includes(k)));
    } else {
      onChange([...new Set([...visibleKeys, ...groupKeys])]);
    }
  };

  const toggleCol = (key: string) => {
    onChange(visibleKeys.includes(key) ? visibleKeys.filter((k) => k !== key) : [...visibleKeys, key]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        title={t('Columns', 'الأعمدة', language)}
        aria-label={t('Columns', 'الأعمدة', language)}
        className="rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
      >
        <Columns3 className="h-[18px] w-[18px]" />
      </button>

      {open && (
        <div className="absolute right-0 rtl:left-0 z-50 mt-2 w-72 rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('Search columns...', 'بحث في الأعمدة...', language)}
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            <button
              onClick={toggleAll}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <div className={`flex h-4 w-4 items-center justify-center rounded border ${allVisible ? 'border-primary bg-primary' : noneVisible ? 'border-gray-300' : 'border-primary bg-primary/20'}`}>
                {allVisible && <Check className="h-3 w-3 text-white" />}
                {!allVisible && !noneVisible && <div className="h-1.5 w-1.5 rounded-sm bg-primary" />}
              </div>
              {t('Select All', 'تحديد الكل', language)}
            </button>

            {filtered.map(([group, cols]) => {
              const groupVisible = cols.filter((c) => visibleKeys.includes(c.key)).length;
              const allGroupVis = groupVisible === cols.length;
              const someGroupVis = groupVisible > 0 && !allGroupVis;

              return (
                <div key={group} className="mt-2">
                  <button
                    onClick={() => toggleGroup(group)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:bg-gray-50"
                  >
                    <div className={`flex h-4 w-4 items-center justify-center rounded border ${allGroupVis ? 'border-primary bg-primary' : someGroupVis ? 'border-primary bg-primary/20' : 'border-gray-300'}`}>
                      {allGroupVis && <Check className="h-3 w-3 text-white" />}
                      {someGroupVis && <div className="h-1.5 w-1.5 rounded-sm bg-primary" />}
                    </div>
                    {t(group, cols[0]?.groupAr || group, language)}
                  </button>

                  {cols.map((col) => {
                    const visible = visibleKeys.includes(col.key);
                    return (
                      <button
                        key={col.key}
                        onClick={() => toggleCol(col.key)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 pl-6 text-sm text-gray-600 hover:bg-gray-50"
                      >
                        <div className={`flex h-4 w-4 items-center justify-center rounded border ${visible ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                          {visible && <Check className="h-3 w-3 text-white" />}
                        </div>
                        {t(col.label, col.labelAr, language)}
                      </button>
                    );
                  })}
                </div>
              );
            })}

            {filtered.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-400">
                {t('No columns found', 'لم يتم العثور على أعمدة', language)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
