'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useLanguageStore } from '@/stores/language-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FormBuilder, FormField } from '@/engines/form-engine';
import { employeeService } from '@/modules/employee-management/service';
import { t } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { UserPlus, ArrowLeft } from 'lucide-react';

export default function NewEmployeePage() {
  const router = useRouter();
  const { language, dir } = useLanguageStore();
  const { addToast } = useToast();
  const [saving, setSaving] = React.useState(false);

  const fields: FormField[][] = [
    [
      {
        name: 'firstName',
        label: t('First Name', 'الاسم الأول', language),
        labelAr: t('First Name', 'الاسم الأول', language),
        required: true,
      },
      {
        name: 'lastName',
        label: t('Last Name', 'اسم العائلة', language),
        labelAr: t('Last Name', 'اسم العائلة', language),
        required: true,
      },
    ],
    [
      { name: 'email', label: t('Email', 'البريد الإلكتروني', language), labelAr: t('Email', 'البريد الإلكتروني', language), type: 'email' },
      { name: 'phone', label: t('Phone', 'الهاتف', language), labelAr: t('Phone', 'الهاتف', language), type: 'tel' },
    ],
    [
      {
        name: 'nationality',
        label: t('Nationality', 'الجنسية', language),
        labelAr: t('Nationality', 'الجنسية', language),
        placeholder: 'Saudi',
      },
      {
        name: 'nationalId',
        label: t('Iqama / National ID', 'رقم الهوية / الإقامة', language),
        labelAr: t('Iqama / National ID', 'رقم الهوية / الإقامة', language),
        required: true,
        validation: { minLength: 10, maxLength: 10, pattern: /^\d{10}$/ },
      },
    ],
    [
      {
        name: 'fullNameAr',
        label: t('Full Name (Arabic)', 'الاسم الكامل (عربي)', language),
        labelAr: t('Full Name (Arabic)', 'الاسم الكامل (عربي)', language),
      },
      {
        name: 'religion',
        label: t('Religion', 'الديانة', language),
        labelAr: t('Religion', 'الديانة', language),
        type: 'select',
        required: true,
        options: [
          { value: 'muslim', label: t('Muslim', 'مسلم', language), labelAr: t('Muslim', 'مسلم', language) },
          { value: 'other', label: t('Other', 'أخرى', language), labelAr: t('Other', 'أخرى', language) },
        ],
      },
    ],
    [
      {
        name: 'gender',
        label: t('Gender', 'الجنس', language),
        labelAr: t('Gender', 'الجنس', language),
        type: 'select',
        required: true,
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
        required: true,
        options: [
          { value: 'single', label: t('Single', 'أعزب', language), labelAr: t('Single', 'أعزب', language) },
          { value: 'married', label: t('Married', 'متزوج', language), labelAr: t('Married', 'متزوج', language) },
          { value: 'divorced', label: t('Divorced', 'مطلق', language), labelAr: t('Divorced', 'مطلق', language) },
          { value: 'widowed', label: t('Widowed', 'أرمل', language), labelAr: t('Widowed', 'أرمل', language) },
        ],
      },
    ],
    [
      { name: 'dateOfBirth', label: t('Date of Birth', 'تاريخ الميلاد', language), labelAr: t('Date of Birth', 'تاريخ الميلاد', language), type: 'date' },
      { name: 'city', label: t('City', 'المدينة', language), labelAr: t('City', 'المدينة', language) },
    ],
    [
      { name: 'department', label: t('Department', 'القسم', language), labelAr: t('Department', 'القسم', language), required: true },
      { name: 'role', label: t('Role', 'الوظيفة', language), labelAr: t('Role', 'الوظيفة', language), required: true },
    ],
    [
      {
        name: 'contractType',
        label: t('Contract Type', 'نوع العقد', language),
        labelAr: t('Contract Type', 'نوع العقد', language),
        type: 'select',
        required: true,
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
      { name: 'bankName', label: t('Bank Name', 'اسم البنك', language), labelAr: t('Bank Name', 'اسم البنك', language) },
      { name: 'iban', label: t('IBAN', 'الآيبان', language), labelAr: t('IBAN', 'الآيبان', language), validation: { minLength: 24, maxLength: 24 } },
    ],
    [
      { name: 'basicSalary', label: t('Basic Salary', 'الراتب الأساسي', language), labelAr: t('Basic Salary', 'الراتب الأساسي', language), type: 'number', required: true },
      { name: 'housingAllowance', label: t('Housing Allowance', 'بدل السكن', language), labelAr: t('Housing Allowance', 'بدل السكن', language), type: 'number' },
    ],
    [
      { name: 'transportAllowance', label: t('Transport Allowance', 'بدل النقل', language), labelAr: t('Transport Allowance', 'بدل النقل', language), type: 'number' },
    ],
  ];

  const handleSubmit = async (values: Record<string, string>) => {
    setSaving(true);

    const data = {
      companyId: 'demo-company',
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('Add Employee', 'إضافة موظف', language)}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('Register a new employee record', 'تسجيل سجل موظف جديد', language)}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/employees')}>
          <ArrowLeft className="h-4 w-4" />
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
            submitLabel={t('Save Employee', 'حفظ الموظف', language)}
            submitLabelAr={t('Save Employee', 'حفظ الموظف', language)}
            loading={saving}
          />
        </CardBody>
      </Card>
    </div>
  );
}
