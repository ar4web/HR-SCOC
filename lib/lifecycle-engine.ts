import { lifecycles, addLifecycle, deleteLifecycle as removeLifecycle, employees, addNotification, persistData } from '@/lib/mock-data';
import { generateId } from '@/lib/utils';
import { EmployeeLifecycle, LifecycleStatus, LifecycleTaskStatus, LifecycleType, UserRole } from '@/types';
import { hasPermission } from '@/lib/rbac';

export const LIFECYCLE_ONBOARDING_TASKS: { en: string; ar: string }[] = [
  { en: 'Sign employment contract', ar: 'توقيع عقد العمل' },
  { en: 'Verify National ID / Iqama', ar: 'التحقق من الهوية الوطنية / الإقامة' },
  { en: 'Issue company email & accounts', ar: 'إصدار البريد الإلكتروني والحسابات' },
  { en: 'Open bank account for payroll', ar: 'فتح حساب بنكي للرواتب' },
  { en: 'Apply for work permit', ar: 'تقديم طلب تصريح العمل' },
  { en: 'Provision workstation & tools', ar: 'تجهيز جهاز العمل والأدوات' },
  { en: 'Complete HR induction briefing', ar: 'إكمال جلسة تعريفية بالموارد البشرية' },
  { en: 'Schedule probation review', ar: 'جدولة مراجعة فترة التجربة' },
];

export const LIFECYCLE_OFFBOARDING_TEMPLATE: { en: string; ar: string }[] = [
  { en: 'Conduct exit interview', ar: 'إجراء مقابلة خروج' },
  { en: 'Complete duties handover', ar: 'إتمام نقل المهام' },
  { en: 'Return company assets', ar: 'إعادة معدات الشركة' },
  { en: 'Revoke system & email access', ar: 'إلغاء صلاحيات النظام والبريد' },
  { en: 'Calculate final settlement', ar: 'احتساب التسوية النهائية' },
  { en: 'Settle leave balance', ar: 'تسوية رصيد الإجازات' },
  { en: 'Issue exit certificate', ar: 'إصدار شهادة نهاية الخدمة' },
];



export function createLifecycle(data: {
  employeeId: string;
  type: LifecycleType;
  dueDate?: string;
  notes?: string;
  createdBy?: string;
}): { success: boolean; lifecycle?: EmployeeLifecycle; error?: string } {
  const emp = employees.get(data.employeeId);
  if (!emp) return { success: false, error: 'Employee not found' };

  const template = data.type === 'onboarding' ? LIFECYCLE_ONBOARDING_TASKS : LIFECYCLE_OFFBOARDING_TEMPLATE;
  const tasks = template.map((t) => ({
    id: `task-${generateId()}-${Math.random().toString(36).slice(2, 8)}`,
    name: t.en,
    nameAr: t.ar,
    status: 'pending' as LifecycleTaskStatus,
  }));

  const lifecycle = addLifecycle({
    companyId: 'demo-company',
    employeeId: data.employeeId,
    type: data.type,
    status: 'draft',
    tasks,
    dueDate: data.dueDate,
    notes: data.notes,
    createdBy: data.createdBy,
  });

  return { success: true, lifecycle };
}

export function listLifecycles(filters?: { type?: LifecycleType; status?: LifecycleStatus; employeeId?: string; search?: string }): EmployeeLifecycle[] {
  let list = Array.from(lifecycles.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  if (filters?.type) list = list.filter((l) => l.type === filters.type);
  if (filters?.status) list = list.filter((l) => l.status === filters.status);
  if (filters?.employeeId) list = list.filter((l) => l.employeeId === filters.employeeId);
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    list = list.filter((l) => {
      const emp = employees.get(l.employeeId);
      return (emp?.fullName || '').toLowerCase().includes(q) || (emp?.employeeId || '').toLowerCase().includes(q);
    });
  }
  return list;
}

export function setTaskStatus(lifecycleId: string, taskId: string, status: LifecycleTaskStatus): { success: boolean; error?: string } {
  const lifecycle = lifecycles.get(lifecycleId);
  if (!lifecycle) return { success: false, error: 'Lifecycle not found' };
  const task = lifecycle.tasks.find((t) => t.id === taskId);
  if (!task) return { success: false, error: 'Task not found' };

  task.status = status;
  task.completedAt = status === 'done' ? new Date().toISOString() : undefined;

  const doneCount = lifecycle.tasks.filter((t) => t.status === 'done').length;
  if (doneCount === lifecycle.tasks.length && lifecycle.status !== 'completed') {
    lifecycle.status = 'completed';
    lifecycle.completedAt = new Date().toISOString();
  } else if (doneCount < lifecycle.tasks.length && lifecycle.status === 'completed') {
    lifecycle.status = 'in_progress';
    lifecycle.completedAt = undefined;
  } else if (lifecycle.status === 'draft' && doneCount > 0) {
    lifecycle.status = 'in_progress';
    lifecycle.startedAt = new Date().toISOString();
  }
  lifecycle.updatedAt = new Date().toISOString();
  persistData();
  return { success: true };
}

export function setLifecycleStatus(lifecycleId: string, status: LifecycleStatus): { success: boolean; error?: string } {
  const lifecycle = lifecycles.get(lifecycleId);
  if (!lifecycle) return { success: false, error: 'Lifecycle not found' };
  lifecycles.set(lifecycleId, {
    ...lifecycle,
    status,
    startedAt: status === 'in_progress' ? lifecycle.startedAt || new Date().toISOString() : lifecycle.startedAt,
    completedAt: status === 'completed' ? new Date().toISOString() : lifecycle.completedAt,
    updatedAt: new Date().toISOString(),
  });
  persistData();
  return { success: true };
}

export function removeLifecycleById(id: string): boolean {
  return removeLifecycle(id);
}

export function getLifecycleSummary(): { total: number; inProgress: number; completed: number; overdue: number; cancelled: number } {
  const list = Array.from(lifecycles.values());
  const overdue = list.filter((l) => l.status !== 'completed' && l.status !== 'cancelled' && l.dueDate && l.dueDate < new Date().toISOString().slice(0, 10));
  return {
    total: list.length,
    inProgress: list.filter((l) => l.status === 'in_progress' || l.status === 'draft').length,
    completed: list.filter((l) => l.status === 'completed').length,
    overdue: overdue.length,
    cancelled: list.filter((l) => l.status === 'cancelled').length,
  };
}

export function notifyLifecycleUser(lifecycle: EmployeeLifecycle): void {
  const emp = employees.get(lifecycle.employeeId);
  if (!emp) return;
  const targetId = emp.userId || 'user-1';
  const itOnboarding = lifecycle.type === 'onboarding';
  addNotification({
    companyId: 'demo-company',
    userId: targetId,
    title: itOnboarding ? 'Onboarding Checklist' : 'Offboarding Checklist',
    titleAr: itOnboarding ? 'قائمة الانضمام' : 'قائمة المغادرة',
    message: `${emp.fullName}: ${itOnboarding ? 'your onboarding checklist' : 'your offboarding checklist'} has been created`,
    messageAr: `${emp.fullNameAr || emp.fullName}: تم إنشاء قائمة ${itOnboarding ? 'الانضمام' : 'المغادرة'} الخاص بك`,
    type: 'info',
    read: false,
    link: '/lifecycle',
  });
}

export function authCanManage(role?: string): boolean {
  return hasPermission(role as UserRole, 'employee:manage') || hasPermission(role as UserRole, 'employee:view_all');
}