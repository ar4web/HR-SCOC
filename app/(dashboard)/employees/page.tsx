'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguageStore } from '@/stores/language-store';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable, Column } from '@/engines/table-engine';
import { employeeService } from '@/modules/employee-management/service';
import { Employee } from '@/types';
import { t, formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { Users, Plus, Eye, Trash2 } from 'lucide-react';

export default function EmployeesPage() {
  const router = useRouter();
  const { language, dir } = useLanguageStore();
  const { addToast } = useToast();
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    const res = await employeeService.list({ page: 1, pageSize: 1000 });
    if (res.success && res.data) {
      setEmployees(res.data.data);
      setTotal(res.data.total);
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

  const columns: Column<Employee>[] = [
    {
      key: 'employeeId',
      header: t('Employee ID', 'رقم الموظف', language),
      render: (emp) => <span className="font-medium text-gray-900">{emp.employeeId}</span>,
    },
    {
      key: 'fullName',
      header: t('Full Name', 'الاسم الكامل', language),
      render: (emp) => (
        <div>
          <p className="font-medium text-gray-900">
            {language === 'ar' ? emp.fullNameAr || emp.fullName : emp.fullName}
          </p>
          <p className="text-xs text-gray-500">{emp.email}</p>
        </div>
      ),
    },
    { key: 'department', header: t('Department', 'القسم', language) },
    { key: 'position', header: t('Role', 'الوظيفة', language) },
    { key: 'nationality', header: t('Nationality', 'الجنسية', language) },
    {
      key: 'total',
      header: t('Total Salary', 'إجمالي الراتب', language),
      render: (emp) => <span className="font-semibold text-gray-900">{formatCurrency(emp.salary.total)}</span>,
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
            onClick={() => handleDelete(emp)}
            disabled={deleting === emp.id}
            className="inline-flex items-center gap-1 text-sm text-error hover:text-error-dark transition-colors disabled:opacity-50"
            aria-label={t('Delete', 'حذف', language)}
            title={t('Delete', 'حذف', language)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('Employee Management', 'إدارة الموظفين', language)}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('Manage your workforce', 'إدارة القوى العاملة لديك', language)}
          </p>
        </div>
        <Link href="/employees/new">
          <Button>
            <Plus className="h-4 w-4" />
            {t('Add Employee', 'إضافة موظف', language)}
          </Button>
        </Link>
      </div>

      <Card>
        <CardBody className="p-4 sm:p-6">
          <DataTable<Employee>
            columns={columns}
            data={employees}
            loading={loading}
            locale={language}
            dir={dir}
            emptyMessage={t('No employees found', 'لم يتم العثور على موظفين', language)}
            emptyMessageAr={t('No employees found', 'لم يتم العثور على موظفين', language)}
            getRowKey={(emp) => emp.id}
            onRowClick={(emp) => {
              router.push(`/employees/${emp.id}`);
            }}
          />
        </CardBody>
      </Card>

      {employees.length === 0 && !loading && (
        <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
          <Users className="h-4 w-4" />
          {t('Start adding employees to build your workforce', 'ابدأ بإضافة الموظفين لبناء قوتك العاملة', language)}
        </div>
      )}
    </div>
  );
}
