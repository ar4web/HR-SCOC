'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { t, formatCurrency } from '@/lib/utils';
import { CreditCard, Check, Download, AlertCircle } from 'lucide-react';

const plan = {
  name: 'Enterprise',
  nameAr: 'المؤسسات',
  price: 299,
  currency: 'SAR',
  billing: 'monthly',
  employees: 100,
  storage: '10GB',
  status: 'active',
  nextBilling: '2024-08-01',
  features: [
    { en: 'Up to 100 employees', ar: 'حتى 100 موظف' },
    { en: 'All HR modules included', ar: 'جميع وحدات الموارد البشرية مشمولة' },
    { en: 'GOSI & WPS compliance', ar: 'التوافق مع التأمينات و WPS' },
    { en: 'Multi-language (AR/EN)', ar: 'دعم اللغتين العربية والإنجليزية' },
    { en: 'Priority support', ar: 'دعم ذو أولوية' },
    { en: 'Custom branding', ar: 'علامة تجارية مخصصة' },
    { en: 'API access', ar: 'الوصول إلى API' },
    { en: 'Audit logs', ar: 'سجلات التدقيق' },
  ],
};

export default function BillingPage() {
  const { language } = useLanguageStore();

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t('Billing & Subscription', 'الفواتير والاشتراك', language)}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {t('Manage your plan and billing information', 'إدارة خطتك ومعلومات الفواتير', language)}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">
                {t('Current Plan', 'الخطة الحالية', language)}
              </h2>
            </CardHeader>
            <CardBody>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {t(plan.name, plan.nameAr, language)}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatCurrency(plan.price)} / {t('month', 'شهر', language)}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                  {t('Active', 'نشط', language)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-3 rounded-lg bg-gray-50 text-center">
                  <p className="text-lg font-bold text-gray-900">{plan.employees}</p>
                  <p className="text-xs text-gray-500">{t('Employees', 'الموظفون', language)}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 text-center">
                  <p className="text-lg font-bold text-gray-900">{plan.storage}</p>
                  <p className="text-xs text-gray-500">{t('Storage', 'التخزين', language)}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 text-center">
                  <p className="text-lg font-bold text-gray-900">{plan.nextBilling}</p>
                  <p className="text-xs text-gray-500">{t('Next Billing', 'الفاتورة القادمة', language)}</p>
                </div>
              </div>

              <div className="space-y-2">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    <span>{t(f.en, f.ar, language)}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold">
                {t('Usage', 'الاستخدام', language)}
              </h3>
            </CardHeader>
            <CardBody className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">{t('Employees', 'الموظفون', language)}</span>
                  <span className="font-medium">0 / {plan.employees}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: '0%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">{t('Storage', 'التخزين', language)}</span>
                  <span className="font-medium">0 / {plan.storage}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: '0%' }} />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-3">
              <Button className="w-full" variant="outline">
                <Download className="h-4 w-4" />
                {t('Invoice History', 'سجل الفواتير', language)}
              </Button>
              <Button className="w-full" variant="ghost">
                {t('Upgrade Plan', 'ترقية الخطة', language)}
              </Button>
            </CardBody>
          </Card>

          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-xs text-warning-800">
              {t('This is a simulated billing page for demonstration purposes.', 'هذه صفحة فواتير محاكاة لأغراض العرض التوضيحي.', language)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
