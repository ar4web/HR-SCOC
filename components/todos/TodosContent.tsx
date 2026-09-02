'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguageStore } from '@/stores/language-store';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { todoService } from '@/modules/todo-management/service';
import { ModuleSettingsMenu } from '@/components/module-settings/ModuleSettingsMenu';
import { api } from '@/lib/api';
import { Todo } from '@/types';
import { t, formatDate, getPriorityLabel, getStatusLabel } from '@/lib/utils';
import {
  ListTodo, Plus, CheckCircle2, Clock, AlertCircle, Trash2, Pencil,
  AlarmClock, BellRing, ShieldAlert, Briefcase, BadgeCheck, ScrollText,
  FileText, RefreshCw,
} from 'lucide-react';
import PageHeader, { HeaderAction } from '@/components/layout/PageHeader';
import { Toolbar, ToolbarSegments, ToolbarChips, ToolbarSpacer, ToolbarCount } from '@/components/layout/Toolbar';
import { usePageSearch } from '@/stores/search-store';

const priorityStyles: Record<Todo['priority'], string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-warning/10 text-warning',
  high: 'bg-error/10 text-error',
};

const statusStyles: Record<Todo['status'], string> = {
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-info/10 text-info',
  completed: 'bg-success/10 text-success',
};

interface ReminderItem {
  id: string;
  kind: 'contract' | 'work_permit' | 'probation' | 'document' | 'manual';
  employeeName?: string;
  employeeNameAr?: string;
  employeeDisplayId?: string;
  name: string;
  dueDate: string;
  daysLeft: number;
  status: 'expired' | 'expiring' | 'ok';
}

const KIND_META: Record<ReminderItem['kind'], React.ElementType> = {
  contract: Briefcase,
  work_permit: ScrollText,
  probation: BadgeCheck,
  document: FileText,
  manual: AlarmClock,
};

type Tab = 'tasks' | 'reminders';

