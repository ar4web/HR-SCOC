'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DashboardTile } from '@/components/ui/DashboardTile';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { lifecycleService, LifecycleSummary } from '@/modules/lifecycle/service';
import { employeeService } from '@/modules/employee-management/service';
import { downloadCsv } from '@/lib/csv';
import { ModuleSettingsMenu } from '@/components/module-settings/ModuleSettingsMenu';
import { hasPermission } from '@/lib/rbac';
import { EmployeeLifecycle, LifecycleStatus, LifecycleType, Employee } from '@/types';
import { t, formatDate } from '@/lib/utils';
import {
  Rocket,
  Handshake,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  UserRound,
  Check,
  Plus,
} from 'lucide-react';

const typeMeta: Record<LifecycleType, { en: string; ar: string; cls: string; chip: string }> = {
  onboarding: {
    en: 'Onboarding',
    ar: 'انضمام',
    cls: 'bg-success/10 text-success',
    chip: 'bg-success',
  },
  offboarding: {
    en: 'Offboarding',
    ar: 'مغادرة',
    cls: 'bg-error/10 text-error',
    chip: 'bg-error',
  },
};

const statusMeta: Record<LifecycleStatus, { en: string; ar: string; cls: string }> = {
  draft: { en: 'Draft', ar: 'مسودة', cls: 'bg-gray-100 text-gray-500' },
  in_progress: { en: 'In Progress', ar: 'قيد التنفيذ', cls: 'bg-warning/10 text-warning' },
  completed: { en: 'Completed', ar: 'مكتملة', cls: 'bg-success/10 text-success' },
  cancelled: { en: 'Cancelled', ar: 'ملغاة', cls: 'bg-error/10 text-error' },
};

