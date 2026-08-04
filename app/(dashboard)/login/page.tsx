'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguageStore } from '@/stores/language-store';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Globe, Building2, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const { language, setLanguage, dir } = useLanguageStore();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir={dir}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary mb-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {language === 'ar' ? 'نظام SCOS' : 'SCOS Platform'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {language === 'ar'
              ? 'نظام تشغيل الشركات السعودي'
              : 'Saudi Corporate Operating System'}
          </p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@scos.sa"
              required
            />

            <div className="relative">
              <Input
                label={language === 'ar' ? 'كلمة المرور' : 'Password'}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password123!"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
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
              {language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 p-3 rounded-lg bg-gray-50 border border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-1">
              {language === 'ar' ? 'بيانات تسجيل الدخول التجريبية' : 'Demo Credentials'}
            </p>
            <p className="text-xs text-gray-400">
              Admin: admin@scos.sa / Password123!
            </p>
            <p className="text-xs text-gray-400">
              Employee: employee@scos.sa / Password123!
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Globe className="h-4 w-4" />
            {language === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>
      </div>
    </div>
  );
}
