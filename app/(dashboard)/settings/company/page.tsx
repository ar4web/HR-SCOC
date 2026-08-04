'use client';

import React from 'react';
import { useCompanyStore } from '@/stores/company-store';
import { useLanguageStore } from '@/stores/language-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { t } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { Building2, Save } from 'lucide-react';

export default function CompanyProfilePage() {
  const { company, updateCompany } = useCompanyStore();
  const { language } = useLanguageStore();
  const { addToast } = useToast();
  const [form, setForm] = React.useState({
    name: '',
    nameAr: '',
    taxNumber: '',
    industry: '',
  });

  React.useEffect(() => {
    if (company) {
      setForm({
        name: company.name,
        nameAr: company.nameAr || '',
        taxNumber: company.taxNumber,
        industry: company.industry,
      });
    }
  }, [company]);

  const handleSave = async () => {
    const res = await updateCompany({
      name: form.name,
      nameAr: form.nameAr,
      taxNumber: form.taxNumber,
      industry: form.industry,
    });
    if (res.success) {
      addToast({ type: 'success', title: t('Company profile updated successfully!', 'تم تحديث بيانات الشركة بنجاح!', language) });
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to update company', 'فشل تحديث بيانات الشركة', language) });
    }
  };

  if (!company) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t('Company Profile', 'الملف الشخصي للشركة', language)}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {t('Manage your company information', 'إدارة معلومات شركتك', language)}
        </p>
      </div>

      <Card>
        <CardHeader className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              {t('Company Information', 'معلومات الشركة', language)}
            </h2>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('Company Name (English)', 'اسم الشركة (إنجليزي)', language)}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              label={t('Company Name (Arabic)', 'اسم الشركة (عربي)', language)}
              value={form.nameAr}
              onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('Tax Number (CR)', 'الرقم الضريبي (السجل التجاري)', language)}
              value={form.taxNumber}
              onChange={(e) => setForm({ ...form, taxNumber: e.target.value })}
              helperText={t('10-digit CR number', 'رقم السجل التجاري 10 أرقام', language)}
            />
            <Input
              label={t('Industry', 'النشاط التجاري', language)}
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
            />
          </div>
          <div className="pt-4">
            <Button onClick={handleSave}>
              <Save className="h-4 w-4" />
              {t('Save Changes', 'حفظ التغييرات', language)}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
