'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguageStore } from '@/stores/language-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DetailSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { employeeService } from '@/modules/employee-management/service';
import { ContractType, Employee } from '@/types';
import { t, formatDate, formatCurrency, getContractTypeLabel, calculateAge } from '@/lib/utils';
import { FormBuilder, FormField } from '@/engines/form-engine';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, User, Mail, Phone, MapPin, Briefcase, DollarSign, Calendar, Heart, SearchX, Pencil, X } from 'lucide-react';

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { language } = useLanguageStore();
  const { addToast } = useToast();
  const [employee, setEmployee] = React.useState<Employee | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    loadEmployee();
  }, [id]);

  const loadEmployee = async () => {
    const res = await employeeService.getById(id as string);
    if (res.success && res.data) {
      setEmployee(res.data);
    }
    setLoading(false);
  };

  const editFields: FormField[][] = [
    [
      { name: 'fullName', label: t('Full Name', 'الاسم الكامل', language), labelAr: t('Full Name', 'الاسم الكامل', language), required: true },
      { name: 'fullNameAr', label: t('Full Name (Arabic)', 'الاسم الكامل (عربي)', language), labelAr: t('Full Name (Arabic)', 'الاسم الكامل (عربي)', language) },
    ],
    [
      { name: 'email', label: t('Email', 'البريد الإلكتروني', language), labelAr: t('Email', 'البريد الإلكتروني', language), type: 'email' },
      { name: 'phone', label: t('Phone', 'الهاتف', language), labelAr: t('Phone', 'الهاتف', language), type: 'tel' },
    ],
    [
      { name: 'nationalId', label: t('Iqama / National ID', 'رقم الهوية / الإقامة', language), labelAr: t('Iqama / National ID', 'رقم الهوية / الإقامة', language), validation: { minLength: 10, maxLength: 10, pattern: /^\d{10}$/ } },
      { name: 'nationality', label: t('Nationality', 'الجنسية', language), labelAr: t('Nationality', 'الجنسية', language) },
    ],
    [
      {
        name: 'gender',
        label: t('Gender', 'الجنس', language),
        labelAr: t('Gender', 'الجنس', language),
        type: 'select',
        options: [
          { value: 'male', label: t('Male', 'ذكر', language), labelAr: t('Male', 'ذكر', language) },
          { value: 'female', label: t('Female', 'أنثى', language), labelAr: t('Female', 'أنثى', language) },
        ],
      },
      {
        name: 'maritalStatus',
        label: t('Marital Status', 'الحالة الاجتماعية', language),
        labelAr: t('Marital Status', 'الحالة الاجتماعية', language),
        type: 'select',
        options: [
          { value: 'single', label: t('Single', 'أعزب', language), labelAr: t('Single', 'أعزب', language) },
          { value: 'married', label: t('Married', 'متزوج', language), labelAr: t('Married', 'متزوج', language) },
          { value: 'divorced', label: t('Divorced', 'مطلق', language), labelAr: t('Divorced', 'مطلق', language) },
          { value: 'widowed', label: t('Widowed', 'أرمل', language), labelAr: t('Widowed', 'أرمل', language) },
        ],
      },
    ],
    [
      { name: 'department', label: t('Department', 'القسم', language), labelAr: t('Department', 'القسم', language), required: true },
      { name: 'position', label: t('Position', 'المنصب', language), labelAr: t('المنصب', 'المنصب', language), required: true },
    ],
    [
      {
        name: 'contractType',
        label: t('Contract Type', 'نوع العقد', language),
        labelAr: t('Contract Type', 'نوع العقد', language),
        type: 'select',
        options: [
          { value: 'permanent', label: t('Permanent', 'دائم', language), labelAr: t('Permanent', 'دائم', language) },
          { value: 'fixed_term', label: t('Fixed Term', 'محدد المدة', language), labelAr: t('Fixed Term', 'محدد المدة', language) },
          { value: 'part_time', label: t('Part Time', 'دوام جزئي', language), labelAr: t('Part Time', 'دوام جزئي', language) },
          { value: 'probation', label: t('Probation', 'تجريبي', language), labelAr: t('Probation', 'تجريبي', language) },
        ],
      },
      { name: 'hireDate', label: t('Hire Date', 'تاريخ التعيين', language), labelAr: t('Hire Date', 'تاريخ التعيين', language), type: 'date' },
    ],
    [
      { name: 'basicSalary', label: t('Basic Salary', 'الراتب الأساسي', language), labelAr: t('Basic Salary', 'الراتب الأساسي', language), type: 'number' },
      { name: 'housingAllowance', label: t('Housing Allowance', 'بدل السكن', language), labelAr: t('Housing Allowance', 'بدل السكن', language), type: 'number' },
    ],
    [
      { name: 'transportAllowance', label: t('Transport Allowance', 'بدل النقل', language), labelAr: t('Transport Allowance', 'بدل النقل', language), type: 'number' },
      { name: 'bankName', label: t('Bank Name', 'اسم البنك', language), labelAr: t('Bank Name', 'اسم البنك', language) },
    ],
    [
      { name: 'iban', label: t('IBAN', 'الآيبان', language), labelAr: t('IBAN', 'الآيبان', language), validation: { minLength: 24, maxLength: 24 } },
      { name: 'city', label: t('City', 'المدينة', language), labelAr: t('City', 'المدينة', language) },
    ],
  ];

  const handleSave = async (values: Record<string, string>) => {
    if (!employee) return;
    setSaving(true);
    const res = await employeeService.update(employee.id, {
      fullName: values.fullName || '',
      fullNameAr: values.fullNameAr || '',
      email: values.email || '',
      phone: values.phone || '',
      nationalId: values.nationalId || '',
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
        bankAccount: values.iban || '',
      },
      address: { ...employee.address, city: values.city || '' },
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
          <Button variant="outline" onClick={() => router.push('/employees')}>
            <ArrowLeft className="h-4 w-4" />
            {t('Back to Employees', 'العودة للموظفين', language)}
          </Button>
        }
      />
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {language === 'ar' ? employee.fullNameAr || employee.fullName : employee.fullName}
          </h1>
          <p className="text-sm text-gray-500">{employee.employeeId} - {employee.position}</p>
        </div>
        <Badge status={employee.status} locale={language} />
        <div className="ms-auto flex items-center gap-2">
          {editing ? (
            <Button variant="outline" onClick={() => setEditing(false)}>
              <X className="h-4 w-4" />
              {t('Cancel', 'إلغاء', language)}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
              {t('Edit', 'تعديل', language)}
            </Button>
          )}
        </div>
      </div>

      {editing ? (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">{t('Edit Employee', 'تعديل الموظف', language)}</h2>
          </CardHeader>
          <CardBody>
            <FormBuilder
              fields={editFields}
              locale={language}
              onSubmit={handleSave}
              submitLabel={t('Save Changes', 'حفظ التغييرات', language)}
              submitLabelAr={t('Save Changes', 'حفظ التغييرات', language)}
              loading={saving}
              defaultValues={{
                fullName: employee.fullName,
                fullNameAr: employee.fullNameAr,
                email: employee.email,
                phone: employee.phone,
                nationalId: employee.nationalId,
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
              }}
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex items-center gap-3">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{t('Personal Info', 'معلومات شخصية', language)}</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex justify-between py-1">
              <span className="text-sm text-gray-500">{t('National ID', 'رقم الهوية', language)}</span>
              <span className="text-sm font-medium">{employee.nationalId}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm text-gray-500">{t('Date of Birth', 'تاريخ الميلاد', language)}</span>
              <span className="text-sm font-medium">{formatDate(employee.dateOfBirth)} ({calculateAge(employee.dateOfBirth)} years)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm text-gray-500">{t('Gender', 'الجنس', language)}</span>
              <span className="text-sm font-medium capitalize">{employee.gender}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm text-gray-500">{t('Marital Status', 'الحالة الاجتماعية', language)}</span>
              <span className="text-sm font-medium capitalize">{employee.maritalStatus}</span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center gap-3">
            <Briefcase className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{t('Employment', 'التوظيف', language)}</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex justify-between py-1">
              <span className="text-sm text-gray-500">{t('Department', 'القسم', language)}</span>
              <span className="text-sm font-medium">{employee.department}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm text-gray-500">{t('Position', 'المنصب', language)}</span>
              <span className="text-sm font-medium">{employee.position}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm text-gray-500">{t('Contract', 'العقد', language)}</span>
              <span className="text-sm font-medium">{getContractTypeLabel(employee.contractType, language)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm text-gray-500">{t('Hire Date', 'تاريخ التعيين', language)}</span>
              <span className="text-sm font-medium">{formatDate(employee.hireDate)}</span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{t('Salary', 'الراتب', language)}</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex justify-between py-1">
              <span className="text-sm text-gray-500">{t('Basic', 'أساسي', language)}</span>
              <span className="text-sm font-medium">{formatCurrency(employee.salary.basic)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm text-gray-500">{t('Housing', 'سكن', language)}</span>
              <span className="text-sm font-medium">{formatCurrency(employee.salary.housing)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm text-gray-500">{t('Transportation', 'مواصلات', language)}</span>
              <span className="text-sm font-medium">{formatCurrency(employee.salary.transportation)}</span>
            </div>
            {employee.salary.otherAllowances > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-sm text-gray-500">{t('Other Allowances', 'بدلات أخرى', language)}</span>
                <span className="text-sm font-medium">{formatCurrency(employee.salary.otherAllowances)}</span>
              </div>
            )}
            <div className="flex justify-between py-1 border-t pt-3">
              <span className="text-sm font-semibold text-gray-900">{t('Total', 'الإجمالي', language)}</span>
              <span className="text-sm font-bold text-primary">
                {formatCurrency(employee.salary.total)}
              </span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{t('Contact & Address', 'جهات الاتصال والعنوان', language)}</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-400" />
              <span className="text-sm">{employee.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-400" />
              <span className="text-sm">{employee.phone}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
              <div className="text-sm">
                <p>{employee.address.street}</p>
                <p>{employee.address.city}, {employee.address.region}</p>
              </div>
            </div>
            <div className="border-t pt-3 mt-3">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-4 w-4 text-error" />
                <span className="text-sm font-medium">{t('Emergency Contact', 'جهة اتصال طارئة', language)}</span>
              </div>
              <p className="text-sm">{employee.emergencyContact.name} ({employee.emergencyContact.relation})</p>
              <p className="text-sm text-gray-500">{employee.emergencyContact.phone}</p>
            </div>
          </CardBody>
        </Card>
        </div>
      )}
    </div>
  );
}
