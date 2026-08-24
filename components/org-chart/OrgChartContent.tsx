'use client';

import React from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { Employee } from '@/types';
import { t } from '@/lib/utils';
import { useLanguageStore } from '@/stores/language-store';
import { Network, Users, UserRound } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { ModuleSettingsMenu } from '@/components/module-settings/ModuleSettingsMenu';

interface MergedEmployee extends Employee {
  fullName: string;
  fullNameAr: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function DepartmentCard({ dept, employees }: { dept: string; employees: MergedEmployee[] }) {
  const { language } = useLanguageStore();
  const byManager = new Map<string | undefined, MergedEmployee[]>();
  for (const emp of employees) {
    const key = emp.managerId || '__root__';
    if (!byManager.has(key)) byManager.set(key, []);
    byManager.get(key)!.push(emp);
  }
  const roots = byManager.get('__root__') || [];
  const used = new Set(roots.map((e) => e.id));
  return (
    <Card>
      <CardHeader className="flex items-center gap-3">
        <Network className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">{dept}</h2>
        <span className="ml-auto text-sm text-gray-500">{employees.length}</span>
      </CardHeader>
      <CardBody className="space-y-2">
        {roots.length === 0 && (
          <p className="text-sm text-gray-400">
            {t('No team leads assigned. Add via employee profile.', 'لا يوجد قادة فريق معينون. أضف عبر ملف الموظف.', language)}
          </p>
        )}
        {roots.map((root) => {
          const reports = (byManager.get(root.id) || []).filter((e) => !used.has(e.id));
          return (
            <div key={root.id}>
              <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {initials(language === 'ar' ? root.fullNameAr || root.fullName : root.fullName)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {language === 'ar' ? root.fullNameAr || root.fullName : root.fullName}
                  </p>
                  <p className="truncate text-xs text-gray-500">{root.position}</p>
                </div>
              </div>
              <div className="mt-2 space-y-1 border-l-2 border-gray-200 pl-4">
                {reports.map((rep) => (
                  <div key={rep.id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[11px] font-bold text-gray-700">
                      {initials(language === 'ar' ? rep.fullNameAr || rep.fullName : rep.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-gray-800">
                        {language === 'ar' ? rep.fullNameAr || rep.fullName : rep.fullName}
                      </p>
                      <p className="truncate text-xs text-gray-500">{rep.position}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}

export default function OrgChartContent() {
  const { language } = useLanguageStore();
  const { addToast } = useToast();
  const [employees, setEmployees] = React.useState<MergedEmployee[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api.get<{ data: Employee[]; total: number }>('/employees')
      .then((res) => {
        if (res.success && res.data) {
          setEmployees(res.data.data as MergedEmployee[]);
        } else {
          addToast({ type: 'error', title: res.error || 'Failed' });
        }
      })
      .catch(() => addToast({ type: 'error', title: t('Failed to load organization', 'فشل تحميل الهيكل التنظيمي', language) }))
      .finally(() => setLoading(false));
  }, [addToast, language]);

  const deptsGrouped = React.useMemo(() => {
    const by = new Map<string, MergedEmployee[]>();
    for (const emp of employees) {
      if (!by.has(emp.department)) by.set(emp.department, []);
      by.get(emp.department)!.push(emp);
    }
    return Array.from(by.entries());
  }, [employees]);

  if (loading) {
    return (
      <p className="text-sm text-gray-500">
        {t('Loading organization chart...', 'جار تحميل الهيكل التنظيمي...', language)}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserRound className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
              {t('Organization Chart', 'الهيكل التنظيمي', language)}
            </h1>
            <p className="text-sm text-gray-500">
              {t('Team hierarchy by department', 'التسلسل الهرمي للفريق حسب الإدارة', language)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Users className="h-4 w-4 text-primary" />
          {employees.length} {t('employees across', 'موظفًا في', language)} {deptsGrouped.length}{' '}
          {t('departments', 'أقسام', language)}
        </div>
        <ModuleSettingsMenu module={t('Organization', 'الهيكل التنظيمي', language)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {deptsGrouped.map(([dept, emps]) => (
          <DepartmentCard key={dept} dept={dept} employees={emps} />
        ))}
      </div>
    </div>
  );
}