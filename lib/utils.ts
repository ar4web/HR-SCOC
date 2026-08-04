import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export function formatEmployeeId(index: number): string {
  return `EMP${String(index).padStart(6, '0')}`;
}

export function formatCurrency(amount: number, currency = 'SAR'): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string, locale: 'en' | 'ar' = 'en'): string {
  const d = new Date(date);
  return d.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'text-success bg-success/10',
    inactive: 'text-gray-500 bg-gray-100',
    terminated: 'text-error bg-error/10',
    suspended: 'text-warning bg-warning/10',
    pending: 'text-warning bg-warning/10',
    approved: 'text-success bg-success/10',
    rejected: 'text-error bg-error/10',
    present: 'text-success bg-success/10',
    late: 'text-warning bg-warning/10',
    absent: 'text-error bg-error/10',
  };
  return map[status] || 'text-gray-500 bg-gray-100';
}

export function getStatusLabel(status: string, locale: 'en' | 'ar' = 'en'): string {
  const labels: Record<string, Record<string, string>> = {
    en: {
      active: 'Active',
      inactive: 'Inactive',
      terminated: 'Terminated',
      suspended: 'Suspended',
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      cancelled: 'Cancelled',
      present: 'Present',
      late: 'Late',
      absent: 'Absent',
    },
    ar: {
      active: 'نشط',
      inactive: 'غير نشط',
      terminated: 'منتهي',
      suspended: 'موقوف',
      pending: 'قيد الانتظار',
      approved: 'معتمد',
      rejected: 'مرفوض',
      cancelled: 'ملغي',
      present: 'حاضر',
      late: 'متأخر',
      absent: 'غائب',
    },
  };
  return labels[locale]?.[status] || status;
}

export function getLeaveTypeLabel(type: string, locale: 'en' | 'ar' = 'en'): string {
  const labels: Record<string, Record<string, string>> = {
    en: {
      annual: 'Annual Leave',
      sick: 'Sick Leave',
      personal: 'Personal Leave',
      emergency: 'Emergency Leave',
      maternity: 'Maternity Leave',
      paternity: 'Paternity Leave',
      hajj: 'Hajj Leave',
      unpaid: 'Unpaid Leave',
    },
    ar: {
      annual: 'إجازة سنوية',
      sick: 'إجازة مرضية',
      personal: 'إجازة شخصية',
      emergency: 'إجازة طارئة',
      maternity: 'إجازة أمومة',
      paternity: 'إجازة أبوة',
      hajj: 'إجازة حج',
      unpaid: 'إجازة بدون راتب',
    },
  };
  return labels[locale]?.[type] || type;
}

export function getContractTypeLabel(type: string, locale: 'en' | 'ar' = 'en'): string {
  const labels: Record<string, Record<string, string>> = {
    en: {
      permanent: 'Permanent',
      fixed_term: 'Fixed Term',
      part_time: 'Part Time',
      probation: 'Probation',
    },
    ar: {
      permanent: 'دائم',
      fixed_term: 'محدد المدة',
      part_time: 'دوام جزئي',
      probation: 'تجريبي',
    },
  };
  return labels[locale]?.[type] || type;
}

export function t(en: string, ar: string, locale: 'en' | 'ar'): string {
  return locale === 'ar' ? ar : en;
}
