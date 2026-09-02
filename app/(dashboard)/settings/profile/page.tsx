'use client';

import React from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguageStore } from '@/stores/language-store';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { t, getRoleLabel } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { adminService } from '@/modules/administration/service';
import { api } from '@/lib/api';
import {
  User, Save, Mail, ShieldCheck, Globe, KeyRound, Eye, EyeOff, BadgeCheck,
} from 'lucide-react';

function SectionHeader({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub: string }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const { language, setLanguage } = useLanguageStore();
  const { addToast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ name: '', nameAr: '', email: '' });
  const [prefLang, setPrefLang] = React.useState<'en' | 'ar'>('en');

  const [pwd, setPwd] = React.useState({ current: '', next: '', confirm: '' });
  const [pwdSaving, setPwdSaving] = React.useState(false);
  const [showPwd, setShowPwd] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      setForm({ name: user.name, nameAr: user.nameAr || '', email: user.email });
      setPrefLang(user.language === 'ar' ? 'ar' : 'en');
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const res = await adminService.updateUser(user.id, {
        name: form.name,
        nameAr: form.nameAr,
        language: prefLang,
      });
      if (res.success && res.data) {
        setUser({ ...user, ...res.data.user });
        if (prefLang !== language) setLanguage(prefLang);
        addToast({ type: 'success', title: t('Profile updated!', 'تم تحديث الملف الشخصي!', language) });
      } else {
        addToast({ type: 'error', title: res.error || t('Failed to update profile', 'فشل تحديث الملف الشخصي', language) });
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!pwd.current || !pwd.next) {
      addToast({ type: 'error', title: t('Fill in all password fields', 'املأ جميع حقول كلمة المرور', language) });
      return;
    }
    if (pwd.next.length < 8) {
      addToast({ type: 'error', title: t('New password must be at least 8 characters', 'كلمة المرور الجديدة يجب أن تكون ٨ أحرف على الأقل', language) });
      return;
    }
    if (pwd.next !== pwd.confirm) {
      addToast({ type: 'error', title: t('New passwords do not match', 'كلمتا المرور الجديدتان غير متطابقتين', language) });
      return;
    }
    setPwdSaving(true);
    try {
      const res = await api.post<{ success: boolean }>('/auth/change-password', {
        currentPassword: pwd.current,
        newPassword: pwd.next,
      });
      if (res.success) {
        setPwd({ current: '', next: '', confirm: '' });
        addToast({ type: 'success', title: t('Password changed successfully', 'تم تغيير كلمة المرور بنجاح', language) });
      } else {
        addToast({ type: 'error', title: res.error || t('Failed to change password', 'فشل تغيير كلمة المرور', language) });
      }
    } finally {
      setPwdSaving(false);
    }
  };

  if (!user) return null;

  const displayName = language === 'ar' ? user.nameAr || user.name : user.name;
  const initial = (displayName || '?').charAt(0).toUpperCase();

  return (
    <div className="space-y-5">
      {/* Identity banner */}
      <div className="flex flex-wrap items-center gap-4 rounded-md bg-gray-50 px-5 py-4">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-white">
            {initial}
          </div>
          <span className="absolute bottom-0 end-0 flex h-5 w-5 items-center justify-center rounded-full bg-white">
            <BadgeCheck className="h-4 w-4 text-success" />
          </span>
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-gray-900">{displayName}</h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5 text-gray-400" />
              {user.email}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-px text-xs font-semibold text-primary">
              <ShieldCheck className="h-3 w-3" />
              {getRoleLabel(user.role, language)}
            </span>
          </p>
        </div>
      </div>

      {/* Personal info */}
      <section>
        <SectionHeader
          icon={User}
          title={t('Personal Information', 'المعلومات الشخصية', language)}
          sub={t('Your display name across the app', 'اسمك الظاهر في التطبيق', language)}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            helperText={t('Email is managed by your administrator', 'يُدار البريد الإلكتروني من قبل المسؤول', language)}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              {t('Preferred Language', 'اللغة المفضلة', language)}
            </label>
            <div className="flex items-center gap-1 rounded-md bg-gray-100 p-1">
              {([
                { value: 'en' as const, label: 'English' },
                { value: 'ar' as const, label: 'العربية' },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPrefLang(opt.value)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    prefLang === opt.value ? 'bg-white text-primary shadow-card' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Globe className="h-3.5 w-3.5" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={handleSave} loading={saving}>
            <Save className="h-4 w-4" />
            {t('Save Changes', 'حفظ التغييرات', language)}
          </Button>
        </div>
      </section>

      <div className="h-px bg-gray-100" />

      {/* Security */}
      <section>
        <SectionHeader
          icon={KeyRound}
          title={t('Password & Security', 'كلمة المرور والأمان', language)}
          sub={t('Change your account password', 'تغيير كلمة مرور حسابك', language)}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input
            label={t('Current Password', 'كلمة المرور الحالية', language)}
            type={showPwd ? 'text' : 'password'}
            value={pwd.current}
            onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
            autoComplete="current-password"
          />
          <Input
            label={t('New Password', 'كلمة المرور الجديدة', language)}
            type={showPwd ? 'text' : 'password'}
            value={pwd.next}
            onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
            autoComplete="new-password"
            helperText={t('Minimum 8 characters', 'الحد الأدنى ٨ أحرف', language)}
          />
          <Input
            label={t('Confirm New Password', 'تأكيد كلمة المرور الجديدة', language)}
            type={showPwd ? 'text' : 'password'}
            value={pwd.confirm}
            onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
            autoComplete="new-password"
            error={pwd.confirm && pwd.next !== pwd.confirm ? t('Passwords do not match', 'كلمتا المرور غير متطابقتين', language) : undefined}
          />
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button onClick={handlePasswordChange} loading={pwdSaving} variant="secondary">
            <KeyRound className="h-4 w-4" />
            {t('Change Password', 'تغيير كلمة المرور', language)}
          </Button>
          <button
            type="button"
            onClick={() => setShowPwd(!showPwd)}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100"
          >
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPwd ? t('Hide', 'إخفاء', language) : t('Show', 'إظهار', language)}
          </button>
        </div>
      </section>
    </div>
  );
}
