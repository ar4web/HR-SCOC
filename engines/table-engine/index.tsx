'use client';

import React from 'react';
import { cn, t } from '@/lib/utils';
import { ChevronUp, ChevronDown, Inbox } from 'lucide-react';
import { MultiSelect, MultiSelectOption } from '@/components/ui/MultiSelect';

export interface Column<T> {
  key: string;
  header: string;
  headerAr?: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  searchable?: boolean;
  width?: string;
}

export interface DataFilter<T> {
  key: string;
  label: string;
  labelAr?: string;
  options: MultiSelectOption[];
  getValue: (item: T) => string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  locale?: 'en' | 'ar';
  dir?: 'ltr' | 'rtl';
  searchable?: boolean;
  searchPlaceholder?: string;
  searchPlaceholderAr?: string;
  emptyMessage?: string;
  emptyMessageAr?: string;
  onRowClick?: (item: T) => void;
  getRowKey: (item: T) => string;
  filters?: DataFilter<T>[] | DataFilter<T>;
}

export function DataTable<T>({
  columns,
  data,
  loading,
  locale = 'en',
  dir = 'ltr',
  searchable,
  emptyMessage,
  emptyMessageAr,
  onRowClick,
  getRowKey,
  filters,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');
  const [searchQuery] = React.useState('');
  const [filterValues, setFilterValues] = React.useState<Record<string, string[]>>({});

  const handleFilterChange = (key: string, value: string[]) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const filterList = React.useMemo(() => (Array.isArray(filters) ? filters : filters ? [filters] : []), [filters]);

  const values = React.useMemo(() => {
    let rows = data;
    if (filterList.length > 0 && Object.values(filterValues).some((v) => v.length > 0)) {
      rows = rows.filter((item) =>
        filterList.every((f) => {
          const selected = filterValues[f.key] || [];
          if (selected.length === 0) return true;
          return selected.includes(f.getValue(item));
        })
      );
    }
    if (searchable && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const searchCols = columns.filter((c) => c.searchable === undefined || c.searchable);
      rows = rows.filter((item) => {
        const record = item as unknown as Record<string, unknown>;
        return searchCols.some((col) => {
          const val = col.render ? stringifyCell(col.render(item)) : String(record[col.key] ?? '');
          return val.toLowerCase().includes(q);
        });
      });
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col) {
        const recordKey = col.key as keyof T;
        const sorted = [...rows].sort((a, b) => {
          const av = col.render ? String(col.render(a)) : String(a[recordKey] ?? '');
          const bv = col.render ? String(col.render(b)) : String(b[recordKey] ?? '');
          const cmp = av.localeCompare(bv, undefined, { numeric: true });
          return sortOrder === 'asc' ? cmp : -cmp;
        });
        rows = sorted;
      }
    }
    return rows;
  }, [data, searchable, searchQuery, sortKey, sortOrder, columns, filterList, filterValues]);

  return (
    <div className="space-y-4">
      {filterList.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {filterList.map((f) => (
            <MultiSelect
              key={f.key}
              label={f.label}
              labelAr={f.labelAr}
              locale={locale}
              options={f.options}
              value={filterValues[f.key] || []}
              onChange={(v) => handleFilterChange(f.key, v)}
            />
          ))}
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    'px-6 py-3.5 align-middle text-xs font-medium text-gray-500 uppercase tracking-wider',
                    col.sortable && 'cursor-pointer hover:text-gray-700 select-none',
                    dir === 'rtl' ? 'text-right' : 'text-left'
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                  aria-sort={
                    col.sortable && sortKey === col.key
                      ? sortOrder === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                >
                  <div className="flex items-center gap-1">
                    <span>{t(col.header, col.headerAr || col.header, locale)}</span>
                    {col.sortable && sortKey === col.key && (
                      sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12">
                  <div className="inline-flex items-center gap-2 text-gray-500">
                    <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                    <span className="text-sm">{t('Loading...', 'جار التحميل...', locale)}</span>
                  </div>
                </td>
              </tr>
            ) : values.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-14">
                  <div className="flex flex-col items-center gap-2 animate-fade-in">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                      <Inbox className="h-6 w-6 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-500">{t(emptyMessage || 'No data', emptyMessageAr || 'لا توجد بيانات', locale)}</p>
                  </div>
                </td>
              </tr>
            ) : (
              values.map((item) => (
                <tr
                  key={getRowKey(item)}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    'hover:bg-gray-50 transition-colors',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4 align-middle text-sm text-gray-600">
                      {col.render ? col.render(item) : String((item as unknown as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function stringifyCell(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return '';
}