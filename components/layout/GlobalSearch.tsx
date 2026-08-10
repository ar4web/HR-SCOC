'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useLanguageStore } from '@/stores/language-store';
import { t } from '@/lib/utils';
import { employeeService } from '@/modules/employee-management/service';
import { payrollService } from '@/modules/payroll/service';
import { Employee, LeaveRequest, Payroll, Todo } from '@/types';
import { Search, Briefcase, CalendarDays, Users, ListTodo, CornerDownLeft } from 'lucide-react';

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
  const { language } = useLanguageStore();
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [focused, setFocused] = React.useState(0);

  const employeesRef = React.useRef<Employee[]>([]);
  const leavesRef = React.useRef<LeaveRequest[]>([]);
  const payrollRef = React.useRef<Payroll[]>([]);
  const todosRef = React.useRef<Todo[]>([]);

  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      employeeService.list({ page: 1, pageSize: 1000 }),
      fetch('/api/leaves').then((r) => r.json()).catch(() => ({ data: [] })),
      payrollService.list({}),
      fetch('/api/todos').then((r) => r.json()).catch(() => ({ data: [] })),
    ]).then(([empsRes, leavesRes, payrollRes, todosRes]) => {
      if (cancelled) return;
      if (empsRes.success && empsRes.data) employeesRef.current = empsRes.data.data;
      if (Array.isArray(leavesRes.data)) leavesRef.current = leavesRes.data;
      if (payrollRes.success && payrollRes.data) payrollRef.current = payrollRes.data.data;
      if (Array.isArray(todosRes.data)) todosRef.current = todosRes.data;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const empById = React.useMemo(() => {
    const map = new Map<string, Employee>();
    for (const e of employeesRef.current) map.set(e.id, e);
    return map;
  }, []);

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
      const emp = empById.get(l.employeeId);
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

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search
          className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${language === 'ar' ? 'right-3' : 'left-3'}`}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setFocused((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setFocused((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              go(results[focused]);
            }
          }}
          placeholder={t('Search employees, leaves, payroll...', 'ابحث في الموظفين والإجازات والرواتب...', language)}
          aria-label={t('Global search', 'البحث العام', language)}
          className={`w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-sm focus:ring-2 focus:ring-primary focus:border-primary focus:bg-white ${language === 'ar' ? 'pr-10' : 'pl-10'}`}
        />
      </div>

      {open && query.trim() && (
        <div
          className="absolute top-full mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-lg z-50"
          role="listbox"
        >
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
                    <div className="flex items-center gap-2 px-4 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      {GROUP_META[g].icon}
                      {t(GROUP_META[g].label, GROUP_META[g].labelAr, language)}
                      <span className="ml-auto text-gray-300">{items.length}</span>
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