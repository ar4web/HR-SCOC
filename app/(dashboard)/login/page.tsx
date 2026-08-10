'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguageStore } from '@/stores/language-store';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  Globe, Building2, Eye, EyeOff, ShieldCheck, MapPin,
  Clock, Laptop, Fingerprint, Wifi, ChevronLeft, Sparkles,
} from 'lucide-react';

interface GeoInfo {
  ip: string;
  country: string;
  flag: string;
  timeZone: string;
  localTime: string;
  browser: { name: string; os: string; secure: boolean };
}

const demoAccounts = [
  { label: 'Admin', email: 'admin@scos.sa', tone: 'bg-primary/10 text-primary border-primary/20' },
  { label: 'Employee', email: 'employee@scos.sa', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const { language, setLanguage, dir } = useLanguageStore();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [geo, setGeo] = React.useState<GeoInfo | null>(null);

  React.useEffect(() => {
    fetch('/api/auth/geo')
      .then((r) => r.json())
      .then(setGeo)
      .catch(() => setGeo(null));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    if (result.success) {
      router.push('/');
    } else {
      setError(result.error || 'Login failed');
    }
    setLoading(false);
  };

  const demoLogin = async (acc: { email: string }) => {
    setError('');
    setLoading(true);
    const result = await login(acc.email, 'Password123!');
    if (result.success) {
      router.push('/');
    } else {
      setError(result.error || 'Demo login failed');
    }
    setLoading(false);
  };

  const t = (en: string, ar: string) => (language === 'ar' ? ar : en);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden" dir={dir}>
      {/* Decorative gradient blob */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-[26rem] w-[26rem] rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[26rem] w-[26rem] rounded-full bg-blue-400/10 blur-3xl" />

      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Branding panel */}
        <div className="hidden lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            {t('Enterprise HR Suite v2', 'حزمة الموارد البشرية المؤسسية v2')}
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('SCOS Platform', 'نظام SCOS')}</h1>
              <p className="text-sm text-gray-500">{t('Saudi Corporate Operating System', 'نظام تشغيل الشركات السعودي')}</p>
            </div>
          </div>

          <p className="text-gray-600 text-sm leading-relaxed max-w-sm">
            {t(
              'A unified workspace for your workforce — employees, leaves, payroll, approvals and collaboration in one place.',
              'مساحة عمل موحدة لفريقك — الموظفون، الإجازات، الرواتب، الموافقات والتعاون في مكان واحد آمن.'
            )}
          </p>

          {/* Geo / session intel card */}
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white/80 backdrop-blur p-5 shadow-sm max-w-sm">
            <p className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              <Fingerprint className="h-3.5 w-3.5" /> {t('Session Intelligence', 'تقرير الجلسة')}
            </p>
            <div className="space-y-2.5 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <Globe className="h-4 w-4" /> {t('Region', 'المنطقة')}
                </span>
                <span className="font-medium text-gray-800 flex items-center gap-1.5">
                  {geo ? `${geo.flag} ${geo.country}` : '…'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <MapPin className="h-4 w-4" /> IP
                </span>
                <span className="font-medium text-gray-800">{geo?.ip || '…'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <Laptop className="h-4 w-4" /> {t('Device', 'الجهاز')}
                </span>
                <span className="font-medium text-gray-800">
                  {geo ? `${geo.browser.name} · ${geo.browser.os}` : '…'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <Clock className="h-4 w-4" /> {t('Time', 'الوقت')}
                </span>
                <span className="font-medium text-gray-800">{geo?.localTime || '…'}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <ShieldCheck className="h-4 w-4" /> TLS
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <Wifi className="h-3 w-3" /> Encrypted
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Login card */}
        <div className="w-full max-w-md mx-auto">
          <div className="card p-6 sm:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{t('Welcome back', 'مرحباً بعودتك')}</h2>
            <p className="text-sm text-gray-500 mb-6">
              {t('Sign in to access your workspace', 'سجّل الدخول للوصول إلى مساحة العمل')}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label={t('Email', 'البريد الإلكتروني')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@scos.sa"
                required
              />

              <div className="relative">
                <Input
                  label={t('Password', 'كلمة المرور')}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password123!"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 text-gray-400 hover:text-gray-600 ${language === 'ar' ? 'left-3 right-auto' : 'right-3'}`}
                  style={{ top: 38 }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-error/10 text-error text-sm animate-shake" role="alert">
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full">
                {t('Sign In', 'تسجيل الدخول')}
              </Button>
            </form>

            {/* One-tap demo login */}
            <div className="mt-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {t('Demo access (one tap)', 'دخول تجريبي (بضغطة واحدة)')}
              </p>
              <div className="flex flex-wrap gap-2">
                {demoAccounts.map((d) => (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => demoLogin(d)}
                    disabled={loading}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors hover:opacity-80 disabled:opacity-50 ${d.tone}`}
                  >
                    <ShieldCheck className="h-3 w-3" />
                    {t(`Login as ${d.label}`, `دخول كـ ${d.label}`)}
                    <ChevronLeft className="h-3 w-3 opacity-50" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Globe className="h-4 w-4" />
              {language === 'ar' ? 'English' : 'العربية'}
            </button>
            <span className="text-xs text-gray-400">
              {t('role: hierarchy-aware access', 'وصول متدرج حسب الصلاحيات')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}