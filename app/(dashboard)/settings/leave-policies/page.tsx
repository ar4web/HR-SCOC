'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { useCompanyStore } from '@/stores/company-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { t } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { settingsService } from '@/modules/settings/service';
import { LeaveType, LeavePolicy } from '@/types';
import { CalendarCheck, Save, RotateCcw } from 'lucide-react';

const leaveTypeMeta: { type: LeaveType; en: string; ar: string; enDesc: string; arDesc: string }[] = [
  { type: 'annual', en: 'Annual Leave', ar: 'إجازة سنوية', enDesc: 'Paid vacation based on Saudi Labor Law Article 109', arDesc: 'إجازة مدفوعة وفق المادة 109 من نظام العمل السعودي' },
  { type: 'sick', en: 'Sick Leave', ar: 'إجازة مرضية', enDesc: 'Paid sick leave as per Article 113', arDesc: 'إجازة مرضية مدفوعة وفق المادة 113' },
  { type: 'personal', en: 'Personal Leave', ar: 'إجازة شخصية', enDesc: 'Short personal time-off requests', arDesc: 'إجازات شخصية قصيرة' },
  { type: 'emergency', en: 'Emergency Leave', ar: 'إجازة طارئة', enDesc: 'Unplanned emergency time-off', arDesc: 'إجازة طارئة غير مخطط لها' },
  { type: 'maternity', en: 'Maternity Leave', ar: 'إجازة أمومة', enDesc: '10 weeks (98 days) per Saudi Labor Law', arDesc: '10 أسابيع (98 يوماً) وفق نظام العمل السعودي' },
  { type: 'paternity', en: 'Paternity Leave', ar: 'إجازة أبوة', enDesc: 'Up to 3 days for fathers', arDesc: 'حتى 3 أيام للآباء' },
  { type: 'hajj', en: 'Hajj Leave', ar: 'إجازة حج', enDesc: '10 days for Hajj performance', arDesc: '10 أيام لأداء مناسك الحج' },
  { type: 'unpaid', en: 'Unpaid Leave', ar: 'إجازة غير مدفوعة', enDesc: 'Leave without pay', arDesc: 'إجازة بدون راتب' },
];

export default function LeavePoliciesPage() {
  const { language } = useLanguageStore();
  const { company, updateSettings } = useCompanyStore();
  const { addToast } = useToast();
  const [policies, setPolicies] = React.useState<LeavePolicy[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (company) {
      setPolicies(company.settings.leavePolicies);
    }
  }, [company]);

  const updatePolicy = (type: LeaveType, patch: Partial<LeavePolicy>) => {
    setPolicies((prev) =>
      prev.map((p) => (p.type === type ? { ...p, ...patch } : p))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await settingsService.update('leave-policies', { policies });
      if (res.success) {
        await updateSettings({ leavePolicies: policies });
        addToast({ type: 'success', title: t('Leave policies saved!', 'تم حفظ سياسات الإجازات!', language) });
      } else {
        addToast({ type: 'error', title: t('Failed to save policies', 'فشل حفظ السياسات', language) });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (company) {
      setPolicies(company.settings.leavePolicies);
      addToast({ type: 'info', title: t('Policies reset to defaults', 'تمت إعادة التعيين للوضع الافتراضي', language) });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Leave Policies', 'سياسات الإجازات', language)}
        subtitle={t('Configure annual entitlements and approval rules for each leave type', 'تكوين الاستحقاقات السنوية وقواعد الموافقة لكل نوع إجازة', language)}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} title={t('Reset', 'إعادة تعيين', language)} aria-label={t('Reset', 'إعادة تعيين', language)}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button onClick={handleSave} loading={saving} title={t('Save Policies', 'حفظ السياسات', language)} aria-label={t('Save Policies', 'حفظ السياسات', language)}>
              <Save className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader className="flex items-center gap-3">
          <CalendarCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">
            {t('Leave Entitlements', 'استحقاقات الإجازات', language)}
          </h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leaveTypeMeta.map((meta) => {
              const policy = policies.find((p) => p.type === meta.type);
              if (!policy) return null;
              return (
                <div key={meta.type} className="rounded-xl bg-white shadow-card p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900">
                      {t(meta.en, meta.ar, language)}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Toggle
                        checked={policy.paid}
                        onCheckedChange={(v) => updatePolicy(meta.type, { paid: v })}
                        label={t('Paid', 'مدفوعة', language)}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mb-4">
                    {t(meta.enDesc, meta.arDesc, language)}
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        {t('Days / Year', 'أيام / سنة', language)}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={365}
                        value={policy.daysPerYear}
                        onChange={(e) => updatePolicy(meta.type, { daysPerYear: parseInt(e.target.value) || 0 })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        {t('Max Carryover', 'الحد الأقصى للترحيل', language)}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={365}
                        value={policy.carryoverDays}
                        onChange={(e) => updatePolicy(meta.type, { carryoverDays: parseInt(e.target.value) || 0 })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <span className="text-xs text-gray-500">
                      {t('Requires Manager Approval', 'يتطلب موافقة المدير', language)}
                    </span>
                    <Toggle
                      checked={policy.requiresApproval}
                      onCheckedChange={(v) => updatePolicy(meta.type, { requiresApproval: v })}
                      label={policy.requiresApproval
                        ? t('Yes', 'نعم', language)
                        : t('No', 'لا', language)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <div className="rounded-xl bg-accent/10 border border-accent/20 p-4 text-sm text-gray-700">
        <strong className="font-semibold">{t('Note:', 'ملاحظة:', language)}</strong>{' '}
        {t(
          'Annual leave entitlement of 21 days increases to 30 days after 5 years of continuous service per Saudi Labor Law. Maternity leave is 10 weeks (98 days). Sick leave accrues as follows: first 30 days full pay, next 60 days at 75% pay, next 30 days without pay.',
          'تزداد الإجازة السنوية من 21 يوماً إلى 30 يوماً بعد 5 سنوات من الخدمة المتواصلة وفق نظام العمل السعودي. إجازة الأمومة 10 أسابيع (98 يوماً). الإجازة المرضية: أول 30 يوماً براتب كامل، ثم 60 يوماً بنسبة 75%، ثم 30 يوماً بدون راتب.',
          language
        )}
      </div>
    </div>
  );
}
