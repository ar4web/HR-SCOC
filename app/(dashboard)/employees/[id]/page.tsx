'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguageStore } from '@/stores/language-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DetailSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { EmployeeReport } from '@/components/employee-report/EmployeeReport';
import { employeeService } from '@/modules/employee-management/service';
import { ContractType, Employee } from '@/types';
import { t, formatDate, formatCurrency, getContractTypeLabel, getGenderLabel, getMaritalStatusLabel, calculateAge } from '@/lib/utils';
import { FormBuilder, FormField } from '@/engines/form-engine';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, User, Mail, Phone, MapPin, Briefcase, DollarSign, Heart, SearchX, Pencil, X, Shield, Plane } from 'lucide-react';

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { language } = useLanguageStore();
  const { addToast } = useToast();
  const [employee, setEmployee] = React.useState<Employee | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

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
      { name: 'iqamaExpiryDate', label: 'Iqama Expiry Date', labelAr: 'Iqama Expiry Date', type: 'date' },
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
      vacationBalance: parseInt(values.vacationBalance) ?? employee.vacationBalance,
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <button onClick={() => router.back()} className="shrink-0 p-2 rounded-lg hover:bg-gray-100 transition-colors rtl:rotate-180">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-gray-900 sm:text-xl">
            {language === 'ar' ? employee.fullNameAr || employee.fullName : employee.fullName}
          </h1>
          <p className="truncate text-sm text-gray-500">{employee.employeeId} - {employee.position}</p>
        </div>
        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:flex-none sm:ms-auto sm:justify-end">
          <Badge status={employee.status} locale={language} />
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
              submitLabel="Save Changes"
              submitLabelAr="حفظ التغييرات"
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
                sponsorName: employee.sponsorName || '',
                sponsorId: employee.sponsorId || '',
                annualVacationDays: String(employee.annualVacationDays ?? 30),
                vacationBalance: String(employee.vacationBalance ?? ''),
                endOfServiceAllowance: String(employee.endOfServiceAllowance ?? ''),
                contractEndDate: employee.contractEndDate || '',
                probationEndDate: employee.probationEndDate || '',
                workPermitExpiry: employee.workPermitExpiry || '',
              }}
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <span className="text-sm font-medium">{formatDate(employee.dateOfBirth, language)} ({calculateAge(employee.dateOfBirth)} {t('years', 'سنة', language)})</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm text-gray-500">{t('Gender', 'الجنس', language)}</span>
              <span className="text-sm font-medium">{getGenderLabel(employee.gender, language)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm text-gray-500">{t('Marital Status', 'الحالة الاجتماعية', language)}</span>
              <span className="text-sm font-medium">{getMaritalStatusLabel(employee.maritalStatus, language)}</span>
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
              <span className="text-sm font-medium">{formatDate(employee.hireDate, language)}</span>
            </div>
            {employee.contractEndDate && (
              <div className="flex justify-between py-1">
                <span className="text-sm text-gray-500">{t('Contract End', 'انتهاء العقد', language)}</span>
                <span className="text-sm font-medium">{formatDate(employee.contractEndDate, language)}</span>
              </div>
            )}
            {employee.probationEndDate && (
              <div className="flex justify-between py-1">
                <span className="text-sm text-gray-500">{t('Probation End', 'انتهاء التجربة', language)}</span>
                <span className="text-sm font-medium">{formatDate(employee.probationEndDate, language)}</span>
              </div>
            )}
            {employee.workPermitExpiry && (
              <div className="flex justify-between py-1">
                <span className="text-sm text-gray-500">{t('Work Permit Expiry', 'انتهاء تصريح العمل', language)}</span>
                <span className="text-sm font-medium">{formatDate(employee.workPermitExpiry, language)}</span>
              </div>
            )}
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
            {employee.endOfServiceAllowance != null && employee.endOfServiceAllowance > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-sm text-gray-500">{t('End of Service', 'نهاية الخدمة', language)}</span>
                <span className="text-sm font-medium">{formatCurrency(employee.endOfServiceAllowance)}</span>
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

        <Card>
          <CardHeader className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{t('Sponsor', 'الكفيل', language)}</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex justify-between py-1">
              <span className="text-sm text-gray-500">{t('Sponsor Name', 'اسم الكفيل', language)}</span>
              <span className="text-sm font-medium">{employee.sponsorName || '—'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm text-gray-500">{t('Sponsor ID', 'رقم الكفيل', language)}</span>
              <span className="text-sm font-medium">{employee.sponsorId || '—'}</span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center gap-3">
            <Plane className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{t('Leave', 'الإجازات', language)}</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex justify-between py-1">
              <span className="text-sm text-gray-500">{t('Annual Vacation', 'إجازة سنوية', language)}</span>
              <span className="text-sm font-medium">
                {employee.annualVacationDays != null ? `${employee.annualVacationDays} ${t('days', 'يوم', language)}` : '—'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm text-gray-500">{t('Vacation Balance', 'رصيد الإجازة', language)}</span>
              <span className={`text-sm font-medium ${employee.vacationBalance != null && employee.vacationBalance <= 5 ? 'text-error' : ''}`}>
                {employee.vacationBalance != null ? `${employee.vacationBalance} ${t('days', 'يوم', language)}` : '—'}
              </span>
            </div>
          </CardBody>
        </Card>
        </div>

        <div className="xl:col-span-1">
          <EmployeeReport employeeId={id as string} />
        </div>
      </div>
      )}
    </div>
  );
}
