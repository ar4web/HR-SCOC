'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { lifecycleService, LifecycleSummary } from '@/modules/lifecycle/service';
import { employeeService } from '@/modules/employee-management/service';
import { downloadCsv } from '@/lib/csv';
import { ModuleSettingsMenu } from '@/components/module-settings/ModuleSettingsMenu';
import { hasPermission } from '@/lib/rbac';
import { EmployeeLifecycle, LifecycleStatus, LifecycleType, Employee } from '@/types';
import { t, formatDate } from '@/lib/utils';
import {
  Rocket, Handshake, Trash2, CheckCircle2, XCircle, Clock,
  UserRound, Check, Plus, Play, CalendarDays, StickyNote,
} from 'lucide-react';
import PageHeader, { HeaderAction } from '@/components/layout/PageHeader';
import { Toolbar, ToolbarChips, ToolbarDivider, ToolbarSpacer, ToolbarCount } from '@/components/layout/Toolbar';
import { usePageSearch } from '@/stores/search-store';

const typeMeta: Record<LifecycleType, { en: string; ar: string; cls: string; bar: string; iconCls: string }> = {
  onboarding: {
    en: 'Onboarding',
    ar: 'انضمام',
    cls: 'bg-success/10 text-success',
    bar: 'bg-success',
    iconCls: 'bg-success/10 text-success',
  },
  offboarding: {
    en: 'Offboarding',
    ar: 'مغادرة',
    cls: 'bg-error/10 text-error',
    bar: 'bg-error',
    iconCls: 'bg-error/10 text-error',
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
  const [statusFilter, setStatusFilter] = React.useState<'active' | 'all' | LifecycleStatus>('active');
  const search = usePageSearch('/lifecycle', 'Search employee…', 'ابحث عن موظف…');
  const [showModal, setShowModal] = React.useState(false);
  const [modalType, setModalType] = React.useState<'onboarding' | 'offboarding'>('onboarding');
  const [form, setForm] = React.useState({ employeeId: '', dueDate: '', notes: '' });
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<EmployeeLifecycle | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [actingId, setActingId] = React.useState<string | null>(null);

  const canManage = hasPermission(user?.role, 'employee:manage') || hasPermission(user?.role, 'employee:view_all');
  const empMap = React.useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [listRes, empRes] = await Promise.all([
      lifecycleService.list({
        type: typeFilter === 'all' ? undefined : typeFilter,
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
  }, [typeFilter, search]);

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
    setActingId(lc.id);
    const res = await lifecycleService.setStatus(lc.id, status);
    setActingId(null);
    if (res.success) {
      addToast({
        type: 'success',
        title: t(
          status === 'completed' ? 'Checklist completed' : status === 'cancelled' ? 'Checklist cancelled' : 'Checklist started',
          status === 'completed' ? 'اكتملت القائمة' : status === 'cancelled' ? 'ألغيت القائمة' : 'بدأت القائمة',
          language
        ),
      });
      load();
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to update status', 'فشل تحديث الحالة', language) });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await lifecycleService.remove(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
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

  const visible = items.filter((lc) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return lc.status === 'draft' || lc.status === 'in_progress';
    return lc.status === statusFilter;
  });

  const statusCounts = {
    active: items.filter((l) => l.status === 'draft' || l.status === 'in_progress').length,
    completed: items.filter((l) => l.status === 'completed').length,
    cancelled: items.filter((l) => l.status === 'cancelled').length,
  };

  const kpis = [
    { label: t('Active Checklists', 'قوائم نشطة', language), value: summary ? `${summary.inProgress}` : '—', sub: t('drafts + in progress', 'مسودات + قيد التنفيذ', language), icon: Clock, chip: 'bg-warning/10 text-warning' },
    { label: t('Overdue', 'متأخرة', language), value: summary ? `${summary.overdue}` : '—', sub: t('past due date', 'تجاوزت الموعد', language), icon: XCircle, chip: 'bg-error/10 text-error' },
    { label: t('Completed', 'مكتملة', language), value: summary ? `${summary.completed}` : '—', sub: t('successfully closed', 'أغلقت بنجاح', language), icon: CheckCircle2, chip: 'bg-success/10 text-success' },
    { label: t('Total Checklists', 'إجمالي القوائم', language), value: summary ? `${summary.total}` : '—', sub: `${statusCounts.cancelled} ${t('cancelled', 'ملغاة', language)}`, icon: UserRound, chip: 'bg-primary/10 text-primary' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Rocket}
        title={t('Employee Lifecycle', 'دورة حياة الموظف', language)}
        subtitle={t('Onboarding & offboarding checklists with tracked tasks', 'قوائم الانضمام والمغادرة مع تتبع المهام', language)}
        actions={
          <>
            <ModuleSettingsMenu module={t('Lifecycle', 'دورة الحياة', language)} onExport={canManage ? exportCsv : undefined} />
            {canManage && (
              <>
                <HeaderAction
                  icon={Handshake}
                  label={t('New Offboarding', 'مغادرة جديدة', language)}
                  onClick={() => {
                    setModalType('offboarding');
                    setShowModal(true);
                  }}
                />
                <HeaderAction
                  icon={Rocket}
                  label={t('New Onboarding', 'انضمام جديد', language)}
                  primary
                  onClick={() => {
                    setModalType('onboarding');
                    setShowModal(true);
                  }}
                />
              </>
            )}
          </>
        }
      />

      {/* ===== KPI row ===== */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="h-full">
              <CardBody className="flex h-full flex-col gap-2 p-4">
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-md ${k.chip}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-[13px] font-medium text-gray-600">{k.label}</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{k.value}</p>
                <p className="mt-auto text-xs text-gray-400">{k.sub}</p>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* ===== Filters ===== */}
      <Toolbar>
        <ToolbarChips
          value={typeFilter}
          onChange={(v) => setTypeFilter(v as 'all' | LifecycleType)}
          options={(['all', 'onboarding', 'offboarding'] as const).map((v) => ({
            value: v,
            label: v === 'all' ? t('All types', 'كل الأنواع', language) : t(typeMeta[v].en, typeMeta[v].ar, language),
          }))}
        />
        <ToolbarDivider />
        <ToolbarChips
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as 'active' | 'all' | LifecycleStatus)}
          options={[
            { value: 'active', label: t('Active', 'نشطة', language), count: statusCounts.active },
            { value: 'completed', label: t('Completed', 'مكتملة', language), count: statusCounts.completed },
            { value: 'cancelled', label: t('Cancelled', 'ملغاة', language), count: statusCounts.cancelled },
            { value: 'all', label: t('All statuses', 'كل الحالات', language), count: items.length },
          ]}
        />
        <ToolbarSpacer />
        <ToolbarCount>{t(`${visible.length} checklist(s)`, `${visible.length} قائمة`, language)}</ToolbarCount>
      </Toolbar>

      {loading && items.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-md" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center justify-center py-16 text-center">
            <Rocket className="h-8 w-8 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">{t('No checklists found.', 'لا توجد قوائم.', language)}</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((lc) => {
            const emp = empMap.get(lc.employeeId);
            const done = lc.tasks.filter((x) => x.status === 'done').length;
            const pct = lc.tasks.length ? Math.round((done / lc.tasks.length) * 100) : 0;
            const isOverdue = !!lc.dueDate && lc.dueDate < new Date().toISOString().slice(0, 10) && lc.status !== 'completed' && lc.status !== 'cancelled';
            const type = typeMeta[lc.type];
            const st = statusMeta[lc.status];
            const closed = lc.status === 'completed' || lc.status === 'cancelled';
            return (
              <Card key={lc.id} className="flex flex-col overflow-hidden">
                <div className={`h-1 ${type.bar}`} />
                <div className="flex flex-wrap items-start gap-3 px-5 pb-2 pt-4">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${type.iconCls}`}>
                    {lc.type === 'onboarding' ? <Rocket className="h-4 w-4" /> : <Handshake className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-gray-900">{emp?.fullName || lc.employeeId}</p>
                    <p className="truncate text-xs text-gray-500">
                      {emp ? `${emp.department} · ${emp.position}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${type.cls}`}>{t(type.en, type.ar, language)}</span>
                    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>{t(st.en, st.ar, language)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 pb-1 text-xs text-gray-400">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {t('created', 'أنشئت', language)} {formatDate(lc.createdAt, language)}
                  </span>
                  {lc.dueDate && (
                    <span className={`inline-flex items-center gap-1 font-medium ${isOverdue ? 'text-error' : ''}`}>
                      <Clock className="h-3 w-3" />
                      {t('due', 'مستحق', language)} {formatDate(lc.dueDate, language)}
                      {isOverdue && (
                        <span className="rounded-full bg-error/10 px-2 py-0.5 text-[10px] font-bold text-error">
                          {t('OVERDUE', 'متأخر', language)}
                        </span>
                      )}
                    </span>
                  )}
                </div>

                <CardBody className="flex flex-1 flex-col pt-3">
                  <div className="mb-3">
                    <div className="mb-1 flex justify-between text-xs text-gray-500">
                      <span>
                        {done}/{lc.tasks.length} {t('tasks done', 'مهام منجزة', language)}
                      </span>
                      <span className="font-semibold text-gray-700">{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className={`h-full rounded-full transition-all ${lc.status === 'completed' ? 'bg-success' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <ul className="mb-4 space-y-0.5">
                    {lc.tasks.map((task) => (
                      <li key={task.id} className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-gray-50">
                        <button
                          type="button"
                          onClick={() => handleToggleTask(lc, task.id, task.status !== 'done')}
                          disabled={closed}
                          className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-sm transition-colors disabled:cursor-default ${
                            task.status === 'done'
                              ? 'bg-success text-white'
                              : 'bg-gray-200/80 text-transparent hover:bg-primary/20'
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

                  {lc.notes && (
                    <p className="mb-3 flex items-start gap-1.5 rounded-md bg-gray-50 px-2.5 py-2 text-xs text-gray-500">
                      <StickyNote className="mt-0.5 h-3 w-3 shrink-0 text-gray-300" />
                      {lc.notes}
                    </p>
                  )}

                  {canManage && !closed && (
                    <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-gray-100/60 pt-3">
                      {lc.status === 'draft' ? (
                        <button
                          onClick={() => handleSetStatus(lc, 'in_progress')}
                          disabled={actingId === lc.id}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary/10 px-3 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-white active:scale-95 disabled:opacity-50"
                        >
                          <Play className="h-3.5 w-3.5" />
                          {t('Start', 'ابدأ', language)}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSetStatus(lc, 'completed')}
                          disabled={actingId === lc.id}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-success/10 px-3 text-xs font-semibold text-success transition-all hover:bg-success hover:text-white active:scale-95 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {t('Complete all', 'إكمال الكل', language)}
                        </button>
                      )}
                      <button
                        onClick={() => handleSetStatus(lc, 'cancelled')}
                        disabled={actingId === lc.id}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        {t('Cancel', 'إلغاء', language)}
                      </button>
                      <button
                        onClick={() => setDeleteTarget(lc)}
                        className="ms-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-error/10 hover:text-error"
                        title={t('Delete', 'حذف', language)}
                        aria-label={t('Delete', 'حذف', language)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {canManage && closed && (
                    <div className="mt-auto flex justify-end border-t border-gray-100/60 pt-3">
                      <button
                        onClick={() => setDeleteTarget(lc)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-error/10 hover:text-error"
                        title={t('Delete', 'حذف', language)}
                        aria-label={t('Delete', 'حذف', language)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('Delete checklist?', 'حذف القائمة؟', language)}
        message={t(
          'This will permanently remove the checklist and its task progress.',
          'سيؤدي هذا إلى إزالة القائمة وتقدم مهامها نهائياً.',
          language
        )}
        confirmLabel={t('Delete', 'حذف', language)}
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-md rounded-md bg-white p-6 shadow-modal" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-md ${modalType === 'onboarding' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                {modalType === 'onboarding' ? <Rocket className="h-5 w-5" /> : <Handshake className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {t(
                    modalType === 'onboarding' ? 'New Onboarding Checklist' : 'New Offboarding Checklist',
                    modalType === 'onboarding' ? 'قائمة انضمام جديدة' : 'قائمة مغادرة جديدة',
                    language
                  )}
                </h2>
                <p className="text-xs text-gray-500">
                  {t(
                    'Tasks are generated automatically from the standard template.',
                    'يتم توليد المهام تلقائياً من القالب القياسي.',
                    language
                  )}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('Employee', 'الموظف', language)}</label>
                <select
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="mt-1 block w-full rounded-md border-0 bg-gray-100 px-3 py-2 text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
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
              <Button onClick={handleCreate} loading={saving}>
                <Plus className="h-4 w-4" />
                {t('Create Checklist', 'إنشاء القائمة', language)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
