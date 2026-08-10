'use client';

import React from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguageStore } from '@/stores/language-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { t, getRoleLabel } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { adminService } from '@/modules/administration/service';
import PageHeader from '@/components/layout/PageHeader';
import { User, Save } from 'lucide-react';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const { language } = useLanguageStore();
  const { addToast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ name: '', nameAr: '', email: '' });

  React.useEffect(() => {
    if (user) setForm({ name: user.name, nameAr: user.nameAr || '', email: user.email });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const res = await adminService.updateUser(user.id, {
        name: form.name,
        nameAr: form.nameAr,
      });
      if (res.success && res.data) {
        setUser({ ...user, ...res.data.user });
        addToast({ type: 'success', title: t('Profile updated!', 'تم تحديث الملف الشخصي!', language) });
      } else {
        addToast({ type: 'error', title: res.error || t('Failed to update profile', 'فشل تحديث الملف الشخصي', language) });
      }
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={t('User Profile', 'الملف الشخصي', language)}
        subtitle={t('Manage your account settings', 'إدارة إعدادات حسابك', language)}
      />

      <Card>
        <CardHeader className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{user.name}</h2>
            <p className="text-sm text-gray-500">{getRoleLabel(user.role, language)}</p>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('Name', 'الاسم', language)}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              label={t('Name (Arabic)', 'الاسم (عربي)', language)}
              value={form.nameAr}
              onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
            />
            <Input
              label={t('Email', 'البريد الإلكتروني', language)}
              value={form.email}
              type="email"
              disabled
            />
            <Input label={t('Role', 'الدور', language)} defaultValue={user.role} disabled />
          </div>
          <div className="pt-4">
            <Button onClick={handleSave} loading={saving} title={t('Save Changes', 'حفظ التغييرات', language)} aria-label={t('Save Changes', 'حفظ التغييرات', language)}>
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
