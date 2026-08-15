'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useLanguageStore } from '@/stores/language-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FormBuilder, FormField } from '@/engines/form-engine';
import { employeeService } from '@/modules/employee-management/service';
import { useCompanyStore } from '@/stores/company-store';
import { t } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { UserPlus, ArrowLeft } from 'lucide-react';

export default function NewEmployeePage() {
  const router = useRouter();
  const { language, dir } = useLanguageStore();
  const { addToast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const company = useCompanyStore((s) => s.company);

  const fields: FormField[][] = [
    [
      { name: 'firstName', label: 'First Name', labelAr: 'الاسم الأول', required: true },
      { name: 'lastName', label: 'Last Name', labelAr: 'اسم العائلة', required: true },
    ],
    [
      { name: 'email', label: 'Email', labelAr: 'البريد الإلكتروني', type: 'email' },
      { name: 'phone', label: 'Phone', labelAr: 'الهاتف', type: 'tel' },
    ],
    [
      {
        name: 'nationality',
        label: 'Nationality',
        labelAr: 'الجنسية',
        placeholder: 'Saudi',
      },
      {
        name: 'nationalId',
        label: 'Iqama / National ID',
        labelAr: 'رقم الهوية / الإقامة',
        required: true,
        validation: { minLength: 10, maxLength: 10, pattern: /^\d{10}$/ },
      },
    ],
    [
      {
        name: 'fullNameAr',
        label: 'Full Name (Arabic)',
        labelAr: 'الاسم الكامل (عربي)',
      },
      {
        name: 'religion',
        label: 'Religion',
        labelAr: 'الديانة',
        type: 'select',
        required: true,
        options: [
          { value: 'muslim', label: 'Muslim', labelAr: 'مسلم' },
          { value: 'other', label: 'Other', labelAr: 'أخرى' },
        ],
      },
    ],
    [
      {
        name: 'gender',
        label: 'Gender',
        labelAr: 'الجنس',
        type: 'select',
        required: true,
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
        required: true,
        options: [
          { value: 'single', label: 'Single', labelAr: 'أعزب' },
          { value: 'married', label: 'Married', labelAr: 'متزوج' },
          { value: 'divorced', label: 'Divorced', labelAr: 'مطلق' },
          { value: 'widowed', label: 'Widowed', labelAr: 'أرمل' },
        ],
      },
    ],
    [
      { name: 'dateOfBirth', label: 'Date of Birth', labelAr: 'تاريخ الميلاد', type: 'date' },
      { name: 'city', label: 'City', labelAr: 'المدينة' },
    ],
    [
      { name: 'department', label: 'Department', labelAr: 'القسم', required: true },
      { name: 'role', label: 'Role', labelAr: 'الوظيفة', required: true },
    ],
    [
      {
        name: 'contractType',
        label: 'Contract Type',
        labelAr: 'نوع العقد',
        type: 'select',
        required: true,
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
      { name: 'bankName', label: 'Bank Name', labelAr: 'اسم البنك' },
      { name: 'iban', label: 'IBAN', labelAr: 'الآيبان', validation: { minLength: 24, maxLength: 24 } },
    ],
    [
      { name: 'basicSalary', label: 'Basic Salary', labelAr: 'الراتب الأساسي', type: 'number', required: true },
      { name: 'housingAllowance', label: 'Housing Allowance', labelAr: 'بدل السكن', type: 'number' },
    ],
    [
      { name: 'transportAllowance', label: 'Transport Allowance', labelAr: 'بدل النقل', type: 'number' },
      { name: 'endOfServiceAllowance', label: 'End of Service Allowance', labelAr: 'مبلغ نهاية الخدمة', type: 'number' },
    ],
    [
      { name: 'sponsorName', label: 'Sponsor Name', labelAr: 'اسم الكفيل' },
      { name: 'sponsorId', label: 'Sponsor ID', labelAr: 'رقم الكفيل' },
    ],
    [
      { name: 'annualVacationDays', label: 'Annual Vacation Days', labelAr: 'إجازة سنوية (أيام)', type: 'number' },
      { name: 'vacationBalance', label: 'Vacation Balance (days)', labelAr: 'رصيد الإجازة (أيام)', type: 'number' },
    ],
    [
      { name: 'probationEndDate', label: 'Probation End Date', labelAr: 'انتهاء فترة التجربة', type: 'date' },
      { name: 'workPermitExpiry', label: 'Work Permit Expiry', labelAr: 'انتهاء تصريح العمل', type: 'date' },
    ],
    [
      { name: 'contractEndDate', label: 'Contract End Date', labelAr: 'انتهاء العقد', type: 'date' },
    ],
  ];

  const handleSubmit = async (values: Record<string, string>) => {
    setSaving(true);

    const data = {
      companyId: company?.id || 'demo-company',
      fullName: `${values.firstName || ''} ${values.lastName || ''}`.trim(),
      fullNameAr: values.fullNameAr || '',
      email: values.email || '',
      phone: values.phone || '',
      nationalId: values.nationalId || '',
      nationality: values.nationality || 'Saudi',
      religion: (values.religion as 'muslim' | 'other') || 'muslim',
      gender: (values.gender as 'male' | 'female') || 'male',
      maritalStatus: (values.maritalStatus as 'single' | 'married' | 'divorced' | 'widowed') || 'single',
      dateOfBirth: values.dateOfBirth || '',
      hireDate: values.hireDate || new Date().toISOString().split('T')[0],
      contractType: (values.contractType as 'permanent' | 'fixed_term' | 'part_time' | 'probation') || 'permanent',
      department: values.department || '',
      position: values.role || '',
      salary: {
        basic: parseFloat(values.basicSalary) || 0,
        housing: parseFloat(values.housingAllowance) || 0,
        transportation: parseFloat(values.transportAllowance) || 0,
        otherAllowances: 0,
        total: 0,
        bankName: values.bankName || '',
        bankAccount: values.iban || '',
        iban: values.iban || '',
      },
      address: {
        street: '',
        city: values.city || '',
        region: '',
        postalCode: '',
        country: 'Saudi Arabia',
      },
      emergencyContact: {
        name: '',
        relation: '',
        phone: '',
      },
      status: 'active' as const,
      documents: [],
      sponsorName: values.sponsorName || '',
      sponsorId: values.sponsorId || '',
      annualVacationDays: parseInt(values.annualVacationDays) || 30,
      vacationBalance: parseInt(values.vacationBalance) || 30,
      endOfServiceAllowance: parseFloat(values.endOfServiceAllowance) || 0,
      probationEndDate: values.probationEndDate || '',
      workPermitExpiry: values.workPermitExpiry || '',
      contractEndDate: values.contractEndDate || '',
    };

    const res = await employeeService.create(data);
    setSaving(false);

    if (res.success) {
      addToast({
        type: 'success',
        title: t('Employee created successfully', 'تم إنشاء الموظف بنجاح', language),
      });
      router.push('/employees');
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to create employee', 'فشل في إنشاء الموظف', language) });
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6" dir={dir}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-gray-900 sm:text-xl">
            {t('Add Employee', 'إضافة موظف', language)}
          </h1>
          <p className="truncate text-sm text-gray-500 mt-1">
            {t('Register a new employee record', 'تسجيل سجل موظف جديد', language)}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/employees')} className="shrink-0">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t('Back', 'رجوع', language)}
        </Button>
      </div>

      <Card>
        <CardHeader className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <UserPlus className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">
            {t('New Employee Record', 'سجل موظف جديد', language)}
          </h2>
        </CardHeader>
        <CardBody>
          <FormBuilder
            fields={fields}
            locale={language}
            onSubmit={handleSubmit}
            submitLabel="Save Employee"
            submitLabelAr="حفظ الموظف"
            loading={saving}
          />
        </CardBody>
      </Card>
    </div>
  );
}
