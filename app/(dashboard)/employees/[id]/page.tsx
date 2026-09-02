'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguageStore } from '@/stores/language-store';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DetailSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { EmployeeReport } from '@/components/employee-report/EmployeeReport';
import { employeeService } from '@/modules/employee-management/service';
import { ContractType, Employee } from '@/types';
import { t, formatDate, formatCurrency, getContractTypeLabel, getGenderLabel, getMaritalStatusLabel, calculateAge, daysUntil } from '@/lib/utils';
import { FormBuilder, FormField } from '@/engines/form-engine';
import { useToast } from '@/components/ui/Toast';
import {
  ArrowLeft, User, Mail, Phone, MapPin, Briefcase, DollarSign, SearchX,
  Pencil, X, Shield, CreditCard, FileText, CalendarDays, BarChart3,
  Timer, Wallet, Plane, AlarmClock, Copy, Check,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

function initialsFor(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || '?';
}

const STATUS_DOT: Record<string, string> = {
  active: 'bg-success',
  on_leave: 'bg-warning',
  terminated: 'bg-error',
  suspended: 'bg-gray-400',
};

function Avatar({ name, status, className }: { name: string; status?: string; className?: string }) {
  return (
    <div className="relative shrink-0">
      <div className={`flex select-none items-center justify-center rounded-full bg-primary/10 font-bold text-primary ${className || 'h-11 w-11 text-sm'}`}>
        {initialsFor(name)}
      </div>
      {status && (
        <span className={`absolute bottom-0 end-0 block h-3 w-3 rounded-full ring-2 ring-white ${STATUS_DOT[status] || 'bg-gray-300'}`} />
      )}
    </div>
  );
}

function Field({ label, value, strong, className }: { label: string; value: React.ReactNode; strong?: boolean; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className={`mt-1 break-words text-sm ${strong ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{value}</dd>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: LucideIcon;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md bg-white shadow-card">
      <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function ExpiryRow({ label, date, locale }: { label: string; date?: string; locale: 'en' | 'ar' }) {
  const days = daysUntil(date);
  if (!date || days === null) return null;
  const tone = days < 0 ? 'bg-error/10 text-error' : days <= 90 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success';
  const barTone = days < 0 ? 'bg-error' : days <= 90 ? 'bg-warning' : 'bg-success';
  const pct = days < 0 ? 100 : Math.max(4, Math.min(100, Math.round(100 - (Math.min(days, 365) / 365) * 100)));
  const text = days < 0 ? t('Expired', 'منتهي', locale) : `${days} ${t('days left', 'يوم متبقي', locale)}`;
  return (
    <div className="border-b border-gray-50 py-2.5 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-800">{label}</p>
          <p className="text-xs text-gray-400">{formatDate(date, locale)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tone}`}>{text}</span>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${barTone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SalaryRow({ label, value, dotHex, strong }: { label: string; value: string; dotHex?: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-2 ${strong ? '' : 'border-b border-gray-50'}`}>
      <span className={`flex items-center gap-2 text-sm ${strong ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
        {dotHex && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dotHex }} />}
        {label}
      </span>
      <span className={`text-sm ${strong ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>{value}</span>
    </div>
  );
}

function QuickStat({ icon: Icon, label, value, sub, chip }: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  sub?: string;
  chip: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 px-4 py-2.5">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${chip}`}>
        <Icon style={{ width: 15, height: 15 }} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
        <p className="truncate text-[13px] font-bold leading-tight text-gray-900">{value}</p>
        {sub && <p className="truncate text-[10px] text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

function fallbackCopy(text: string): boolean {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function CopyChip({ value, icon: Icon }: { value: string; icon: LucideIcon }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        if (!value) return;
        const flash = () => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        };
        try {
          if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(value).then(flash).catch(() => {
              // Clipboard API blocked (e.g. cross-origin iframe) — fallback below.
              fallbackCopy(value) && flash();
            });
          } else {
            fallbackCopy(value) && flash();
          }
        } catch {
          // never let a copy attempt crash the page
        }
      }}
      className="group flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-start text-[13px] text-gray-600 transition-colors hover:bg-gray-50"
      title={value}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
      <span className="min-w-0 flex-1 truncate">{value || '—'}</span>
      {value && (
        copied
          ? <Check className="h-3 w-3 shrink-0 text-success" />
          : <Copy className="h-3 w-3 shrink-0 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}

const SALARY_HEX = { basic: '#0f766e', housing: '#16a34a', transportation: '#d97706', other: '#7c3aed' };

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { language, dir } = useLanguageStore();
  const { addToast } = useToast();
  const [employee, setEmployee] = React.useState<Employee | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [view, setView] = React.useState<'overview' | 'analytics'>('overview');

  const loadEmployee = React.useCallback(async () => {
    const res = await employeeService.getById(id as string);
    if (res.success && res.data) {
      setEmployee(res.data);
    }
    setLoading(false);
  }, [id]);

  React.useEffect(() => {
    loadEmployee();
  }, [loadEmployee]);

  const editFields: FormField[][] = [
    [
      { name: 'fullName', label: 'Full Name', labelAr: 'الاسم الكامل', required: true },
      { name: 'fullNameAr', label: 'Full Name (Arabic)', labelAr: 'الاسم الكامل (عربي)' },
    ],
    [
      { name: 'email', label: 'Email', labelAr: 'البريد الإلكتروني', type: 'email' },
      { name: 'phone', label: 'Phone', labelAr: 'الهاتف', type: 'tel' },
    ],
    [
      { name: 'nationalId', label: 'National ID', labelAr: 'رقم الهوية الوطنية', validation: { minLength: 10, maxLength: 10, pattern: /^\d{10}$/ } },
      { name: 'iqamaNumber', label: 'Iqama Number', labelAr: 'رقم الإقامة', validation: { minLength: 10, maxLength: 12, pattern: /^\d{10,12}$/ } },
    ],
    [
      { name: 'nationality', label: 'Nationality', labelAr: 'الجنسية' },
    ],
    [
      {
        name: 'gender',
        label: 'Gender',
        labelAr: 'الجنس',
        type: 'select',
        options: [
          { value: 'male', label: 'Male', labelAr: 'ذكر' },
          { value: 'female', label: 'Female', labelAr: 'أنثى' },
        ],
      },
      {
        name: 'maritalStatus',
        label: 'Marital Status',
        labelAr: 'الحالة الاجتماعية',
        type: 'select',
        options: [
          { value: 'single', label: 'Single', labelAr: 'أعزب' },
          { value: 'married', label: 'Married', labelAr: 'متزوج' },
          { value: 'divorced', label: 'Divorced', labelAr: 'مطلق' },
          { value: 'widowed', label: 'Widowed', labelAr: 'أرمل' },
        ],
      },
    ],
    [
      { name: 'department', label: 'Department', labelAr: 'القسم', required: true },
      { name: 'position', label: 'Position', labelAr: 'المنصب', required: true },
    ],
    [
      {
        name: 'contractType',
        label: 'Contract Type',
        labelAr: 'نوع العقد',
        type: 'select',
        options: [
          { value: 'permanent', label: 'Permanent', labelAr: 'دائم' },
          { value: 'fixed_term', label: 'Fixed Term', labelAr: 'محدد المدة' },
          { value: 'part_time', label: 'Part Time', labelAr: 'دوام جزئي' },
          { value: 'probation', label: 'Probation', labelAr: 'تجريبي' },
        ],
      },
      { name: 'hireDate', label: 'Hire Date', labelAr: 'تاريخ التعيين', type: 'date' },
    ],
    [
      { name: 'basicSalary', label: 'Basic Salary', labelAr: 'الراتب الأساسي', type: 'number' },
      { name: 'housingAllowance', label: 'Housing Allowance', labelAr: 'بدل السكن', type: 'number' },
    ],
    [
      { name: 'transportAllowance', label: 'Transport Allowance', labelAr: 'بدل النقل', type: 'number' },
      { name: 'bankName', label: 'Bank Name', labelAr: 'اسم البنك' },
    ],
    [
      { name: 'iban', label: 'IBAN', labelAr: 'الآيبان', validation: { minLength: 24, maxLength: 24 } },
      { name: 'city', label: 'City', labelAr: 'المدينة' },
    ],
    [
      { name: 'sponsorName', label: 'Sponsor Name', labelAr: 'اسم الكفيل' },
      { name: 'sponsorId', label: 'Sponsor ID', labelAr: 'رقم الكفيل' },
    ],
    [
      { name: 'annualVacationDays', label: 'Annual Vacation Days', labelAr: 'إجازة سنوية (أيام)', type: 'number' },
      { name: 'vacationBalance', label: 'Vacation Balance', labelAr: 'رصيد الإجازة', type: 'number' },
    ],
    [
      { name: 'endOfServiceAllowance', label: 'End of Service Allowance', labelAr: 'نهاية الخدمة', type: 'number' },
      { name: 'contractEndDate', label: 'Contract End Date', labelAr: 'انتهاء العقد', type: 'date' },
    ],
    [
      { name: 'probationEndDate', label: 'Probation End Date', labelAr: 'انتهاء فترة التجربة', type: 'date' },
      { name: 'workPermitExpiry', label: 'Work Permit Expiry', labelAr: 'انتهاء تصريح العمل', type: 'date' },
    ],
    [
      { name: 'iqamaExpiryDate', label: 'Iqama Expiry Date', labelAr: 'انتهاء الإقامة', type: 'date' },
    ],
  ];

  const handleSave = async (values: Record<string, string>) => {
    if (!employee) return;
    setSaving(true);
    const vacBalance = parseInt(values.vacationBalance, 10);
    const res = await employeeService.update(employee.id, {
      fullName: values.fullName || '',
      fullNameAr: values.fullNameAr || '',
      email: values.email || '',
      phone: values.phone || '',
      nationalId: values.nationalId || '',
      iqamaNumber: values.iqamaNumber || '',
      nationality: values.nationality || 'Saudi',
      gender: (values.gender as 'male' | 'female') || employee.gender,
      maritalStatus: (values.maritalStatus as 'single' | 'married' | 'divorced' | 'widowed') || employee.maritalStatus,
      department: values.department || '',
      position: values.position || '',
      contractType: (values.contractType as ContractType) || employee.contractType,
      hireDate: values.hireDate || '',
      salary: {
        ...employee.salary,
        basic: parseFloat(values.basicSalary) || 0,
        housing: parseFloat(values.housingAllowance) || 0,
        transportation: parseFloat(values.transportAllowance) || 0,
        bankName: values.bankName || '',
        iban: values.iban || '',
        bankAccount: values.iban || employee.salary.bankAccount,
      },
      address: { ...employee.address, city: values.city || '' },
      sponsorName: values.sponsorName || '',
      sponsorId: values.sponsorId || '',
      annualVacationDays: parseInt(values.annualVacationDays) || employee.annualVacationDays || 30,
      vacationBalance: Number.isFinite(vacBalance) ? vacBalance : employee.vacationBalance,
      endOfServiceAllowance: parseFloat(values.endOfServiceAllowance) || employee.endOfServiceAllowance || 0,
      probationEndDate: values.probationEndDate || '',
      workPermitExpiry: values.workPermitExpiry || '',
      iqamaExpiryDate: values.iqamaExpiryDate || '',
      contractEndDate: values.contractEndDate || '',
    });
    setSaving(false);
    if (res.success) {
      addToast({
        type: 'success',
        title: t('Employee updated successfully', 'تم تحديث الموظف بنجاح', language),
      });
      setEditing(false);
      await loadEmployee();
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to update employee', 'فشل في تحديث الموظف', language) });
    }
  };

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!employee) {
    return (
      <EmptyState
        icon={SearchX}
        title={t('Employee not found', 'لم يتم العثور على الموظف', language)}
        description={t('The employee record you are looking for does not exist', 'سجل الموظف الذي تبحث عنه غير موجود', language)}
        locale={language}
        action={
          <Button variant="secondary" onClick={() => router.push('/employees')}>
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {t('Back to Employees', 'العودة للموظفين', language)}
          </Button>
        }
      />
    );
  }

  const displayName = language === 'ar' ? employee.fullNameAr || employee.fullName : employee.fullName;
  const hireTs = employee.hireDate ? new Date(employee.hireDate).getTime() : NaN;
  const serviceMonths = Number.isFinite(hireTs) ? Math.max(0, Math.round((Date.now() - hireTs) / (1000 * 60 * 60 * 24 * 30))) : 0;
  const serviceYears = Math.floor(serviceMonths / 12);
  const tenureLabel = serviceYears > 0
    ? `${serviceYears} ${t('yrs', 'سنة', language)} ${serviceMonths % 12} ${t('mo', 'شهر', language)}`
    : `${serviceMonths} ${t('months', 'شهر', language)}`;
  const balanceIsLow = employee.vacationBalance != null && employee.vacationBalance <= 5;

  // Nearest upcoming renewal across tracked dates.
  const expiries = [
    { label: t('Iqama', 'الإقامة', language), days: daysUntil(employee.iqamaExpiryDate) },
    { label: t('Work Permit', 'تصريح العمل', language), days: daysUntil(employee.workPermitExpiry) },
    { label: t('Contract', 'العقد', language), days: daysUntil(employee.contractEndDate) },
    { label: t('Probation', 'التجربة', language), days: daysUntil(employee.probationEndDate) },
  ].filter((e): e is { label: string; days: number } => e.days !== null);
  const nextExpiry = expiries.length
    ? expiries.reduce((min, e) => (e.days < min.days ? e : min))
    : null;
  const nextExpiryTone = !nextExpiry
    ? 'bg-gray-100 text-gray-500'
    : nextExpiry.days < 0
      ? 'bg-error/10 text-error'
      : nextExpiry.days <= 90
        ? 'bg-warning/10 text-warning'
        : 'bg-success/10 text-success';

  // Proportional salary composition bar.
  const salaryParts = [
    { key: 'basic', value: employee.salary.basic, hex: SALARY_HEX.basic },
    { key: 'housing', value: employee.salary.housing, hex: SALARY_HEX.housing },
    { key: 'transportation', value: employee.salary.transportation, hex: SALARY_HEX.transportation },
    { key: 'other', value: employee.salary.otherAllowances, hex: SALARY_HEX.other },
  ].filter((p) => p.value > 0);
  const salarySum = salaryParts.reduce((s, p) => s + p.value, 0);

  const tabs = [
    { value: 'overview' as const, icon: User, label: t('Overview', 'نظرة عامة', language) },
    { value: 'analytics' as const, icon: BarChart3, label: t('Analytics', 'التحليلات', language) },
  ];

  return (
    <div className="space-y-4" dir={dir}>
      {/* Identity band — one slim card: identity row + integrated stat strip */}
      <div className="overflow-hidden rounded-md bg-white shadow-card">
        <div className="h-0.5 w-full bg-primary/60" />
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            title={t('Back', 'رجوع', language)}
            className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 rtl:rotate-180"
          >
            <ArrowLeft style={{ width: 18, height: 18 }} />
          </button>
          <Avatar name={employee.fullName} status={employee.status} className="h-10 w-10 text-sm" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-bold leading-tight text-gray-900">{displayName}</h1>
              <Badge status={employee.status} locale={language} />
              <span className="rounded-full bg-gray-100 px-2 py-px text-[10px] font-semibold tracking-wide text-gray-500">{employee.employeeId}</span>
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-gray-500">
              <span className="flex items-center gap-1">
                <Briefcase className="h-3 w-3 text-gray-300" />
                {employee.position}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-gray-300" />
                {employee.department}
              </span>
            </p>
          </div>
          <div className="ms-auto flex items-center gap-1">
            {!editing && (
              <div className="me-1 flex items-center gap-0.5 rounded-md bg-gray-100/80 p-0.5">
                {tabs.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setView(tab.value)}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      view === tab.value ? 'bg-white text-primary shadow-card' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    <span className="max-[420px]:hidden">{tab.label}</span>
                  </button>
                ))}
              </div>
            )}
            {editing ? (
              <button
                onClick={() => setEditing(false)}
                title={t('Cancel', 'إلغاء', language)}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
                {t('Cancel', 'إلغاء', language)}
              </button>
            ) : (
              <button
                onClick={() => setEditing(true)}
                title={t('Edit Profile', 'تعديل الملف', language)}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <Pencil className="h-4 w-4" />
                <span className="max-[420px]:hidden">{t('Edit', 'تعديل', language)}</span>
              </button>
            )}
          </div>
        </div>

        {!editing && (
          <div className="grid grid-cols-2 border-t border-gray-100 bg-gray-50/50 sm:grid-cols-4 sm:divide-x sm:divide-gray-100 rtl:sm:divide-x-reverse max-sm:[&>*]:border-gray-100 max-sm:[&>*:nth-child(n+3)]:border-t max-sm:[&>*:nth-child(even)]:border-s">
            <QuickStat
              icon={Timer}
              label={t('Tenure', 'مدة الخدمة', language)}
              value={tenureLabel}
              sub={`${t('Since', 'منذ', language)} ${formatDate(employee.hireDate, language)}`}
              chip="bg-secondary/10 text-secondary"
            />
            <QuickStat
              icon={Wallet}
              label={t('Monthly Salary', 'الراتب الشهري', language)}
              value={formatCurrency(employee.salary.total)}
              sub={getContractTypeLabel(employee.contractType, language)}
              chip="bg-primary/10 text-primary"
            />
            <QuickStat
              icon={Plane}
              label={t('Vacation Balance', 'رصيد الإجازة', language)}
              value={
                employee.vacationBalance != null
                  ? <span className={balanceIsLow ? 'text-error' : ''}>{employee.vacationBalance} {t('days', 'يوم', language)}</span>
                  : '—'
              }
              sub={`${employee.annualVacationDays ?? 30} ${t('days / year', 'يوم / سنة', language)}`}
              chip="bg-info/10 text-info"
            />
            <QuickStat
              icon={AlarmClock}
              label={t('Next Renewal', 'أقرب تجديد', language)}
              value={
                nextExpiry
                  ? <span className={`rounded-full px-2 py-px text-xs ${nextExpiryTone}`}>
                      {nextExpiry.days < 0
                        ? `${nextExpiry.label} · ${t('Expired', 'منتهي', language)}`
                        : `${nextExpiry.label} · ${nextExpiry.days} ${t('d', 'يوم', language)}`}
                    </span>
                  : t('Nothing tracked', 'لا يوجد', language)
              }
              chip="bg-warning/10 text-warning"
            />
          </div>
        )}
      </div>

      {editing ? (
        <Card>
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-base font-semibold">{t('Edit Employee', 'تعديل الموظف', language)}</h2>
          </div>
          <div className="p-5">
            <FormBuilder
              fields={editFields}
              locale={language}
              onSubmit={handleSave}
              submitLabel="Save Changes"
              submitLabelAr="حفظ التغييرات"
              loading={saving}
              defaultValues={{
                fullName: employee.fullName,
                fullNameAr: employee.fullNameAr,
                email: employee.email,
                phone: employee.phone,
                nationalId: employee.nationalId,
                iqamaNumber: employee.iqamaNumber || '',
                nationality: employee.nationality,
                gender: employee.gender,
                maritalStatus: employee.maritalStatus,
                department: employee.department,
                position: employee.position,
                contractType: employee.contractType,
                hireDate: employee.hireDate,
                basicSalary: String(employee.salary.basic),
                housingAllowance: String(employee.salary.housing),
                transportAllowance: String(employee.salary.transportation),
                bankName: employee.salary.bankName || '',
                iban: employee.salary.iban || '',
                city: employee.address.city,
                sponsorName: employee.sponsorName || '',
                sponsorId: employee.sponsorId || '',
                annualVacationDays: String(employee.annualVacationDays ?? 30),
                vacationBalance: String(employee.vacationBalance ?? ''),
                endOfServiceAllowance: String(employee.endOfServiceAllowance ?? ''),
                contractEndDate: employee.contractEndDate || '',
                probationEndDate: employee.probationEndDate || '',
                workPermitExpiry: employee.workPermitExpiry || '',
                iqamaExpiryDate: employee.iqamaExpiryDate || '',
              }}
            />
          </div>
        </Card>
      ) : (
        <>
          {view === 'analytics' ? (
            <EmployeeReport employeeId={id as string} />
          ) : (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
              {/* Sidebar: identity + contact + sponsor */}
              <div className="space-y-4">
                <section className="rounded-md bg-white shadow-card">
                  <div className="flex flex-col items-center px-5 pt-6 text-center">
                    <Avatar name={employee.fullName} status={employee.status} className="h-16 w-16 text-lg" />
                    <h2 className="mt-3 text-base font-bold text-gray-900">{displayName}</h2>
                    <p className="text-sm text-gray-500">{employee.position}</p>
                    <p className="text-xs text-gray-400">{employee.department}</p>
                    <div className="mt-2">
                      <Badge status={employee.status} locale={language} />
                    </div>
                    <p className="mt-2 text-xs font-medium text-gray-400">{employee.employeeId}</p>
                  </div>

                  <div className="mt-5 border-t border-gray-100 px-4 py-4">
                    <p className="mb-2 px-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">{t('Contact', 'التواصل', language)}</p>
                    <div className="space-y-0.5">
                      <CopyChip icon={Mail} value={employee.email || ''} />
                      <CopyChip icon={Phone} value={employee.phone || ''} />
                      <div className="flex items-center gap-2 px-1.5 py-1 text-[13px] text-gray-600">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        <span className="min-w-0 truncate">
                          {[employee.address.city, employee.address.region].filter(Boolean).join(', ') || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 px-5 py-4">
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">{t('Sponsor', 'الكفيل', language)}</p>
                    <p className="text-sm font-medium text-gray-800">{employee.sponsorName || '—'}</p>
                    <p className="text-xs text-gray-400">{employee.sponsorId || '—'}</p>
                  </div>
                </section>

                <section className="rounded-md bg-white shadow-card">
                  <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <h2 className="text-sm font-semibold text-gray-900">{t('Key Facts', 'معلومات أساسية', language)}</h2>
                  </div>
                  <div className="p-5">
                    <dl className="space-y-3">
                      <Field label={t('Joined', 'تاريخ الانضمام', language)} value={formatDate(employee.hireDate, language)} />
                      <Field label={t('Tenure', 'مدة الخدمة', language)} value={tenureLabel} />
                      <Field label={t('Contract', 'العقد', language)} value={getContractTypeLabel(employee.contractType, language)} />
                      <Field label={t('Nationality', 'الجنسية', language)} value={employee.nationality || '—'} />
                      <Field label={t('Age', 'العمر', language)} value={`${calculateAge(employee.dateOfBirth)} ${t('yrs', 'سنة', language)}`} />
                    </dl>
                  </div>
                </section>
              </div>

              {/* Main: structured HR data — 3 cards per line */}
              <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Section icon={User} title={t('Personal Information', 'المعلومات الشخصية', language)}>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
                    <Field label={t('National ID', 'رقم الهوية', language)} value={employee.nationalId || '—'} strong />
                    <Field label={t('Iqama Number', 'رقم الإقامة', language)} value={employee.iqamaNumber || '—'} />
                    <Field label={t('Date of Birth', 'تاريخ الميلاد', language)} value={`${formatDate(employee.dateOfBirth, language)} (${calculateAge(employee.dateOfBirth)} ${t('yrs', 'سنة', language)})`} />
                    <Field label={t('Gender', 'الجنس', language)} value={getGenderLabel(employee.gender, language)} />
                    <Field label={t('Marital Status', 'الحالة الاجتماعية', language)} value={getMaritalStatusLabel(employee.maritalStatus, language)} />
                    <Field label={t('Nationality', 'الجنسية', language)} value={employee.nationality || '—'} />
                  </dl>
                </Section>

                <Section icon={Briefcase} title={t('Employment', 'التوظيف', language)}>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
                    <Field label={t('Department', 'القسم', language)} value={employee.department || '—'} strong />
                    <Field label={t('Position', 'المنصب', language)} value={employee.position || '—'} strong />
                    <Field label={t('Contract Type', 'نوع العقد', language)} value={getContractTypeLabel(employee.contractType, language)} />
                    <Field label={t('Hire Date', 'تاريخ التعيين', language)} value={formatDate(employee.hireDate, language)} />
                    <Field label={t('Contract End', 'انتهاء العقد', language)} value={employee.contractEndDate ? formatDate(employee.contractEndDate, language) : '—'} />
                    <Field label={t('Work Permit Expiry', 'انتهاء تصريح العمل', language)} value={employee.workPermitExpiry ? formatDate(employee.workPermitExpiry, language) : '—'} />
                  </dl>
                </Section>

                <Section icon={CalendarDays} title={t('Renewals & Expiries', 'التجديدات والانتهاءات', language)}>
                  <ExpiryRow locale={language} label={t('Iqama Expiry', 'انتهاء الإقامة', language)} date={employee.iqamaExpiryDate} />
                  <ExpiryRow locale={language} label={t('Work Permit', 'تصريح العمل', language)} date={employee.workPermitExpiry} />
                  <ExpiryRow locale={language} label={t('Contract End', 'انتهاء العقد', language)} date={employee.contractEndDate} />
                  <ExpiryRow locale={language} label={t('Probation End', 'انتهاء فترة التجربة', language)} date={employee.probationEndDate} />
                  {expiries.length === 0 && (
                    <p className="py-3 text-center text-sm text-gray-400">{t('No tracked dates', 'لا توجد تواريخ متتبعة', language)}</p>
                  )}
                </Section>

                <Section icon={DollarSign} title={t('Compensation', 'الراتب والمزايا', language)}>
                  {salarySum > 0 && (
                    <div className="mb-3 flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
                      {salaryParts.map((p) => (
                        <div key={p.key} style={{ width: `${(p.value / salarySum) * 100}%`, backgroundColor: p.hex }} />
                      ))}
                    </div>
                  )}
                  <SalaryRow label={t('Basic', 'أساسي', language)} value={formatCurrency(employee.salary.basic)} dotHex={SALARY_HEX.basic} />
                  <SalaryRow label={t('Housing', 'سكن', language)} value={formatCurrency(employee.salary.housing)} dotHex={SALARY_HEX.housing} />
                  <SalaryRow label={t('Transportation', 'مواصلات', language)} value={formatCurrency(employee.salary.transportation)} dotHex={SALARY_HEX.transportation} />
                  {employee.salary.otherAllowances > 0 && (
                    <SalaryRow label={t('Other Allowances', 'بدلات أخرى', language)} value={formatCurrency(employee.salary.otherAllowances)} dotHex={SALARY_HEX.other} />
                  )}
                  {employee.endOfServiceAllowance != null && employee.endOfServiceAllowance > 0 && (
                    <SalaryRow label={t('End of Service', 'نهاية الخدمة', language)} value={formatCurrency(employee.endOfServiceAllowance)} />
                  )}
                  <SalaryRow label={t('Total', 'الإجمالي', language)} value={formatCurrency(employee.salary.total)} strong />
                  <div className="mt-3 rounded-md bg-gray-50 px-4 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{t('Bank', 'البنك', language)}</p>
                    <p className="mt-0.5 text-sm font-medium text-gray-800">{employee.salary.bankName || '—'}</p>
                    <p className="break-words text-xs text-gray-500">{employee.salary.iban || employee.salary.bankAccount || '—'}</p>
                  </div>
                </Section>

                <Section icon={Shield} title={t('Time Off', 'الإجازات', language)}>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
                    <Field label={t('Annual Vacation', 'إجازة سنوية', language)} value={`${employee.annualVacationDays ?? '—'} ${t('days', 'يوم', language)}`} strong />
                    <Field
                      label={t('Vacation Balance', 'رصيد الإجازة', language)}
                      value={
                        employee.vacationBalance != null
                          ? <span className={balanceIsLow ? 'font-semibold text-error' : ''}>{`${employee.vacationBalance} ${t('days', 'يوم', language)}`}</span>
                          : '—'
                      }
                      strong
                    />
                  </dl>
                  {employee.vacationBalance != null && (employee.annualVacationDays ?? 0) > 0 && (
                    <div className="mt-4">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full ${balanceIsLow ? 'bg-error' : 'bg-info'}`}
                          style={{ width: `${Math.min(100, Math.round((employee.vacationBalance / (employee.annualVacationDays ?? 30)) * 100))}%` }}
                        />
                      </div>
                      <p className="mt-1.5 text-[11px] text-gray-400">
                        {Math.min(100, Math.round((employee.vacationBalance / (employee.annualVacationDays ?? 30)) * 100))}% {t('of annual entitlement remaining', 'من الاستحقاق السنوي متبقي', language)}
                      </p>
                    </div>
                  )}
                </Section>

                <Section icon={FileText} title={t('Documents', 'المستندات', language)}>
                  {employee.documents.length === 0 ? (
                    <p className="py-3 text-center text-sm text-gray-400">{t('No documents attached', 'لا توجد مستندات مرفقة', language)}</p>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {employee.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-2 py-2.5">
                          <FileText className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                          <span className="min-w-0 flex-1 truncate text-sm text-gray-700">{doc.name}</span>
                          <span className="shrink-0 text-xs text-gray-400">{formatDate(doc.uploadedAt, language)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
