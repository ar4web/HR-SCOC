import { companies, employees, leaves, persistData } from '@/lib/mock-data';
import { LeavePolicy, LeaveType } from '@/types';

export function getLeavePolicies(): LeavePolicy[] {
  const company = Array.from(companies.values())[0];
  return company?.settings?.leavePolicies || [];
}

export function getPolicy(type: LeaveType): LeavePolicy | undefined {
  return getLeavePolicies().find((p) => p.type === type);
}

export function remainingForYear(employeeId: string, type: LeaveType): number {
  const policy = getPolicy(type);
  if (!policy) return 0;
  const year = new Date().getFullYear();
  const used = Array.from(leaves.values())
    .filter(
      (l) =>
        l.employeeId === employeeId &&
        l.type === type &&
        l.status !== 'cancelled' &&
        l.status !== 'rejected' &&
        new Date(l.startDate).getFullYear() === year
    )
    .reduce((s, l) => s + l.daysCount, 0);
  return Math.max(0, policy.daysPerYear - used);
}

export function validateLeaveRequest(employeeId: string, type: LeaveType, days: number): { ok: boolean; error?: string } {
  const policy = getPolicy(type);
  if (!policy) return { ok: true };
  if (days <= 0) return { ok: false, error: 'Leave duration must be at least 1 day.' };
  const remaining = remainingForYear(employeeId, type);
  if (days > remaining) {
    return {
      ok: false,
      error: `Requested ${days} day(s) exceeds the remaining ${remaining} for ${type} leave (policy allows ${policy.daysPerYear} per year).`,
    };
  }
  return { ok: true };
}

export function leavePolicyHint(type: LeaveType, locale: 'en' | 'ar'): string {
  const policy = getPolicy(type);
  if (!policy) return '';
  const paid = locale === 'ar' ? (policy.paid ? 'مدفوعة' : 'غير مدفوعة') : policy.paid ? 'Paid' : 'Unpaid';
  const days = locale === 'ar' ? `${policy.daysPerYear} يوم / سنة` : `${policy.daysPerYear} days / year`;
  return `${paid} · ${days}`;
}

export function decrementAnnualBalance(employeeId: string, days: number): void {
  const emp = employees.get(employeeId);
  if (!emp || emp.vacationBalance === undefined) return;
  emp.vacationBalance = Math.max(0, emp.vacationBalance - days);
  persistData();
}