'use client';
import React from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useCompanyStore } from '@/stores/company-store';
import { useModuleStore } from '@/stores/module-store';
import { useLanguageStore } from '@/stores/language-store';
import { useModuleGate } from '@/hooks/useModuleGate';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { FloatingChat } from '@/components/layout/FloatingChat';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, checkAuth, user } = useAuthStore();
  const { setLanguage } = useLanguageStore();
  const { fetchCompany } = useCompanyStore();
  const { fetchModules } = useModuleStore();

  useModuleGate();

  React.useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  React.useEffect(() => {
    if (isAuthenticated) {
      Promise.all([fetchCompany(), fetchModules()]);
    }
  }, [isAuthenticated, fetchCompany, fetchModules]);

  React.useEffect(() => {
    if (user?.language) {
      setLanguage(user.language);
    }
  }, [user?.language, setLanguage]);

  if (isLoading) {
    return (
      <div className="flex h-dvh overflow-hidden bg-gray-50">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-3/4" />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-24 bg-gray-200 rounded" />
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
      <FloatingChat />
    </div>
  );
}
