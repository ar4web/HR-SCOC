'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useLanguageStore } from '@/stores/language-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { FormBuilder, FormField } from '@/engines/form-engine';
import { api } from '@/lib/api';
import { Employee } from '@/types';
import { t, getLeaveTypeLabel } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { CalendarDays, ArrowLeft } from 'lucide-react';

const LEAVE_TYPES = ['annual', 'sick', 'unpaid', 'emergency'] as const;

interface PolicyHint {
  type: string;
  daysPerYear: number;
  paid: boolean;
  carryoverDays?: number;
}

export default function NewLeavePage() {
  const router = useRouter();
  const { language, dir } = useLanguageStore();
  const { addToast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [policies, setPolicies] = React.useState<PolicyHint[]>([]);

  React.useEffect(() => {
    loadEmployees();
    api.get<{ policies?: PolicyHint[]; leavePolicies?: PolicyHint[]; data?: PolicyHint[] } | PolicyHint[]>('/settings/leave-policies')
      .then((res) => {
        if (res.success && res.data) {
          setPolicies(
            Array.isArray(res.data) ? res.data : res.data.policies || res.data.leavePolicies || res.data.data || []
          );
        }
      })
      .catch(() => {});
  }, []);

  const loadEmployees = async () => {
    const res = await api.get<{ data: Employee[]; total: number }>('/employees');
    if (res.success && res.data) {
      setEmployees(res.data.data);
    }
    setLoading(false);
  };

  const calculateDays = () => {
    if (!values.startDate || !values.endDate) return 0;
    const start = new Date(values.startDate);
    const end = new Date(values.endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(0, diff);
  };

  const fields: FormField[][] = [
    [
      {
        name: 'employeeId',
        label: 'Employee',
        labelAr: 'الموظف',
        type: 'select',
        required: true,
        options: employees.map((emp) => ({
          value: emp.id,
          label: `${emp.employeeId} - ${language === 'ar' ? emp.fullNameAr || emp.fullName : emp.fullName}`,
        })),
      },
      {
        name: 'type',
        label: 'Leave Type',
        labelAr: 'نوع الإجازة',
        type: 'select',
        options: LEAVE_TYPES.map((type) => ({
          value: type,
          label: getLeaveTypeLabel(type, language),
        })),
      },
    ],
    [
      {
        name: 'startDate',
        label: 'Start Date',
        labelAr: 'تاريخ البداية',
        type: 'date',
        required: true,
      },
      {
        name: 'endDate',
        label: 'End Date',
        labelAr: 'تاريخ النهاية',
        type: 'date',
        required: true,
      },
    ],
    [
      {
        name: 'reason',
        label: 'Reason',
        labelAr: 'السبب',
        type: 'textarea',
        placeholder: 'Enter reason for leave...',
        placeholderAr: 'أدخل سبب الإجازة...',
      },
    ],
  ];

  const handleSubmit = async (data: Record<string, string>) => {
    if (!data.employeeId) {
      addToast({ type: 'warning', title: t('Please select an employee', 'الرجاء اختيار موظف', language) });
      return;
    }
    if (!data.startDate || !data.endDate) {
      addToast({ type: 'warning', title: t('Please select start and end dates', 'الرجاء اختيار تاريخي البداية والنهاية', language) });
      return;
    }
    if (new Date(data.endDate) < new Date(data.startDate)) {
      addToast({ type: 'warning', title: t('End date cannot be before start date', 'تاريخ النهاية لا يمكن أن يكون قبل تاريخ البداية', language) });
      return;
    }
    setSaving(true);

    const res = await api.post('/leaves', {
      employeeId: data.employeeId,
      type: data.type || 'annual',
      startDate: data.startDate,
      endDate: data.endDate,
      reason: data.reason || '',
    });

    setSaving(false);

    if (res.success) {
      addToast({
        type: 'success',
        title: t('Leave request submitted', 'تم إرسال طلب الإجازة', language),
      });
      router.push('/leaves');
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to create leave request', 'فشل في إنشاء طلب الإجازة', language) });
    }
  };

  const showDayCount = values.startDate && values.endDate;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <button onClick={() => router.back()} className="shrink-0 p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className={`h-5 w-5 text-gray-600 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-gray-900 sm:text-xl">
            {t('Request Leave', 'طلب إجازة', language)}
          </h1>
          <p className="truncate text-sm text-gray-500 mt-1">
            {t('Submit a new leave request', 'تقديم طلب إجازة جديد', language)}
          </p>
        </div>
      </div>

      {loading && (
        <p className="text-sm text-gray-500">{t('Loading employees...', 'جار تحميل الموظفين...', language)}</p>
      )}

      <Card>
        <CardHeader className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{t('Leave Details', 'تفاصيل الإجازة', language)}</h2>
        </CardHeader>
        <CardBody>
          {showDayCount && (
            <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/10 text-sm">
              <span className="font-medium text-primary">
                {calculateDays()} {t('day(s)', 'يوم', language)}
              </span>
            </div>
          )}

          {values.type && (() => {
            const policy = policies.find((p) => p.type === values.type);
            if (!policy) return null;
            const paidText = policy.paid
              ? t('Paid', 'مدفوعة', language)
              : t('Unpaid', 'غير مدفوعة', language);
            return (
              <div className="mb-4 p-3 rounded-lg bg-info/10 border border-info/20 text-sm text-info">
                <span className="font-medium">
                  {t('Policy', 'السياسة', language)}:
                </span>{' '}
                {paidText} · {language === 'ar' ? `${policy.daysPerYear} يوم / سنة` : `${policy.daysPerYear} days / year`}
                {policy.carryoverDays ? ` · ${t('Carryover', 'ترحيل', language)}: ${policy.carryoverDays}` : ''}
              </div>
            );
          })()}

          <FormBuilder
            fields={fields}
            locale={language}
            onSubmit={handleSubmit}
            submitLabel="Submit Request"
            submitLabelAr="تقديم الطلب"
            loading={saving}
            onValuesChange={setValues}
          />
        </CardBody>
      </Card>
    </div>
  );
}
