'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguageStore } from '@/stores/language-store';
import { Card, CardBody } from '@/components/ui/Card';
import { DashboardTile } from '@/components/ui/DashboardTile';
import { Button } from '@/components/ui/Button';
import { DataTable, Column } from '@/engines/table-engine';
import { ColumnPicker } from '@/components/ui/ColumnPicker';
import { employeeService } from '@/modules/employee-management/service';
import { ModuleSettingsMenu } from '@/components/module-settings/ModuleSettingsMenu';
import PageHeader from '@/components/layout/PageHeader';
import { Employee, ColumnPickerColumn } from '@/types';
import { t, formatCurrency, formatDate, getContractTypeLabel, getStatusLabel } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/auth-store';
import { hasPermission } from '@/lib/rbac';
import { Users, Plus, Eye, Trash2, Upload, Download, UsersRound, CalendarDays, Clock3, DollarSign } from 'lucide-react';
import { EmployeeImportDialog } from '@/components/employees/EmployeeImportDialog';

const STORAGE_KEY = 'hrscoc-employee-columns';

const DEFAULT_VISIBLE = ['employeeId', 'fullName', 'department', 'position', 'nationality', 'salary.total', 'status', 'actions'];

const ALL_COLUMNS: ColumnPickerColumn[] = [
  { key: 'employeeId', label: 'Employee ID', labelAr: 'رقم الموظف', group: 'Personal', groupAr: 'المعلومات الشخصية', defaultVisible: true },
  { key: 'fullName', label: 'Full Name', labelAr: 'الاسم الكامل', group: 'Personal', groupAr: 'المعلومات الشخصية', defaultVisible: true },
  { key: 'email', label: 'Email', labelAr: 'البريد الإلكتروني', group: 'Personal', groupAr: 'المعلومات الشخصية' },
  { key: 'phone', label: 'Phone', labelAr: 'الهاتف', group: 'Personal', groupAr: 'المعلومات الشخصية' },
  { key: 'nationalId', label: 'National ID', labelAr: 'رقم الهوية', group: 'Personal', groupAr: 'المعلومات الشخصية' },
  { key: 'nationality', label: 'Nationality', labelAr: 'الجنسية', group: 'Personal', groupAr: 'المعلومات الشخصية', defaultVisible: true },
  { key: 'gender', label: 'Gender', labelAr: 'الجنس', group: 'Personal', groupAr: 'المعلومات الشخصية' },
  { key: 'maritalStatus', label: 'Marital Status', labelAr: 'الحالة الاجتماعية', group: 'Personal', groupAr: 'المعلومات الشخصية' },
  { key: 'dateOfBirth', label: 'Date of Birth', labelAr: 'تاريخ الميلاد', group: 'Personal', groupAr: 'المعلومات الشخصية' },

  { key: 'department', label: 'Department', labelAr: 'القسم', group: 'Employment', groupAr: 'التوظيف', defaultVisible: true },
  { key: 'position', label: 'Position', labelAr: 'الوظيفة', group: 'Employment', groupAr: 'التوظيف', defaultVisible: true },
  { key: 'hireDate', label: 'Hire Date', labelAr: 'تاريخ التعيين', group: 'Employment', groupAr: 'التوظيف' },
  { key: 'contractType', label: 'Contract Type', labelAr: 'نوع العقد', group: 'Employment', groupAr: 'التوظيف' },
  { key: 'contractEndDate', label: 'Contract End', labelAr: 'انتهاء العقد', group: 'Employment', groupAr: 'التوظيف' },
  { key: 'status', label: 'Status', labelAr: 'الحالة', group: 'Employment', groupAr: 'التوظيف', defaultVisible: true },
  { key: 'probationEndDate', label: 'Probation End', labelAr: 'انتهاء فترة التجربة', group: 'Employment', groupAr: 'التوظيف' },
  { key: 'workPermitExpiry', label: 'Work Permit Expiry', labelAr: 'انتهاء تصريح العمل', group: 'Employment', groupAr: 'التوظيف' },

  { key: 'salary.total', label: 'Total Salary', labelAr: 'إجمالي الراتب', group: 'Compensation', groupAr: 'التعويضات', defaultVisible: true },
  { key: 'salary.basic', label: 'Basic Salary', labelAr: 'الراتب الأساسي', group: 'Compensation', groupAr: 'التعويضات' },
  { key: 'salary.housing', label: 'Housing Allowance', labelAr: 'بدل السكن', group: 'Compensation', groupAr: 'التعويضات' },
  { key: 'salary.transportation', label: 'Transport Allowance', labelAr: 'بدل النقل', group: 'Compensation', groupAr: 'التعويضات' },
  { key: 'endOfServiceAllowance', label: 'End of Service', labelAr: 'مبلغ نهاية الخدمة', group: 'Compensation', groupAr: 'التعويضات' },

  { key: 'annualVacationDays', label: 'Annual Vacation', labelAr: 'إجازة سنوية (أيام)', group: 'Leave', groupAr: 'الإجازات' },
  { key: 'vacationBalance', label: 'Vacation Balance', labelAr: 'رصيد الإجازة', group: 'Leave', groupAr: 'الإجازات' },

  { key: 'sponsorName', label: 'Sponsor', labelAr: 'الكفيل', group: 'Sponsor', groupAr: 'الكفالة' },
  { key: 'sponsorId', label: 'Sponsor ID', labelAr: 'رقم الكفيل', group: 'Sponsor', groupAr: 'الكفالة' },
];

