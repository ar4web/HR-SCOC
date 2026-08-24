'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { todoService } from '@/modules/todo-management/service';
import { ModuleSettingsMenu } from '@/components/module-settings/ModuleSettingsMenu';
import { Todo } from '@/types';
import { t, formatDate, getPriorityLabel, getStatusLabel } from '@/lib/utils';
import { ListTodo, Plus, CheckCircle2, Clock, AlertCircle, Trash2, Search, Pencil } from 'lucide-react';

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

export function TodosContent() {
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const [todos, setTodos] = React.useState<Todo[]>([]);
  const [totals, setTotals] = React.useState<{ pending: number; in_progress: number; completed: number }>({ pending: 0, in_progress: 0, completed: 0 });
  const [loading, setLoading] = React.useState(true);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState('open');
  const [search, setSearch] = React.useState('');
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

  const load = React.useCallback(async (status = statusFilter, q = search) => {
    setLoading(true);
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
    setLoading(false);
  }, [statusFilter, search]);

  React.useEffect(() => {
    load();
  }, [load]);

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
        load(statusFilter, search);
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
        load(statusFilter, search);
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
      load(statusFilter, search);
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to delete task', 'فشل حذف المهمة', language) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('To-Do List', 'قائمة المهام', language)}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('Track tasks, deadlines and priorities', 'تتبع المهام والمواعيد والأولويات', language)}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Button onClick={openCreate} title={t('New Task', 'مهمة جديدة', language)} aria-label={t('New Task', 'مهمة جديدة', language)}>
            <Plus className="h-4 w-4" />
          </Button>
          <ModuleSettingsMenu module={t('To-Do', 'المهام', language)} />
        </div>
      </div>

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
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
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

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-white px-5 py-3.5 shadow-card">
        {[
          { label: t('Pending', 'قيد الانتظار', language), value: totals.pending, icon: Clock, cls: 'text-warning' },
          { label: t('In Progress', 'قيد التنفيذ', language), value: totals.in_progress, icon: AlertCircle, cls: 'text-info' },
          { label: t('Completed', 'مكتملة', language), value: totals.completed, icon: CheckCircle2, cls: 'text-success' },
        ].map((s2, i) => (
          <div key={s2.label} className={`flex items-center gap-2 ${i > 0 ? 'sm:border-s sm:border-gray-100 sm:ps-6' : ''}`}>
            <s2.icon className={`h-4 w-4 ${s2.cls}`} />
            <span className="text-lg font-bold leading-none text-gray-900">{s2.value}</span>
            <span className="text-xs text-gray-500">{s2.label}</span>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="flex items-center gap-3 flex-wrap">
          <ListTodo className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{t('Tasks', 'المهام', language)}</h2>
          <div className="flex-1" />
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 rtl:left-auto rtl:right-3 top-2.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                load(statusFilter, e.target.value);
              }}
              placeholder={t('Search tasks...', 'ابحث عن مهام...', language)}
              className="block w-56 rounded-lg border border-gray-300 pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              load(e.target.value, search);
            }}
            className="block rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="open">
              {t('Open Tasks', 'المهام المفتوحة', language)} ({totals.pending + totals.in_progress})
            </option>
            <option value="">{t('All Statuses', 'كل الحالات', language)}</option>
            <option value="pending">{t('Pending', 'قيد الانتظار', language)}</option>
            <option value="in_progress">{t('In Progress', 'قيد التنفيذ', language)}</option>
            <option value="completed">{t('Completed', 'مكتملة', language)}</option>
          </select>
        </CardHeader>
        <CardBody>
          {loading ? (
            <TableSkeleton rows={5} cols={4} />
          ) : todos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              {t('No tasks found. Create your first task!', 'لا توجد مهام. أنشئ مهمتك الأولى!', language)}
            </p>
          ) : (
            <div className="space-y-3">
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  className={`rounded-xl bg-white shadow-card p-4 flex items-start gap-4 ${
                    todo.status === 'completed' ? 'bg-gray-50/60' : ''
                  }`}
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
                      className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-gray-100"
                      title={t('Edit', 'تعديل', language)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(todo.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-error hover:bg-error/10"
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
    </div>
  );
}
