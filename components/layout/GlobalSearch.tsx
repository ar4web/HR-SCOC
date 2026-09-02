'use client';

/**
 * The ONE search bar for the whole app (lives in the header).
 *
 * Two behaviors, automatically switched:
 *  1. Page scope active (page registered via usePageSearch): typing filters
 *     that page live — the page consumes the query from the search store.
 *  2. No scope (or results wanted app-wide): a navigator dropdown searches
 *     employees / leaves / payroll / todos across the app.
 *     With a scope active, the dropdown still opens with cross-app results
 *     below a "on this page" hint, so both purposes are always served.
 *
 * ⌘K / Ctrl-K focuses it from anywhere. Esc clears + blurs.
 */

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguageStore } from '@/stores/language-store';
import { useSearchStore } from '@/stores/search-store';
import { t } from '@/lib/utils';
import { employeeService } from '@/modules/employee-management/service';
import { payrollService } from '@/modules/payroll/service';
import { api } from '@/lib/api';
import { Employee, LeaveRequest, Payroll, Todo } from '@/types';
import { Search, Briefcase, CalendarDays, Users, ListTodo, CornerDownLeft, X, TextCursorInput } from 'lucide-react';

interface ResultItem {
  key: string;
  label: string;
  sub: string;
  href: string;
  group: 'employees' | 'leaves' | 'payroll' | 'todos';
}

const GROUP_META: Record<ResultItem['group'], { label: string; labelAr: string; icon: React.ReactNode }> = {
  employees: { label: 'Employees', labelAr: 'الموظفون', icon: <Users className="h-4 w-4" /> },
  leaves: { label: 'Leaves', labelAr: 'الإجازات', icon: <CalendarDays className="h-4 w-4" /> },
  payroll: { label: 'Payroll', labelAr: 'الرواتب', icon: <Briefcase className="h-4 w-4" /> },
  todos: { label: 'To-Do', labelAr: 'المهام', icon: <ListTodo className="h-4 w-4" /> },
};