export default function EmployeesPage() {
  const router = useRouter();
  const { language, dir } = useLanguageStore();
  const { addToast } = useToast();
  const { user } = useAuthStore();
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  const [visibleKeys, setVisibleKeys] = React.useState<string[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_VISIBLE;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_VISIBLE;
    } catch {
      return DEFAULT_VISIBLE;
    }
  });
  const [importOpen, setImportOpen] = React.useState(false);

  React.useEffect(() => {
    loadEmployees();
  }, []);

  React.useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleKeys)); } catch {}
  }, [visibleKeys]);

  const loadEmployees = async () => {
    setLoading(true);
    const res = await employeeService.list({ page: 1, pageSize: 1000 });
    if (res.success && res.data) {
      setEmployees(res.data.data);
    }
    setLoading(false);
  };

  const handleDelete = async (emp: Employee) => {
    if (!window.confirm(t(`Delete ${emp.fullName}?`, `حذف ${emp.fullNameAr || emp.fullName}؟`, language))) return;
    setDeleting(emp.id);
    const res = await employeeService.remove(emp.id);
    if (res.success) {
      addToast({ type: 'success', title: t('Employee deleted', 'تم حذف الموظف', language) });
      loadEmployees();
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to delete employee', 'فشل حذف الموظف', language) });
    }
    setDeleting(null);
  };

  const allColumns: Column<Employee>[] = [
    {
      key: 'employeeId',
      header: t('Employee ID', 'رقم الموظف', language),
      sortable: true,
      render: (emp) => <span className="font-medium text-gray-900">{emp.employeeId}</span>,
    },
    {
      key: 'fullName',
      header: t('Full Name', 'الاسم الكامل', language),
      sortable: true,
      render: (emp) => (
        <div>
          <p className="font-medium text-gray-900">
            {language === 'ar' ? emp.fullNameAr || emp.fullName : emp.fullName}
          </p>
          <p className="text-xs text-gray-500">{emp.email}</p>
        </div>
      ),
    },
    { key: 'email', header: t('Email', 'البريد الإلكتروني', language), sortable: true },
    { key: 'phone', header: t('Phone', 'الهاتف', language), sortable: true },
    { key: 'nationalId', header: t('National ID', 'رقم الهوية', language), sortable: true },
    { key: 'nationality', header: t('Nationality', 'الجنسية', language), sortable: true },
    {
      key: 'gender',
      header: t('Gender', 'الجنس', language),
      sortable: true,
      render: (emp) => t(emp.gender === 'male' ? 'Male' : 'Female', emp.gender === 'male' ? 'ذكر' : 'أنثى', language),
    },
    {
      key: 'maritalStatus',
      header: t('Marital Status', 'الحالة الاجتماعية', language),
      sortable: true,
      render: (emp) => t(
        emp.maritalStatus.charAt(0).toUpperCase() + emp.maritalStatus.slice(1),
        emp.maritalStatus === 'single' ? 'أعزب' : emp.maritalStatus === 'married' ? 'متزوج' : emp.maritalStatus === 'divorced' ? 'مطلق' : 'أرمل',
        language
      ),
    },
    {
      key: 'dateOfBirth',
      header: t('Date of Birth', 'تاريخ الميلاد', language),
      sortable: true,
      render: (emp) => formatDate(emp.dateOfBirth, language),
    },

    { key: 'department', header: t('Department', 'القسم', language), sortable: true },
    { key: 'position', header: t('Position', 'الوظيفة', language), sortable: true },
    {
      key: 'hireDate',
      header: t('Hire Date', 'تاريخ التعيين', language),
      sortable: true,
      render: (emp) => formatDate(emp.hireDate, language),
    },
    {
      key: 'contractType',
      header: t('Contract Type', 'نوع العقد', language),
      sortable: true,
      render: (emp) => getContractTypeLabel(emp.contractType, language),
    },
    {
      key: 'contractEndDate',
      header: t('Contract End', 'انتهاء العقد', language),
      sortable: true,
      render: (emp) => emp.contractEndDate ? formatDate(emp.contractEndDate, language) : '—',
    },
    {
      key: 'status',
      header: t('Status', 'الحالة', language),
      sortable: true,
      render: (emp) => {
        const colors: Record<string, string> = {
          active: 'bg-success/10 text-success',
          inactive: 'bg-gray-100 text-gray-600',
          terminated: 'bg-error/10 text-error',
          suspended: 'bg-warning/10 text-warning',
        };
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[emp.status] || ''}`}>
            {getStatusLabel(emp.status, language)}
          </span>
        );
      },
    },
    {
      key: 'probationEndDate',
      header: t('Probation End', 'انتهاء التجربة', language),
      sortable: true,
      render: (emp) => emp.probationEndDate ? formatDate(emp.probationEndDate, language) : '—',
    },
    {
      key: 'workPermitExpiry',
      header: t('Work Permit Expiry', 'انتهاء تصريح العمل', language),
      sortable: true,
      render: (emp) => emp.workPermitExpiry ? formatDate(emp.workPermitExpiry, language) : '—',
    },

    {
      key: 'salary.total',
      header: t('Total Salary', 'إجمالي الراتب', language),
      sortable: true,
      render: (emp) => <span className="font-semibold text-gray-900">{formatCurrency(emp.salary.total)}</span>,
    },
    {
      key: 'salary.basic',
      header: t('Basic Salary', 'الراتب الأساسي', language),
      sortable: true,
      render: (emp) => formatCurrency(emp.salary.basic),
    },
    {
      key: 'salary.housing',
      header: t('Housing', 'بدل السكن', language),
      sortable: true,
      render: (emp) => formatCurrency(emp.salary.housing),
    },
    {
      key: 'salary.transportation',
      header: t('Transport', 'بدل النقل', language),
      sortable: true,
      render: (emp) => formatCurrency(emp.salary.transportation),
    },
    {
      key: 'endOfServiceAllowance',
      header: t('End of Service', 'نهاية الخدمة', language),
      sortable: true,
      render: (emp) => emp.endOfServiceAllowance ? formatCurrency(emp.endOfServiceAllowance) : '—',
    },

    {
      key: 'annualVacationDays',
      header: t('Annual Vacation', 'إجازة سنوية', language),
      sortable: true,
      render: (emp) => emp.annualVacationDays ? `${emp.annualVacationDays} ${t('days', 'يوم', language)}` : '—',
    },
    {
      key: 'vacationBalance',
      header: t('Vacation Balance', 'رصيد الإجازة', language),
      sortable: true,
      render: (emp) => emp.vacationBalance != null ? (
        <span className={`font-medium ${emp.vacationBalance <= 5 ? 'text-error' : 'text-gray-900'}`}>
          {emp.vacationBalance} {t('days', 'يوم', language)}
        </span>
      ) : '—',
    },

    {
      key: 'sponsorName',
      header: t('Sponsor', 'الكفيل', language),
      sortable: true,
      render: (emp) => emp.sponsorName || '—',
    },
    {
      key: 'sponsorId',
      header: t('Sponsor ID', 'رقم الكفيل', language),
      sortable: true,
      render: (emp) => emp.sponsorId || '—',
    },

    {
      key: 'actions',
      header: t('Actions', 'الإجراءات', language),
      render: (emp) => (
        <div className="flex items-center gap-3">
          <Link
            href={`/employees/${emp.id}`}
            className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary-dark transition-colors"
          >
            <Eye className="h-4 w-4" />
            {t('View', 'عرض', language)}
          </Link>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(emp);
            }}
            disabled={deleting === emp.id || !hasPermission(user?.role, 'employee:manage')}
            className="inline-flex items-center gap-1 text-sm text-error hover:text-error-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('Delete', 'حذف', language)}
            title={t('Delete', 'حذف', language)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const visibleColumns = (() => {
    const filtered = allColumns.filter((col) => visibleKeys.includes(col.key));
    const actionCol = allColumns.find((col) => col.key === 'actions');
    if (actionCol && !filtered.some((c) => c.key === 'actions')) {
      filtered.push(actionCol);
    }
    return filtered;
  })();

  const workforce = React.useMemo(() => {
    const active = employees.filter((employee) => employee.status === 'active').length;
    const departments = new Set(employees.map((employee) => employee.department).filter(Boolean)).size;
    const monthlyPayroll = employees.reduce((total, employee) => total + employee.salary.total, 0);
    return { active, departments, monthlyPayroll };
  }, [employees]);
  const canViewPayroll = hasPermission(user?.role, 'payroll:view');

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Employee Management', 'إدارة الموظفين', language)}
        subtitle={t('Manage your workforce', 'إدارة القوى العاملة لديك', language)}
        actions={
          <>
          <ColumnPicker
            columns={ALL_COLUMNS}
            visibleKeys={visibleKeys}
            onChange={setVisibleKeys}
          />
          {hasPermission(user?.role, 'employee:manage') && (
            <>
              <Button variant="outline" title={t('Import', 'استيراد', language)} aria-label={t('Import', 'استيراد', language)} onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                title={t('Export', 'تصدير', language)}
                aria-label={t('Export', 'تصدير', language)}
                onClick={async () => {
                  const token = localStorage.getItem('scos_token');
                  const res = await fetch('/api/employees/export', {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  if (!res.ok) return;
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'employees.xlsx';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Link href="/employees/new">
                <Button title={t('Add Employee', 'إضافة موظف', language)} aria-label={t('Add Employee', 'إضافة موظف', language)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </Link>
            </>
          )}
          <ModuleSettingsMenu module={t('Employees', 'الموظفون', language)} />
          </>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={t('Workforce overview', 'نظرة عامة على القوى العاملة', language)}>
        <DashboardTile icon={UsersRound} label={t('Total employees', 'إجمالي الموظفين', language)} value={String(employees.length)} sub={t('Across your company', 'في جميع الشركة', language)} className="p-4" />
        <DashboardTile icon={Users} label={t('Active staff', 'الموظفون النشطون', language)} value={String(workforce.active)} sub={`${employees.length ? Math.round((workforce.active / employees.length) * 100) : 0}% ${t('of workforce', 'من القوى العاملة', language)}`} iconClassName="bg-success/10 text-success" className="p-4" />
        <DashboardTile icon={UsersRound} label={t('Departments', 'الأقسام', language)} value={String(workforce.departments)} sub={t('Teams represented', 'فرق ممثلة', language)} iconClassName="bg-secondary/10 text-secondary" className="p-4" />
        <DashboardTile icon={DollarSign} label={t('Monthly payroll', 'إجمالي الرواتب', language)} value={formatCurrency(workforce.monthlyPayroll)} sub={t('Current employee records', 'سجلات الموظفين الحالية', language)} iconClassName="bg-warning/10 text-warning" className="p-4 col-span-2 lg:col-span-1" />
      </section>

      <section className={`grid gap-3 ${canViewPayroll ? 'grid-cols-3' : 'grid-cols-2'}`} aria-label={t('People operations', 'عمليات الموظفين', language)}>
        <Link href="/leaves" className="flex min-w-0 flex-col items-center gap-2 rounded-xl border border-gray-100 bg-white p-3 text-center shadow-card transition hover:border-primary/30 hover:bg-primary/5">
          <CalendarDays className="h-5 w-5 text-primary" />
          <span className="text-xs font-semibold text-gray-700">{t('Leaves', 'الإجازات', language)}</span>
        </Link>
        <Link href="/attendance" className="flex min-w-0 flex-col items-center gap-2 rounded-xl border border-gray-100 bg-white p-3 text-center shadow-card transition hover:border-primary/30 hover:bg-primary/5">
          <Clock3 className="h-5 w-5 text-primary" />
          <span className="text-xs font-semibold text-gray-700">{t('Attendance', 'الحضور', language)}</span>
        </Link>
        {canViewPayroll && (
          <Link href="/payroll" className="flex min-w-0 flex-col items-center gap-2 rounded-xl border border-gray-100 bg-white p-3 text-center shadow-card transition hover:border-primary/30 hover:bg-primary/5">
            <DollarSign className="h-5 w-5 text-primary" />
            <span className="text-xs font-semibold text-gray-700">{t('Payroll', 'الرواتب', language)}</span>
          </Link>
        )}
      </section>

      <Card>
        <CardBody className="p-4 sm:p-6">
          <DataTable<Employee>
            columns={visibleColumns}
            data={employees}
            loading={loading}
            locale={language}
            dir={dir}
            emptyMessage="No employees found"
            emptyMessageAr="لم يتم العثور على موظفين"
            getRowKey={(emp) => emp.id}
            onRowClick={(emp) => {
              router.push(`/employees/${emp.id}`);
            }}
            filters={[
              {
                key: 'department',
                label: 'Department',
                labelAr: 'القسم',
                options: Array.from(new Set(employees.map((e) => e.department))).map((d) => ({ value: d, label: d })),
                getValue: (e) => e.department,
              },
              {
                key: 'status',
                label: 'Status',
                labelAr: 'الحالة',
                options: [
                  { value: 'active', label: 'Active', labelAr: 'نشط' },
                  { value: 'probation', label: 'Probation', labelAr: 'تجربة' },
                  { value: 'inactive', label: 'Inactive', labelAr: 'غير نشط' },
                ],
                getValue: (e) => e.status,
              },
            ]}
          />
        </CardBody>
      </Card>

      {employees.length === 0 && !loading && (
        <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
          <Users className="h-4 w-4" />
          {t('Start adding employees to build your workforce', 'ابدأ بإضافة الموظفين لبناء قوتك العاملة', language)}
        </div>
      )}

      <EmployeeImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={loadEmployees}
      />
    </div>
  );
}
