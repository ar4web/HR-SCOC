import { employees, documents } from '@/lib/mock-data';

export type ReminderKind = 'contract' | 'work_permit' | 'probation' | 'document';

export interface ReminderItem {
  id: string;
  kind: ReminderKind;
  kindLabel: { en: string; ar: string };
  employeeId?: string;
  employeeName?: string;
  employeeNameAr?: string;
  employeeDisplayId?: string;
  owner?: string;
  name: string;
  nameAr?: string;
  dueDate: string;
  daysLeft: number;
  status: 'expired' | 'expiring' | 'ok';
}

const DAYS_WINDOW = 60;

function daysUntil(dateStr: string): number {
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function statusOf(days: number): ReminderItem['status'] {
  if (days < 0) return 'expired';
  if (days <= DAYS_WINDOW) return 'expiring';
  return 'ok';
}

export function getReminders(): { items: ReminderItem[]; dormant: ReminderItem[] } {
  const items: ReminderItem[] = [];
  const dormant: ReminderItem[] = [];

  for (const emp of Array.from(employees.values())) {
    if (emp.contractEndDate) {
      const days = daysUntil(emp.contractEndDate);
      const item: ReminderItem = {
        id: `${emp.id}-contract`,
        kind: 'contract',
        kindLabel: { en: 'Contract', ar: 'العقد' },
        employeeId: emp.id,
        employeeName: emp.fullName,
        employeeNameAr: emp.fullNameAr,
        employeeDisplayId: emp.employeeId,
        name: `${emp.fullName} — ${emp.contractType === 'fixed_term' ? 'Fixed term' : 'Contract'}`,
        dueDate: emp.contractEndDate,
        daysLeft: days,
        status: statusOf(days),
      };
      (item.status === 'ok' ? dormant : items).push(item);
    }
    if (emp.workPermitExpiry) {
      const days = daysUntil(emp.workPermitExpiry);
      const item: ReminderItem = {
        id: `${emp.id}-permit`,
        kind: 'work_permit',
        kindLabel: { en: 'Work Permit', ar: 'تصريح العمل' },
        employeeId: emp.id,
        employeeName: emp.fullName,
        employeeNameAr: emp.fullNameAr,
        employeeDisplayId: emp.employeeId,
        name: `${emp.fullName} — Work permit`,
        dueDate: emp.workPermitExpiry,
        daysLeft: days,
        status: statusOf(days),
      };
      (item.status === 'ok' ? dormant : items).push(item);
    }
    if (emp.probationEndDate) {
      const days = daysUntil(emp.probationEndDate);
      const item: ReminderItem = {
        id: `${emp.id}-probation`,
        kind: 'probation',
        kindLabel: { en: 'Probation', ar: 'فترة التجربة' },
        employeeId: emp.id,
        employeeName: emp.fullName,
        employeeNameAr: emp.fullNameAr,
        employeeDisplayId: emp.employeeId,
        name: `${emp.fullName} — Probation ends`,
        dueDate: emp.probationEndDate,
        daysLeft: days,
        status: statusOf(days),
      };
      (item.status === 'ok' ? dormant : items).push(item);
    }
  }

  for (const doc of Array.from(documents.values())) {
    if (!doc.expiryDate) continue;
    const days = daysUntil(doc.expiryDate);
    const window = doc.remindDaysBefore || DAYS_WINDOW;
    const status: ReminderItem['status'] = days < 0 ? 'expired' : days <= window ? 'expiring' : 'ok';
    const item: ReminderItem = {
      id: doc.id,
      kind: 'document',
      kindLabel: { en: 'Document', ar: 'مستند' },
      owner: doc.owner,
      name: doc.nameAr || doc.name,
      dueDate: doc.expiryDate,
      daysLeft: days,
      status,
    };
    (status === 'ok' ? dormant : items).push(item);
  }

  const sortKey = (a: ReminderItem, b: ReminderItem) => a.daysLeft - b.daysLeft;
  items.sort(sortKey);
  dormant.sort(sortKey);
  return { items, dormant };
}

export function getReminderSummary() {
  const { items } = getReminders();
  return {
    expired: items.filter((i) => i.status === 'expired').length,
    expiring: items.filter((i) => i.status === 'expiring').length,
    total: items.length,
  };
}