'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguageStore } from '@/stores/language-store';
import { Button } from '@/components/ui/Button';
import {
  Globe, Building2, Eye, EyeOff, ShieldCheck, MapPin,
  Clock, Laptop, Wifi, Users, CalendarDays, Wallet,
  MessagesSquare, ArrowRight, Lock, Mail, AlertTriangle,
  ChevronRight, UserRound, KeyRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface GeoInfo {
  ip: string;
  country: string;
  flag: string;
  timeZone: string;
  localTime: string;
  browser: { name: string; os: string; secure: boolean };
}

const demoAccounts = [
  {
    label: { en: 'Administrator', ar: 'مدير النظام' },
    sub: { en: 'Full access · payroll, settings, reports', ar: 'وصول كامل · الرواتب والإعدادات والتقارير' },
    email: 'admin@scos.sa',
    icon: ShieldCheck,
    chip: 'bg-primary/10 text-primary',
  },
  {
    label: { en: 'Employee', ar: 'موظف' },
    sub: { en: 'Self-service portal · leaves, payslips', ar: 'الخدمة الذاتية · الإجازات وكشوف الرواتب' },
    email: 'employee@scos.sa',
    icon: UserRound,
    chip: 'bg-success/10 text-success',
  },
];

const features: { icon: LucideIcon; en: string; ar: string }[] = [
  { icon: Users, en: 'Employee lifecycle & org management', ar: 'إدارة دورة حياة الموظف والهيكل التنظيمي' },
  { icon: Wallet, en: 'Payroll, GOSI & WPS compliance', ar: 'الرواتب والتأمينات وملفات حماية الأجور' },
  { icon: CalendarDays, en: 'Attendance, leaves & approvals', ar: 'الحضور والإجازات والموافقات' },
  { icon: MessagesSquare, en: 'Email, chat & collaboration', ar: 'البريد والمحادثات والتعاون' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const { language, setLanguage, dir } = useLanguageStore();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [demoLoading, setDemoLoading] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [capsLock, setCapsLock] = React.useState(false);
  const [geo, setGeo] = React.useState<GeoInfo | null>(null);

  React.useEffect(() => {
    fetch('/api/auth/geo')
      .then((r) => r.json())
      .then(setGeo)
      .catch(() => setGeo(null));
  }, []);

  const t = (en: string, ar: string) => (language === 'ar' ? ar : en);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      router.push('/');
    } else {
      setError(result.error || t('Login failed', 'فشل تسجيل الدخول'));
      setLoading(false);
    }
  };

  const demoLogin = async (accEmail: string) => {
    setError('');
    setDemoLoading(accEmail);
    const result = await login(accEmail, 'Password123!');
    if (result.success) {
      router.push('/');
    } else {
      setError(result.error || t('Demo login failed', 'فشل الدخول التجريبي'));
      setDemoLoading('');
    }
  };

  const busy = loading || !!demoLoading;

  return (
    <div className="flex min-h-dvh bg-white" dir={dir}>
      {/* ── Brand panel ─────────────────────────────────────────── */}
      <div className="relative hidden w-[46%] shrink-0 flex-col justify-between overflow-hidden bg-secondary p-10 text-white lg:flex xl:p-14">
        {/* subtle texture: dot grid + soft accent glow */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(rgb(255 255 255) 1px, transparent 1px)', backgroundSize: '26px 26px' }}
        />
        <div className="pointer-events-none absolute -top-32 -end-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -start-24 h-96 w-96 rounded-full bg-primary-light/30 blur-3xl" />

        {/* top: logo */}
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white/10">
              <Building2 className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight">SCOS</p>
              <p className="text-[11px] font-medium uppercase tracking-widest text-white/50">
                {t('Saudi Corporate OS', 'نظام تشغيل الشركات')}
              </p>
            </div>
          </div>
        </div>

        {/* middle: headline + features */}
        <div className="relative max-w-md">
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t('Enterprise HR Suite', 'حزمة موارد بشرية مؤسسية')}
          </p>
          <h1 className="text-3xl font-bold leading-tight xl:text-4xl">
            {t('Your entire workforce.', 'كل فريق عملك.')}
            <br />
            <span className="text-accent">{t('One operating system.', 'نظام تشغيل واحد.')}</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            {t(
              'Employees, payroll, attendance, approvals and collaboration — unified, compliant and built for Saudi enterprises.',
              'الموظفون والرواتب والحضور والموافقات والتعاون — في منظومة موحدة ومتوافقة مصممة للمنشآت السعودية.'
            )}
          </p>

          <ul className="mt-8 space-y-3.5">
            {features.map((f) => (
              <li key={f.en} className="flex items-center gap-3 text-sm text-white/80">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10">
                  <f.icon className="h-4 w-4 text-accent" />
                </span>
                {t(f.en, f.ar)}
              </li>
            ))}
          </ul>
        </div>

        {/* bottom: session intel strip */}
        <div className="relative">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md bg-white/5 px-4 py-3 text-xs text-white/60">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-white/40" />
              {geo ? `${geo.flag} ${geo.country}` : '…'}
            </span>
            <span className="flex items-center gap-1.5">
              <Laptop className="h-3.5 w-3.5 text-white/40" />
              {geo ? `${geo.browser.name} · ${geo.browser.os}` : '…'}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-white/40" />
              {geo?.localTime || '…'}
            </span>
            <span className="ms-auto flex items-center gap-1.5 font-medium text-success">
              <Wifi className="h-3.5 w-3.5" />
              {t('Encrypted', 'مشفّر')}
            </span>
          </div>
        </div>
      </div>

      {/* ── Form panel ──────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* top bar: mobile logo + language */}
        <div className="flex items-center justify-between px-6 pt-6 sm:px-10">
          <div className="flex items-center gap-2.5 lg:invisible">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary">
              <Building2 className="h-5 w-5 text-accent" />
            </div>
            <span className="text-base font-bold text-gray-900">SCOS</span>
          </div>
          <button
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
          >
            <Globe className="h-4 w-4" />
            {language === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-[400px]">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              {t('Welcome back', 'مرحباً بعودتك')}
            </h2>
            <p className="mt-1.5 text-sm text-gray-500">
              {t('Sign in to your workspace to continue', 'سجّل الدخول إلى مساحة عملك للمتابعة')}
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-[13px] font-medium text-gray-700">
                  {t('Work email', 'البريد الإلكتروني للعمل')}
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.sa"
                    required
                    className="block w-full rounded-md border-0 bg-gray-100 py-2.5 ps-10 pe-3 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-[13px] font-medium text-gray-700">
                  {t('Password', 'كلمة المرور')}
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={(e) => setCapsLock(e.getModifierState?.('CapsLock') ?? false)}
                    onBlur={() => setCapsLock(false)}
                    placeholder="••••••••••"
                    required
                    className="block w-full rounded-md border-0 bg-gray-100 py-2.5 ps-10 pe-10 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-200/60 hover:text-gray-600"
                    aria-label={showPassword ? t('Hide password', 'إخفاء كلمة المرور') : t('Show password', 'إظهار كلمة المرور')}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {capsLock && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-warning">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {t('Caps Lock is on', 'مفتاح الأحرف الكبيرة مفعّل')}
                  </p>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-md bg-error/10 px-3.5 py-3 text-sm text-error animate-shake" role="alert">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} disabled={busy} className="w-full !py-2.5">
                {t('Sign in', 'تسجيل الدخول')}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
            </form>

            {/* divider */}
            <div className="my-7 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {t('or explore the demo', 'أو جرّب النسخة التجريبية')}
              </span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>

            {/* demo account cards */}
            <div className="space-y-2">
              {demoAccounts.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => demoLogin(d.email)}
                  disabled={busy}
                  className="group flex w-full items-center gap-3 rounded-md bg-gray-50 px-4 py-3 text-start transition-colors hover:bg-primary/5 disabled:opacity-50"
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${d.chip}`}>
                    <d.icon style={{ width: 18, height: 18 }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-gray-900">
                      {t(d.label.en, d.label.ar)}
                    </span>
                    <span className="block truncate text-xs text-gray-400">
                      {t(d.sub.en, d.sub.ar)}
                    </span>
                  </span>
                  {demoLoading === d.email ? (
                    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                  )}
                </button>
              ))}
              <p className="flex items-center gap-1.5 px-1 pt-1 text-[11px] text-gray-400">
                <KeyRound className="h-3 w-3" />
                {t('Demo password: Password123!', 'كلمة مرور التجربة: Password123!')}
              </p>
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 pb-5 sm:px-10">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} SCOS · {t('All rights reserved', 'جميع الحقوق محفوظة')}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-gray-400">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            {t('Role-based access · TLS encrypted', 'وصول حسب الصلاحيات · اتصال مشفّر')}
          </p>
        </div>
      </div>
    </div>
  );
}
