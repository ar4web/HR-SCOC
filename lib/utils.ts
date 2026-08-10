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

export function formatCurrency(amount: number): string {
  const num = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${num} ﷼`;
}

export function formatDate(date: string, locale: 'en' | 'ar' = 'en'): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
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

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'text-success bg-success/10',
    inactive: 'text-gray-500 bg-gray-100',
    terminated: 'text-error bg-error/10',
    suspended: 'text-warning bg-warning/10',
    pending: 'text-warning bg-warning/10',
    approved: 'text-success bg-success/10',
    rejected: 'text-error bg-error/10',
    cancelled: 'text-gray-500 bg-gray-100',
    present: 'text-success bg-success/10',
    late: 'text-warning bg-warning/10',
    absent: 'text-error bg-error/10',
    half_day: 'text-info bg-info/10',
    overtime: 'text-info bg-info/10',
    reimbursed: 'text-success bg-success/10',
    draft: 'text-gray-500 bg-gray-100',
    processing: 'text-info bg-info/10',
    completed: 'text-success bg-success/10',
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
      half_day: 'Half Day',
      overtime: 'Overtime',
      reimbursed: 'Reimbursed',
      draft: 'Draft',
      processing: 'Processing',
      completed: 'Completed',
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
      half_day: 'نصف يوم',
      overtime: 'عمل إضافي',
      reimbursed: 'مُعاد صرفه',
      draft: 'مسودة',
      processing: 'قيد المعالجة',
      completed: 'مكتمل',
    },
  };
  return labels[locale]?.[status] || status;
}

export function getPriorityLabel(priority: string, locale: 'en' | 'ar' = 'en'): string {
  const labels: Record<string, Record<string, string>> = {
    en: { low: 'Low', medium: 'Medium', high: 'High', normal: 'Normal', urgent: 'Urgent' },
    ar: { low: 'منخفضة', medium: 'متوسطة', high: 'عالية', normal: 'عادية', urgent: 'عاجلة' },
  };
  return labels[locale]?.[priority] || priority;
}

export function getPaymentMethodLabel(method: string, locale: 'en' | 'ar' = 'en'): string {
  const labels: Record<string, Record<string, string>> = {
    en: {
      cash: 'Cash',
      card: 'Card',
      bank_transfer: 'Bank Transfer',
      mobile_payment: 'Mobile Payment',
      other: 'Other',
    },
    ar: {
      cash: 'نقدي',
      card: 'بطاقة',
      bank_transfer: 'تحويل بنكي',
      mobile_payment: 'دفع جوال',
      other: 'أخرى',
    },
  };
  return labels[locale]?.[method] || method;
}

export function getGenderLabel(gender: string, locale: 'en' | 'ar' = 'en'): string {
  const labels: Record<string, Record<string, string>> = {
    en: { male: 'Male', female: 'Female' },
    ar: { male: 'ذكر', female: 'أنثى' },
  };
  return labels[locale]?.[gender] || gender;
}

export function getMaritalStatusLabel(status: string, locale: 'en' | 'ar' = 'en'): string {
  const labels: Record<string, Record<string, string>> = {
    en: { single: 'Single', married: 'Married', divorced: 'Divorced', widowed: 'Widowed' },
    ar: { single: 'أعزب', married: 'متزوج', divorced: 'مطلق', widowed: 'أرمل' },
  };
  return labels[locale]?.[status] || status;
}

export function getReligionLabel(religion: string, locale: 'en' | 'ar' = 'en'): string {
  const labels: Record<string, Record<string, string>> = {
    en: { muslim: 'Muslim', other: 'Other' },
    ar: { muslim: 'مسلم', other: 'أخرى' },
  };
  return labels[locale]?.[religion] || religion;
}

export function getRoleLabel(role: string, locale: 'en' | 'ar' = 'en'): string {
  const labels: Record<string, Record<string, string>> = {
    en: { admin: 'Administrator', hr_manager: 'HR Manager', manager: 'Manager', employee: 'Employee' },
    ar: { admin: 'مدير النظام', hr_manager: 'مدير موارد بشرية', manager: 'مدير', employee: 'موظف' },
  };
  return labels[locale]?.[role] || role.replace('_', ' ');
}

export function daysUntil(date?: string): number | null {
  if (!date) return null;
  const target = new Date(date);
  if (isNaN(target.getTime())) return null;
  target.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
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