export function LifecycleContent() {
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const { addToast } = useToast();

  const [items, setItems] = React.useState<EmployeeLifecycle[]>([]);
  const [summary, setSummary] = React.useState<LifecycleSummary | null>(null);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [typeFilter, setTypeFilter] = React.useState<'all' | LifecycleType>('all');
  const [statusFilter] = React.useState<'all' | LifecycleStatus>('all');
  const [search, setSearch] = React.useState('');
  const [showModal, setShowModal] = React.useState(false);
  const [modalType, setModalType] = React.useState<'onboarding' | 'offboarding'>('onboarding');
  const [form, setForm] = React.useState({ employeeId: '', dueDate: '', notes: '' });
  const [saving, setSaving] = React.useState(false);

  const canManage = hasPermission(user?.role, 'employee:manage') || hasPermission(user?.role, 'employee:view_all');
  const empMap = React.useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [listRes, empRes] = await Promise.all([
      lifecycleService.list({
        type: typeFilter === 'all' ? undefined : typeFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search || undefined,
      }),
      employeeService.list({ pageSize: 500 }),
    ]);
    if (listRes.success && listRes.data) {
      setItems(listRes.data.data);
      setSummary(listRes.data.summary);
    }
    if (empRes.success && empRes.data) setEmployees(empRes.data.data || []);
    setLoading(false);
  }, [typeFilter, statusFilter, search]);

  React.useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const handleCreate = async () => {
    if (!form.employeeId) {
      addToast({ type: 'error', title: t('Select an employee', 'اختر موظفاً', language) });
      return;
    }
    setSaving(true);
    const res = await lifecycleService.create({
      employeeId: form.employeeId,
      type: modalType,
      dueDate: form.dueDate || undefined,
      notes: form.notes || undefined,
    });
    setSaving(false);
    if (res.success && res.data) {
      addToast({
        type: 'success',
        title: t(
          modalType === 'onboarding' ? 'Onboarding checklist created' : 'Offboarding checklist created',
          modalType === 'onboarding' ? 'تم إنشاء قائمة الانضمام' : 'تم إنشاء قائمة المغادرة',
          language
        ),
      });
      setShowModal(false);
      setForm({ employeeId: '', dueDate: '', notes: '' });
      load();
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to create checklist', 'فشل إنشاء القائمة', language) });
    }
  };

  const handleToggleTask = async (lc: EmployeeLifecycle, taskId: string, toDone: boolean) => {
    const res = await lifecycleService.setTask(lc.id, taskId, toDone ? 'done' : 'pending');
    if (res.success) {
      load();
    } else {
      addToast({ type: 'error', title: res.error || 'Failed to update task' });
    }
  };

  const handleSetStatus = async (lc: EmployeeLifecycle, status: LifecycleStatus) => {
    const res = await lifecycleService.setStatus(lc.id, status);
    if (res.success) {
      addToast({
        type: 'success',
        title: t(
          status === 'completed' ? 'Checklist completed' : status === 'cancelled' ? 'Checklist cancelled' : 'Status updated',
          'تم تحديث الحالة',
          language
        ),
      });
      load();
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to update status', 'فشل تحديث الحالة', language) });
    }
  };

  const handleDelete = async (lc: EmployeeLifecycle) => {
    const res = await lifecycleService.remove(lc.id);
    if (res.success) {
      addToast({ type: 'success', title: t('Checklist deleted', 'تم حذف القائمة', language) });
      load();
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to delete', 'فشل الحذف', language) });
    }
  };

  const exportCsv = () => {
    downloadCsv(
      items.map((lc) => {
        const emp = empMap.get(lc.employeeId);
        const done = lc.tasks.filter((x) => x.status === 'done').length;
        return {
          id: lc.id,
          employee: emp ? `${emp.fullName} (${emp.employeeId})` : lc.employeeId,
          type: lc.type,
          status: lc.status,
          tasksDone: `${done}/${lc.tasks.length}`,
          dueDate: lc.dueDate || '',
          createdAt: lc.createdAt,
        };
      }),
      `lifecycle-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const counts = (s: LifecycleStatus) => items.filter((l) => l.status === s).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('Employee Lifecycle', 'دورة حياة الموظف', language)}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('Onboarding & offboarding checklists with tracked tasks', 'قوائم الانضمام والمغادرة مع تتبع المهام', language)}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <ModuleSettingsMenu module={t('Lifecycle', 'دورة الحياة', language)} onExport={canManage ? exportCsv : undefined} />
          {canManage && (
            <>
              <Button
                variant="outline"
                title={t('New Offboarding', 'مغادرة جديدة', language)}
                aria-label={t('New Offboarding', 'مغادرة جديدة', language)}
                onClick={() => {
                  setModalType('offboarding');
                  setShowModal(true);
                }}
              >
                <Handshake className="h-4 w-4" />
              </Button>
              <Button
                title={t('New Onboarding', 'انضمام جديد', language)}
                aria-label={t('New Onboarding', 'انضمام جديد', language)}
                onClick={() => {
                  setModalType('onboarding');
                  setShowModal(true);
                }}
              >
                <Rocket className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardTile icon={Clock} iconClassName="bg-warning/10 text-warning" label={t('In Progress + Draft', 'قيد التنفيذ + مسودات', language)} value={summary ? `${summary.inProgress}` : '—'} sub={t('active checklists', 'قوائم نشطة', language)} />
        <DashboardTile icon={UserRound} iconClassName="bg-primary/10 text-primary" label={t('Total Checklists', 'إجمالي القوائم', language)} value={summary ? `${summary.total}` : '—'} sub={`${counts('completed')} ${t('completed', 'مكتملة', language)}`} />
        <DashboardTile icon={XCircle} iconClassName="bg-error/10 text-error" label={t('Overdue', 'متأخرة', language)} value={summary ? `${summary.overdue}` : '—'} sub={t('past due date', 'تجاوزت الموعد', language)} />
        <DashboardTile icon={CheckCircle2} iconClassName="bg-success/10 text-success" label={t('Completed', 'مكتملة', language)} value={summary ? `${summary.completed}` : '—'} sub={t('successfully closed', 'أغلقت بنجاح', language)} />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {(['all', 'onboarding', 'offboarding'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setTypeFilter(v)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              typeFilter === v ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {v === 'all' ? t('All', 'الكل', language) : t(typeMeta[v].en, typeMeta[v].ar, language)}
          </button>
        ))}
        <div className="flex-1" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('Search employee...', 'ابحث عن موظف...', language)}
          className="block w-52 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {loading && items.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center justify-center py-16 text-center">
            <Rocket className="h-8 w-8 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">{t('No checklists found.', 'لا توجد قوائم.', language)}</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((lc) => {
            const emp = empMap.get(lc.employeeId);
            const done = lc.tasks.filter((x) => x.status === 'done').length;
            const pct = lc.tasks.length ? Math.round((done / lc.tasks.length) * 100) : 0;
            const isOverdue = !!lc.dueDate && lc.dueDate < new Date().toISOString().slice(0, 10) && lc.status !== 'completed' && lc.status !== 'cancelled';
            const type = typeMeta[lc.type];
            const st = statusMeta[lc.status];
            return (
              <Card key={lc.id} className="overflow-hidden">
                <div className={`h-1.5 ${type.chip}`} />
                <CardHeader className="flex items-start gap-3 flex-wrap">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: lc.type === 'onboarding' ? '#009B77' : '#C0392B' }}>
                    {lc.type === 'onboarding' ? <Rocket className="h-5 w-5" /> : <Handshake className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{emp?.fullName || lc.employeeId}</p>
                    <p className="text-xs text-gray-500">
                      {emp ? `${emp.department} · ${emp.position}` : ''} · {t('created', 'أنشئت', language)} {formatDate(lc.createdAt, language)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${type.cls}`}>{t(type.en, type.ar, language)}</span>
                    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>{t(st.en, st.ar, language)}</span>
                  </div>
                </CardHeader>

                {lc.dueDate && (
                  <div className="px-6 pb-2">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${isOverdue ? 'text-error' : 'text-gray-500'}`}>
                      <Clock className="h-3 w-3" />
                      {t('Due', 'مستحق', language)} {lc.dueDate}
                      {isOverdue && ` · ${t('OVERDUE', 'متأخر!', language)}`}
                    </span>
                  </div>
                )}

                <CardBody>
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>
                        {done}/{lc.tasks.length} {t('tasks done', 'مهام منجزة', language)}
                      </span>
                      <span className="font-semibold text-gray-700">{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className={`h-full rounded-full transition-all ${lc.status === 'completed' ? 'bg-success' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <ul className="space-y-1.5 mb-4">
                    {lc.tasks.map((task) => (
                      <li key={task.id} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleTask(lc, task.id, task.status !== 'done')}
                          className={`h-4.5 w-4.5 shrink-0 h-[18px] w-[18px] rounded border flex items-center justify-center transition-colors ${
                            task.status === 'done'
                              ? 'bg-success border-success text-white'
                              : 'border-gray-300 text-transparent hover:border-primary'
                          }`}
                          aria-label={`${task.name} ${task.status === 'done' ? t('done', 'منجزة', language) : t('pending', 'قيد الانتظار', language)}`}
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <span className={`text-sm ${task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                          {language === 'ar' ? task.nameAr || task.name : task.name}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {lc.notes && <p className="text-xs text-gray-400 mb-3">{lc.notes}</p>}

                  {canManage && lc.status !== 'completed' && lc.status !== 'cancelled' && (
                    <div className="flex flex-wrap gap-2">
                      {lc.status === 'draft' ? (
                        <Button size="sm" variant="outline" onClick={() => handleSetStatus(lc, 'in_progress')}>
                          <Clock className="h-3.5 w-3.5" />
                          {t('Start', 'ابدأ', language)}
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleSetStatus(lc, 'completed')}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {t('Complete all', 'إكمال الكل', language)}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleSetStatus(lc, 'cancelled')}>
                        <XCircle className="h-3.5 w-3.5" />
                        {t('Cancel', 'إلغاء', language)}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(lc)} className="text-error hover:bg-error/5">
                        <Trash2 className="h-3.5 w-3.5" />
                        {t('Delete', 'حذف', language)}
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900">
              {t(
                modalType === 'onboarding' ? 'New Onboarding Checklist' : 'New Offboarding Checklist',
                modalType === 'onboarding' ? 'قائمة انضمام جديدة' : 'قائمة مغادرة جديدة',
                language
              )}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t(
                'Tasks are generated automatically from the standard template.',
                'يتم توليد المهام تلقائياً من القالب القياسي.',
                language
              )}
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('Employee', 'الموظف', language)}</label>
                <select
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">{t('Select employee...', 'اختر موظفاً...', language)}</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.fullName} · {e.employeeId} · {e.department}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label={t('Due date (optional)', 'الموعد النهائي (اختياري)', language)}
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
              <Input
                label={t('Notes (optional)', 'ملاحظات (اختياري)', language)}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t('e.g. starts on Sunday', 'مثال: يبدأ يوم الأحد', language)}
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowModal(false)}>
                {t('Cancel', 'إلغاء', language)}
              </Button>
              <Button onClick={handleCreate} loading={saving} title={t('Create Checklist', 'إنشاء القائمة', language)} aria-label={t('Create Checklist', 'إنشاء القائمة', language)}>          <Plus className="h-4 w-4" />
        </Button>
        
            </div>
          </div>
        </div>
      )}
    </div>
  );
}