export function TodosContent() {
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const searchParams = useSearchParams();

  const [tab, setTab] = React.useState<Tab>(() => (searchParams.get('tab') === 'reminders' ? 'reminders' : 'tasks'));

  // ===== Tasks state =====
  const [todos, setTodos] = React.useState<Todo[]>([]);
  const [totals, setTotals] = React.useState<{ pending: number; in_progress: number; completed: number }>({ pending: 0, in_progress: 0, completed: 0 });
  const [loadingTasks, setLoadingTasks] = React.useState(true);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState('open');
  const search = usePageSearch('/todos', 'Search tasks & reminders…', 'ابحث في المهام والتذكيرات…');
  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState<Todo | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    title: '',
    description: '',
    priority: 'medium' as Todo['priority'],
    dueDate: '',
    category: '',
    assignee: '',
  });

  // ===== Reminders state =====
  const [items, setItems] = React.useState<ReminderItem[]>([]);
  const [dormant, setDormant] = React.useState<ReminderItem[]>([]);
  const [remSummary, setRemSummary] = React.useState<{ expired: number; expiring: number; total: number } | null>(null);
  const [scoped, setScoped] = React.useState(false);
  const [loadingReminders, setLoadingReminders] = React.useState(true);
  const [sendingId, setSendingId] = React.useState<string | null>(null);
  const [showReminderForm, setShowReminderForm] = React.useState(false);
  const [savingReminder, setSavingReminder] = React.useState(false);
  const [reminderForm, setReminderForm] = React.useState({ name: '', nameAr: '', dueDate: '' });

  const loadTasks = React.useCallback(async (status = statusFilter, q = search) => {
    setLoadingTasks(true);
    const [listRes, totalsRes] = await Promise.all([
      todoService.getTodos({ status: status || undefined, search: q || undefined }),
      todoService.getTodos({ status: undefined }),
    ]);
    if (listRes.success && listRes.data) setTodos(listRes.data.data);
    if (totalsRes.success && totalsRes.data) {
      const all = totalsRes.data.data;
      setTotals({
        pending: all.filter((x) => x.status === 'pending').length,
        in_progress: all.filter((x) => x.status === 'in_progress').length,
        completed: all.filter((x) => x.status === 'completed').length,
      });
    }
    setLoadingTasks(false);
  }, [statusFilter, search]);

  const loadReminders = React.useCallback(async () => {
    setLoadingReminders(true);
    const res = await api.get<{
      data: ReminderItem[];
      dormant: ReminderItem[];
      summary: { expired: number; expiring: number; total: number };
      scoped?: boolean;
    }>('/reminders');
    if (res.success && res.data) {
      setItems(res.data.data);
      setDormant(res.data.dormant || []);
      setRemSummary(res.data.summary);
      setScoped(!!res.data.scoped);
    }
    setLoadingReminders(false);
  }, []);

  React.useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  React.useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const handleRefresh = () => {
    loadTasks();
    loadReminders();
  };

  // ===== Task handlers =====
  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', priority: 'medium', dueDate: '', category: '', assignee: '' });
    setShowForm(true);
  };

  const openEdit = (todo: Todo) => {
    setEditing(todo);
    setForm({
      title: todo.title,
      description: todo.description || '',
      priority: todo.priority,
      dueDate: todo.dueDate || '',
      category: todo.category || '',
      assignee: todo.assignee || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      addToast({ type: 'error', title: t('Title is required', 'العنوان مطلوب', language) });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
        category: form.category.trim() || undefined,
        assignee: form.assignee.trim() || user?.name || 'Me',
      };
      const res = editing
        ? await todoService.updateTodo(editing.id, payload)
        : await todoService.createTodo({ ...payload, status: 'pending' as Todo['status'] });
      if (res.success && res.data) {
        addToast({
          type: 'success',
          title: t(editing ? 'Task updated' : 'Task created', editing ? 'تم تحديث المهمة' : 'تم إنشاء المهمة', language),
        });
        setShowForm(false);
        loadTasks(statusFilter, search);
      } else {
        addToast({ type: 'error', title: res.error || t('Operation failed', 'فشلت العملية', language) });
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (todo: Todo) => {
    if (togglingId === todo.id) return;
    setTogglingId(todo.id);
    try {
      const next = todo.status === 'completed' ? 'in_progress' : todo.status === 'in_progress' ? 'pending' : 'completed';
      const res = await todoService.updateTodo(todo.id, { status: next });
      if (res.success) {
        addToast({
          type: next === 'completed' ? 'success' : 'info',
          title: t(
            next === 'completed' ? 'Task completed' : next === 'in_progress' ? 'Task in progress' : 'Task reopened',
            next === 'completed' ? 'اكتملت المهمة' : next === 'in_progress' ? 'المهمة قيد التنفيذ' : 'أعيد فتح المهمة',
            language
          ),
        });
        loadTasks(statusFilter, search);
      } else {
        addToast({ type: 'error', title: res.error || t('Failed to update task', 'فشل تحديث المهمة', language) });
      }
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await todoService.deleteTodo(id);
    if (res.success) {
      addToast({ type: 'success', title: t('Task deleted', 'تم حذف المهمة', language) });
      loadTasks(statusFilter, search);
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to delete task', 'فشل حذف المهمة', language) });
    }
  };

  // ===== Reminder handlers =====
  const handleNotify = async (item: ReminderItem) => {
    setSendingId(item.id);
    try {
      const res = await api.post<{ success: boolean; notified: number }>('/reminders', { reminderId: item.id });
      if (res.success && res.data) {
        addToast({
          type: 'success',
          title: t('Reminder sent', 'تم إرسال التذكير', language),
          message: t(`${res.data.notified} recipient(s) notified + email queued`, `${res.data.notified} مستلم تم إخطاره وبريد قيد الإرسال`, language),
        });
      } else {
        addToast({ type: 'error', title: res.error || t('Failed', 'فشل', language) });
      }
    } finally {
      setSendingId(null);
    }
  };

  const handleCreateReminder = async () => {
    if (!reminderForm.name.trim() || !reminderForm.dueDate) {
      addToast({ type: 'error', title: t('Name and due date are required', 'الاسم وتاريخ الاستحقاق مطلوبان', language) });
      return;
    }
    setSavingReminder(true);
    const res = await api.post('/reminders', {
      create: true,
      name: reminderForm.name.trim(),
      nameAr: reminderForm.nameAr.trim() || undefined,
      dueDate: reminderForm.dueDate,
    });
    setSavingReminder(false);
    if (res.success) {
      addToast({ type: 'success', title: t('Reminder set', 'تم تعيين التذكير', language) });
      setShowReminderForm(false);
      setReminderForm({ name: '', nameAr: '', dueDate: '' });
      loadReminders();
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to set reminder', 'فشل تعيين التذكير', language) });
    }
  };

  const q = search.trim().toLowerCase();
  const filteredItems = q
    ? items.filter((i) => `${i.name} ${i.employeeName || ''} ${i.employeeDisplayId || ''}`.toLowerCase().includes(q))
    : items;

  const selectCls = 'block rounded-md border-0 bg-gray-100 px-3 py-2 text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40';

  const renderReminderRow = (item: ReminderItem) => {
    const Icon = KIND_META[item.kind];
    return (
      <tr key={item.id} className="border-b border-gray-50 last:border-0 transition-colors hover:bg-gray-50/60">
        <td className="px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
              item.status === 'expired' ? 'bg-error/10 text-error' : item.status === 'expiring' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
            }`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
              <p className="text-xs text-gray-400">
                {item.employeeName ? (language === 'ar' ? item.employeeNameAr || item.employeeName : item.employeeName) : item.kind === 'manual' ? t('Manual reminder', 'تذكير يدوي', language) : t('Company document', 'مستند الشركة', language)}
                {item.employeeDisplayId ? ` • ${item.employeeDisplayId}` : ''}
              </p>
            </div>
          </div>
        </td>
        <td className="px-6 py-3.5 text-sm text-gray-600 whitespace-nowrap">{formatDate(item.dueDate, language)}</td>
        <td className="px-6 py-3.5">
          {item.status === 'expired' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-error/10 px-2.5 py-1 text-xs font-semibold text-error">
              <ShieldAlert className="h-3 w-3" />
              {t('Expired', 'منتهي', language)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
              <BellRing className="h-3 w-3" />
              {item.daysLeft} {t('days left', 'أيام متبقية', language)}
            </span>
          )}
        </td>
        <td className="px-6 py-3.5 text-end">
          <button
            onClick={() => handleNotify(item)}
            disabled={sendingId === item.id}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary/10 px-3 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-white active:scale-95 disabled:opacity-50"
          >
            <BellRing className={`h-3.5 w-3.5 ${sendingId === item.id ? 'animate-pulse' : ''}`} />
            {t('Notify', 'إشعار', language)}
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ListTodo}
        title={t('Tasks & Reminders', 'المهام والتذكيرات', language)}
        subtitle={t('Track tasks, deadlines and expiry reminders in one place', 'تتبع المهام والمواعيد وتذكيرات الانتهاء في مكان واحد', language)}
        actions={
          <>
            <HeaderAction icon={RefreshCw} label={t('Refresh', 'تحديث', language)} onClick={handleRefresh} />
            <ModuleSettingsMenu module={t('Tasks & Reminders', 'المهام والتذكيرات', language)} />
            {tab === 'tasks' ? (
              <HeaderAction icon={Plus} label={t('New Task', 'مهمة جديدة', language)} primary onClick={openCreate} />
            ) : (
              <HeaderAction icon={Plus} label={t('New Reminder', 'تذكير جديد', language)} primary onClick={() => setShowReminderForm(true)} />
            )}
          </>
        }
      />

      {/* ===== Tab switcher ===== */}
      <div className="sm:w-fit">
        <ToolbarSegments
          value={tab}
          onChange={setTab}
          options={[
            { value: 'tasks', label: t('Tasks', 'المهام', language), icon: ListTodo, count: totals.pending + totals.in_progress },
            { value: 'reminders', label: t('Reminders', 'التذكيرات', language), icon: AlarmClock, count: remSummary?.total ?? 0 },
          ]}
        />
      </div>

      {/* ===== Combined stats strip ===== */}
      <Card>
        <CardBody className="grid grid-cols-2 divide-gray-100/60 p-0 sm:grid-cols-3 lg:grid-cols-6 lg:divide-x rtl:lg:divide-x-reverse">
          {[
            { label: t('Pending tasks', 'مهام معلقة', language), value: totals.pending, icon: Clock, cls: totals.pending ? 'text-warning' : 'text-gray-400', go: 'tasks' as Tab },
            { label: t('In progress', 'قيد التنفيذ', language), value: totals.in_progress, icon: AlertCircle, cls: totals.in_progress ? 'text-info' : 'text-gray-400', go: 'tasks' as Tab },
            { label: t('Completed', 'مكتملة', language), value: totals.completed, icon: CheckCircle2, cls: 'text-success', go: 'tasks' as Tab },
            { label: t('Expired items', 'عناصر منتهية', language), value: remSummary?.expired ?? 0, icon: ShieldAlert, cls: remSummary?.expired ? 'text-error' : 'text-gray-400', go: 'reminders' as Tab },
            { label: t('Expiring soon', 'ينتهي قريباً', language), value: remSummary?.expiring ?? 0, icon: BellRing, cls: remSummary?.expiring ? 'text-warning' : 'text-gray-400', go: 'reminders' as Tab },
            { label: t('Healthy items', 'عناصر سليمة', language), value: dormant.length, icon: BadgeCheck, cls: 'text-success', go: 'reminders' as Tab },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <button key={s.label} onClick={() => setTab(s.go)} className="flex items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-gray-50">
                <Icon className={`h-4 w-4 shrink-0 ${s.cls}`} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-900">{s.value}</p>
                  <p className="truncate text-[11px] text-gray-400">{s.label}</p>
                </div>
              </button>
            );
          })}
        </CardBody>
      </Card>

      {tab === 'tasks' ? (
        <>
          {showForm && (
            <Card>
              <CardHeader className="flex items-center gap-3">
                <ListTodo className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">
                  {t(editing ? 'Edit Task' : 'Create Task', editing ? 'تعديل مهمة' : 'إنشاء مهمة', language)}
                </h2>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label={t('Title', 'العنوان', language)}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder={t('e.g. Submit GOSI report', 'مثال: تقديم تقرير التأمينات', language)}
                  />
                  <Input
                    label={t('Category', 'التصنيف', language)}
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder={t('e.g. HR, Payroll', 'مثال: الموارد البشرية، الرواتب', language)}
                  />
                </div>
                <Input
                  label={t('Description', 'الوصف', language)}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t('Optional details...', 'تفاصيل اختيارية...', language)}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">{t('Priority', 'الأولوية', language)}</label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value as Todo['priority'] })}
                      className={`w-full ${selectCls}`}
                    >
                      <option value="low">{t('Low', 'منخفضة', language)}</option>
                      <option value="medium">{t('Medium', 'متوسطة', language)}</option>
                      <option value="high">{t('High', 'عالية', language)}</option>
                    </select>
                  </div>
                  <Input
                    label={t('Due Date', 'تاريخ الاستحقاق', language)}
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  />
                  <Input
                    label={t('Assignee', 'المسؤول', language)}
                    value={form.assignee}
                    onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                    placeholder={t('Person responsible', 'الشخص المسؤول', language)}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => setShowForm(false)}>
                    {t('Cancel', 'إلغاء', language)}
                  </Button>
                  <Button onClick={handleSave} loading={saving}>
                    {t(editing ? 'Save Changes' : 'Create', editing ? 'حفظ التغييرات' : 'إنشاء', language)}
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <Toolbar>
                <ToolbarChips
                  value={statusFilter}
                  onChange={(v) => {
                    setStatusFilter(v);
                    loadTasks(v, search);
                  }}
                  options={[
                    { value: 'open', label: t('Open Tasks', 'المهام المفتوحة', language), count: totals.pending + totals.in_progress },
                    { value: 'pending', label: t('Pending', 'قيد الانتظار', language), count: totals.pending },
                    { value: 'in_progress', label: t('In Progress', 'قيد التنفيذ', language), count: totals.in_progress },
                    { value: 'completed', label: t('Completed', 'مكتملة', language), count: totals.completed },
                    { value: '', label: t('All', 'الكل', language) },
                  ]}
                />
                <ToolbarSpacer />
                <ToolbarCount>{t(`${todos.length} task(s)`, `${todos.length} مهمة`, language)}</ToolbarCount>
              </Toolbar>
            </CardHeader>
            <CardBody>
              {loadingTasks ? (
                <TableSkeleton rows={5} cols={4} />
              ) : todos.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  {t('No tasks found. Create your first task!', 'لا توجد مهام. أنشئ مهمتك الأولى!', language)}
                </p>
              ) : (
                <div className="divide-y divide-gray-100/60">
                  {todos.map((todo) => (
                    <div
                      key={todo.id}
                      className={`flex items-start gap-4 px-1 py-4 ${todo.status === 'completed' ? 'opacity-70' : ''}`}
                    >
                      <button
                        onClick={() => toggleStatus(todo)}
                        disabled={togglingId === todo.id}
                        className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors disabled:opacity-50 ${
                          todo.status === 'completed'
                            ? 'bg-success border-success text-white'
                            : 'border-gray-300 hover:border-primary text-transparent'
                        }`}
                        title={t('Toggle status', 'تبديل الحالة', language)}
                      >
                        {togglingId === todo.id ? (
                          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-semibold text-sm ${
                              todo.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'
                            }`}
                          >
                            {todo.title}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityStyles[todo.priority]}`}>
                            {getPriorityLabel(todo.priority, language)}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[todo.status]}`}>
                            {getStatusLabel(todo.status, language)}
                          </span>
                          {todo.category && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/5 text-secondary">
                              {todo.category}
                            </span>
                          )}
                        </div>
                        {todo.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{todo.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          {todo.dueDate && <span>{t('Due', 'الاستحقاق', language)}: {formatDate(todo.dueDate, language)}</span>}
                          {todo.assignee && <span>{t('By', 'بواسطة', language)}: {todo.assignee}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => openEdit(todo)}
                          className="p-2 rounded-md text-gray-400 hover:text-primary hover:bg-gray-100"
                          title={t('Edit', 'تعديل', language)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(todo.id)}
                          className="p-2 rounded-md text-gray-400 hover:text-error hover:bg-error/10"
                          title={t('Delete', 'حذف', language)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </>
      ) : (
        <>
          {showReminderForm && (
            <Card>
              <CardHeader className="flex items-center gap-3">
                <AlarmClock className="h-5 w-5 text-warning" />
                <h2 className="text-lg font-semibold">{t('New Reminder', 'تذكير جديد', language)}</h2>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label={t('Reminder name', 'اسم التذكير', language)}
                    value={reminderForm.name}
                    onChange={(e) => setReminderForm({ ...reminderForm, name: e.target.value })}
                    placeholder={t('e.g. Renew office lease', 'مثال: تجديد عقد إيجار المكتب', language)}
                  />
                  <Input
                    label={t('Name (Arabic, optional)', 'الاسم بالعربية (اختياري)', language)}
                    value={reminderForm.nameAr}
                    onChange={(e) => setReminderForm({ ...reminderForm, nameAr: e.target.value })}
                    dir="rtl"
                  />
                  <Input
                    label={t('Due date', 'تاريخ الاستحقاق', language)}
                    type="date"
                    value={reminderForm.dueDate}
                    onChange={(e) => setReminderForm({ ...reminderForm, dueDate: e.target.value })}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => setShowReminderForm(false)}>
                    {t('Cancel', 'إلغاء', language)}
                  </Button>
                  <Button onClick={handleCreateReminder} loading={savingReminder}>
                    {t('Set Reminder', 'تعيين التذكير', language)}
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-warning/10">
                <AlarmClock className="h-4 w-4 text-warning" />
              </div>
              <div>
                <h2 className="text-base font-semibold">{t('Action Required', 'يتطلب إجراءً', language)}</h2>
                <p className="text-xs text-gray-400">
                  {scoped ? t('Showing reminders related to your account', 'عرض التذكيرات المتعلقة بحسابك', language) : t('Expired or expiring within the next 60 days', 'منتهية أو تنتهي خلال 60 يوماً القادمة', language)}
                </p>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {loadingReminders ? (
                <div className="p-6">
                  <TableSkeleton rows={5} cols={4} />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="p-12 text-center">
                  <BadgeCheck className="mx-auto h-10 w-10 text-success" />
                  <p className="mt-3 text-sm text-gray-400">
                    {q
                      ? t('No reminders match your search', 'لا توجد تذكيرات مطابقة لبحثك', language)
                      : t('No reminders — everything is up to date 🎉', 'لا توجد تذكيرات — كل شيء محدث 🎉', language)}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 text-start text-xs text-gray-400">
                        <th className="px-6 py-3 font-medium text-start">{t('Item', 'العنصر', language)}</th>
                        <th className="px-6 py-3 font-medium text-start">{t('Due', 'الاستحقاق', language)}</th>
                        <th className="px-6 py-3 font-medium text-start">{t('Status', 'الحالة', language)}</th>
                        <th className="px-6 py-3 font-medium text-end">{t('Action', 'إجراء', language)}</th>
                      </tr>
                    </thead>
                    <tbody>{filteredItems.map((item) => renderReminderRow(item))}</tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>

          {dormant.length > 0 && (
            <Card>
              <CardHeader className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-success/10">
                  <BadgeCheck className="h-4 w-4 text-success" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">{t('Healthy (no action)', 'سليمة (لا إجراء)', language)}</h2>
                  <p className="text-xs text-gray-400">{dormant.length} {t('items with later expiry dates', 'عنصر تواريخ انتهاء لاحقة', language)}</p>
                </div>
              </CardHeader>
              <CardBody className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <tbody>
                      {dormant.slice(0, 10).map((item) => (
                        <tr key={item.id} className="border-b border-gray-50 last:border-0">
                          <td className="px-6 py-2 text-sm text-gray-500">{item.name}</td>
                          <td className="px-6 py-2 text-xs text-gray-400 whitespace-nowrap text-end">{formatDate(item.dueDate, language)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