export function GlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const { language } = useLanguageStore();
  const { query, setQuery, scope } = useSearchStore();
  const [open, setOpen] = React.useState(false);
  const [focused, setFocused] = React.useState(0);

  const employeesRef = React.useRef<Employee[]>([]);
  const leavesRef = React.useRef<LeaveRequest[]>([]);
  const payrollRef = React.useRef<Payroll[]>([]);
  const todosRef = React.useRef<Todo[]>([]);
  const loadedRef = React.useRef(false);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  /* clear query on navigation so a filter never leaks between pages */
  React.useEffect(() => {
    setQuery('');
    setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  /* lazy-load the cross-app index on first focus */
  const ensureIndex = React.useCallback(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    Promise.all([
      employeeService.list({ page: 1, pageSize: 1000 }),
      api.get<{ data: LeaveRequest[] }>('/leaves'),
      payrollService.list({}),
      api.get<{ data: Todo[] }>('/todos'),
    ]).then(([empsRes, leavesRes, payrollRes, todosRes]) => {
      if (empsRes.success && empsRes.data) employeesRef.current = empsRes.data.data;
      if (leavesRes.success && Array.isArray(leavesRes.data?.data)) leavesRef.current = leavesRes.data.data;
      if (payrollRes.success && payrollRes.data) payrollRef.current = payrollRes.data.data;
      if (todosRes.success && Array.isArray(todosRes.data?.data)) todosRef.current = todosRes.data.data;
    });
  }, []);

  /* ⌘K / Ctrl-K focuses the bar from anywhere */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        ensureIndex();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [ensureIndex]);

  /* close dropdown on outside click / Esc */
  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const empById = React.useCallback(
    (id: string): Employee | undefined => employeesRef.current.find((e) => e.id === id),
    []
  );

  const results = React.useMemo<ResultItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: ResultItem[] = [];

    for (const e of employeesRef.current) {
      const hay = [e.fullName, e.fullNameAr, e.email, e.employeeId, e.department, e.position, e.nationalId].join(' ').toLowerCase();
      if (hay.includes(q)) {
        out.push({
          key: `emp-${e.id}`,
          label: language === 'ar' ? e.fullNameAr || e.fullName : e.fullName,
          sub: `${e.employeeId} · ${e.department} · ${e.position}`,
          href: `/employees/${e.id}`,
          group: 'employees',
        });
      }
      if (out.filter((r) => r.group === 'employees').length >= 5) break;
    }

    for (const l of leavesRef.current) {
      const emp = empById(l.employeeId);
      const hay = [emp?.fullName || '', emp?.fullNameAr || '', emp?.employeeId || '', l.type, l.status, l.reason].join(' ').toLowerCase();
      if (hay.includes(q)) {
        out.push({
          key: `leave-${l.id}`,
          label: emp ? (language === 'ar' ? emp.fullNameAr || emp.fullName : emp.fullName) : l.employeeId,
          sub: `${l.type} · ${l.startDate} → ${l.endDate} · ${l.status}`,
          href: `/leaves/${l.id}`,
          group: 'leaves',
        });
      }
      if (out.filter((r) => r.group === 'leaves').length >= 5) break;
    }

    for (const p of payrollRef.current) {
      const hay = [p.employeeName, p.employeeDisplayId, p.period, p.status].join(' ').toLowerCase();
      if (hay.includes(q)) {
        out.push({
          key: `pay-${p.id}`,
          label: p.employeeName || p.employeeDisplayId || p.employeeId,
          sub: `${p.period} · ${p.status}`,
          href: `/payroll`,
          group: 'payroll',
        });
      }
      if (out.filter((r) => r.group === 'payroll').length >= 5) break;
    }

    for (const todo of todosRef.current) {
      const hay = [todo.title, todo.description, todo.category, todo.assignee, todo.status, todo.priority].join(' ').toLowerCase();
      if (hay.includes(q)) {
        out.push({
          key: `todo-${todo.id}`,
          label: todo.title,
          sub: `${todo.priority} · ${todo.status}`,
          href: `/todos`,
          group: 'todos',
        });
      }
      if (out.filter((r) => r.group === 'todos').length >= 5) break;
    }

    return out;
  }, [query, language, empById]);

  React.useEffect(() => {
    setFocused(0);
  }, [results.length]);

  const go = (item?: ResultItem) => {
    if (!item) return;
    setOpen(false);
    setQuery('');
    router.push(item.href);
  };

  const grouped = React.useMemo(() => {
    const order: ResultItem['group'][] = ['employees', 'leaves', 'payroll', 'todos'];
    const map = new Map<ResultItem['group'], ResultItem[]>();
    for (const g of order) map.set(g, []);
    for (const r of results) map.get(r.group)?.push(r);
    return map;
  }, [results]);

  const placeholder = scope
    ? t(scope.placeholder, scope.placeholderAr, language)
    : t('Search anything…', 'ابحث عن أي شيء…', language);

  /* with a scope: dropdown only opens when there are cross-app hits */
  const showDropdown = open && query.trim().length > 0 && (!scope || results.length > 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            ensureIndex();
          }}
          onFocus={() => {
            ensureIndex();
            if (!scope) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setQuery('');
              setOpen(false);
              (e.target as HTMLInputElement).blur();
            } else if (showDropdown && e.key === 'ArrowDown') {
              e.preventDefault();
              setFocused((i) => Math.min(i + 1, results.length - 1));
            } else if (showDropdown && e.key === 'ArrowUp') {
              e.preventDefault();
              setFocused((i) => Math.max(i - 1, 0));
            } else if (showDropdown && e.key === 'Enter' && !scope) {
              e.preventDefault();
              go(results[focused]);
            }
          }}
          placeholder={placeholder}
          aria-label={t('Search', 'بحث', language)}
          className="w-full rounded-md border-0 bg-gray-100 py-2 pe-16 ps-9 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <span className="pointer-events-none absolute end-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 md:flex">
          {query ? null : (
            <kbd className="rounded-sm bg-gray-200/70 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">⌘K</kbd>
          )}
        </span>
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus(); }}
            className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-gray-400 hover:text-gray-600"
            aria-label={t('Clear', 'مسح', language)}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-md border border-gray-100 bg-white text-left shadow-dropdown animate-fade-in"
          role="listbox"
        >
          {scope && (
            <div className="flex items-center gap-2 border-b border-gray-50 bg-gray-50/60 px-4 py-2 text-[11px] text-gray-400">
              <TextCursorInput className="h-3.5 w-3.5" />
              {t('Filtering this page — app-wide matches below', 'تصفية هذه الصفحة — نتائج التطبيق أدناه', language)}
            </div>
          )}
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              {t(`No results for “${query.trim()}”`, `لا توجد نتائج لـ "${query.trim()}"`, language)}
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto py-1">
              {(['employees', 'leaves', 'payroll', 'todos'] as ResultItem['group'][]).map((g) => {
                const items = grouped.get(g) || [];
                if (items.length === 0) return null;
                return (
                  <div key={g}>
                    <div className="flex items-center gap-2 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      {GROUP_META[g].icon}
                      {t(GROUP_META[g].label, GROUP_META[g].labelAr, language)}
                      <span className="ms-auto text-gray-300">{items.length}</span>
                    </div>
                    {items.map((r) => (
                      <button
                        key={r.key}
                        type="button"
                        role="option"
                        aria-selected={focused === results.indexOf(r)}
                        onMouseMove={() => setFocused(results.indexOf(r))}
                        onClick={() => go(r)}
                        className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-start transition-colors ${
                          focused === results.indexOf(r) ? 'bg-gray-50' : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">{r.label}</p>
                          <p className="truncate text-xs text-gray-500" dir="ltr">{r.sub}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
              <div className="mt-1 flex items-center gap-1.5 border-t border-gray-100 px-4 py-2 text-[11px] text-gray-400">
                <CornerDownLeft className="h-3 w-3" />
                {t('Enter to open', 'Enter للفتح', language)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
