'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { t } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import { Book, HelpCircle, Mail, MessageSquare, FileText, ExternalLink, LifeBuoy } from 'lucide-react';

const supportItems = [
  {
    icon: Book,
    title: { en: 'User Guide', ar: 'دليل المستخدم' },
    desc: { en: 'Complete documentation for all SCOS modules', ar: 'وثائق كاملة لجميع وحدات SCOS' },
    color: 'text-primary bg-primary/10',
  },
  {
    icon: FileText,
    title: { en: 'Saudi Labor Law', ar: 'قانون العمل السعودي' },
    desc: { en: 'GOSI, WPS, and labor law compliance guide', ar: 'دليل التوافق مع التأمينات و WPS وقانون العمل' },
    color: 'text-secondary bg-secondary/10',
  },
  {
    icon: HelpCircle,
    title: { en: 'FAQ', ar: 'الأسئلة الشائعة' },
    desc: { en: 'Frequently asked questions and troubleshooting', ar: 'الأسئلة الشائعة واستكشاف الأخطاء' },
    color: 'text-warning bg-warning/10',
  },
  {
    icon: MessageSquare,
    title: { en: 'Video Tutorials', ar: 'دروس فيديو' },
    desc: { en: 'Step-by-step video guides for common tasks', ar: 'أدلة فيديو خطوة بخطوة للمهام الشائعة' },
    color: 'text-info bg-info/10',
  },
];

const contactMethods = [
  {
    icon: LifeBuoy,
    title: { en: 'Technical Support', ar: 'الدعم الفني' },
    value: 'support@scos.sa',
    type: 'email',
  },
  {
    icon: MessageSquare,
    title: { en: 'Live Chat', ar: 'الدردشة المباشرة' },
    value: { en: 'Available 24/7', ar: 'متاح على مدار الساعة' },
    type: 'text',
  },
  {
    icon: Mail,
    title: { en: 'Email', ar: 'البريد الإلكتروني' },
    value: 'hello@scos.sa',
    type: 'email',
  },
];

export default function SupportPage() {
  const { language } = useLanguageStore();

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title={t('Support & Documentation', 'الدعم والوثائق', language)}
        subtitle={t('Get help and learn how to use SCOS', 'احصل على المساعدة وتعلم كيفية استخدام SCOS', language)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {supportItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title.en} className="hover:shadow-md transition-shadow">
              <CardBody className="flex items-start gap-4">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${item.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {t(item.title.en, item.title.ar, language)}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">{t(item.desc.en, item.desc.ar, language)}</p>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-300 ms-auto flex-shrink-0" />
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">{t('Contact Us', 'اتصل بنا', language)}</h2>
        </CardHeader>
        <CardBody>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {contactMethods.map((method) => {
          const Icon = method.icon;
          const value =
            typeof method.value === 'string'
              ? method.value
              : (method.value as { en: string; ar: string })[language === 'en' ? 'en' : 'ar'];
          const inner = (
            <div className="text-center p-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">
                {t(method.title.en, method.title.ar, language)}
              </h3>
              <p className={`text-sm mt-1 ${method.type === 'email' ? 'text-primary font-medium' : 'text-gray-500'}`}>{value}</p>
            </div>
          );
          if (method.type === 'email') {
            return (
              <a key={method.title.en} href={`mailto:${value}`} className="block rounded-xl hover:bg-gray-50 transition-colors">
                {inner}
              </a>
            );
          }
          return <div key={method.title.en}>{inner}</div>;
        })}
      </div>
          <div className="mt-6 p-3 rounded-lg bg-gray-50 text-center">
            <p className="text-xs text-gray-400">
              {t('This is a simulated support page for demonstration purposes.', 'هذه صفحة دعم محاكاة لأغراض العرض التوضيحي.', language)}
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
