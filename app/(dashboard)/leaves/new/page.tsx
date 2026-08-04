'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useLanguageStore } from '@/stores/language-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FormBuilder, FormField } from '@/engines/form-engine';
import { api } from '@/lib/api';
import { Employee } from '@/types';
import { t, getLeaveTypeLabel } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { CalendarDays, ArrowLeft } from 'lucide-react';

const LEAVE_TYPES = ['annual', 'sick', 'unpaid', 'emergency'] as const;

export default function NewLeavePage() {
  const router = useRouter();
  const { language, dir } = useLanguageStore();
  const { addToast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [values, setValues] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    loadEmployees();
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
        label: t('Employee', 'الموظف', language),
        labelAr: t('Employee', 'الموظف', language),
        type: 'select',
        required: true,
        options: employees.map((emp) => ({
          value: emp.id,
          label: `${emp.employeeId} - ${language === 'ar' ? emp.fullNameAr || emp.fullName : emp.fullName}`,
        })),
      },
      {
        name: 'type',
        label: t('Leave Type', 'نوع الإجازة', language),
        labelAr: t('Leave Type', 'نوع الإجازة', language),
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
        label: t('Start Date', 'تاريخ البداية', language),
        labelAr: t('Start Date', 'تاريخ البداية', language),
        type: 'date',
        required: true,
      },
      {
        name: 'endDate',
        label: t('End Date', 'تاريخ النهاية', language),
        labelAr: t('End Date', 'تاريخ النهاية', language),
        type: 'date',
        required: true,
      },
    ],
    [
      {
        name: 'reason',
        label: t('Reason', 'السبب', language),
        labelAr: t('Reason', 'السبب', language),
        type: 'textarea',
        placeholder: t('Enter reason for leave...', 'أدخل سبب الإجازة...', language),
        placeholderAr: t('Enter reason for leave...', 'أدخل سبب الإجازة...', language),
      },
    ],
  ];

  const handleSubmit = async (data: Record<string, string>) => {
    if (!data.employeeId) {
      addToast({ type: 'warning', title: t('Please select an employee', 'الرجاء اختيار موظف', language) });
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
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className={`h-5 w-5 text-gray-600 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('Request Leave', 'طلب إجازة', language)}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
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

          <FormBuilder
            fields={fields}
            locale={language}
            onSubmit={handleSubmit}
            submitLabel={t('Submit Request', 'تقديم الطلب', language)}
            submitLabelAr={t('Submit Request', 'تقديم الطلب', language)}
            loading={saving}
            onValuesChange={setValues}
          />
        </CardBody>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" type="button" onClick={() => router.back()}>
          {t('Cancel', 'إلغاء', language)}
        </Button>
      </div>
    </div>
  );
}
