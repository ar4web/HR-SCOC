'use client';

import React from 'react';
import { useModuleStore } from '@/stores/module-store';
import { useLanguageStore } from '@/stores/language-store';
import { Card, CardBody } from '@/components/ui/Card';
import { Toggle } from '@/components/ui/Toggle';
import { Button } from '@/components/ui/Button';
import { t } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import { useToast } from '@/components/ui/Toast';
import {
  Puzzle, Save, AlertTriangle, Users, CalendarDays, DollarSign, Clock,
  MessageSquare, ListTodo, FolderOpen, Mail, Receipt, BarChart3, Settings,
  Sparkles, Power, CheckCircle2, XCircle, Link2, FileText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Users,
  Calendar: CalendarDays,
  DollarSign,
  Clock,
  MessageSquare,
  ListTodo,
  FolderOpen,
  Mail,
  Receipt,
  BarChart: BarChart3,
  Settings,
  FileText,
};

const GRADIENTS: Record<string, string> = {
  'employee-management': 'from-blue-500 to-indigo-600',
  'leave-management': 'from-emerald-500 to-teal-600',
  payroll: 'from-amber-500 to-orange-600',
  attendance: 'from-violet-500 to-purple-600',
  communication: 'from-pink-500 to-rose-600',
  'todo-management': 'from-sky-500 to-cyan-600',
  'document-management': 'from-lime-500 to-green-600',
  email: 'from-red-500 to-rose-600',
  'expense-management': 'from-orange-500 to-amber-600',
  reports: 'from-indigo-500 to-blue-600',
  administration: 'from-slate-500 to-gray-700',
  contracts: 'from-teal-500 to-cyan-700',
};

export default function ModulesPage() {
  const { modules, moduleStates, toggleModule } = useModuleStore();
  const { language } = useLanguageStore();
  const [localStates, setLocalStates] = React.useState<Record<string, boolean>>({});
  const { addToast } = useToast();
  const [warning, setWarning] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const installedCount = Object.values(localStates).filter(Boolean).length;

  React.useEffect(() => {
    setLocalStates({ ...moduleStates });
  }, [moduleStates]);

  const handleToggle = async (moduleId: string) => {
    const moduleDef = modules.find((m) => m.id === moduleId);
    if (!moduleDef) return;

    const willEnable = !localStates[moduleId];

    if (willEnable) {
      const deps = moduleDef.dependencies.filter((depId) => !localStates[depId]);
      if (deps.length > 0) {
        const depNames = deps
          .map((depId) => modules.find((m) => m.id === depId)?.name || depId)
          .join(', ');
        setWarning(
          t(
            `This plugin requires: ${depNames}. Please enable dependencies first.`,
            `هذه الإضافة تتطلب: ${depNames}. يرجى تفعيل الإضافات التابعة أولاً.`,
            language
          )
        );
        return;
      }
    } else {
      const dependents = modules.filter(
        (m) => localStates[m.id] && m.id !== moduleId && m.dependencies.includes(moduleId)
      );
      if (dependents.length > 0) {
        const names = dependents.map((m) => t(m.name, m.nameAr, language)).join(', ');
        setWarning(
          t(
            `Cannot disable: ${names} depend${dependents.length === 1 ? 's' : ''} on this plugin.`,
            `لا يمكن التعطيل: ${names} تعتمد على هذه الإضافة.`,
            language
          )
        );
        return;
      }
    }

    setWarning(null);
    setLocalStates((prev) => ({ ...prev, [moduleId]: willEnable }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [moduleId, enabled] of Object.entries(localStates)) {
        const current = moduleStates[moduleId];
        if (current !== enabled) {
          const result = await toggleModule(moduleId, enabled);
          if (!result.success) {
            addToast({ type: 'error', title: result.error || t('Failed to save plugins', 'فشل حفظ إعدادات الإضافات', language) });
            return;
          }
        }
      }
      addToast({ type: 'success', title: t('Plugin settings saved!', 'تم حفظ إعدادات الإضافات!', language) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title={t('Plugin Manager', 'مدير الإضافات', language)}
        subtitle={t('Enable or disable application plugins', 'تفعيل أو تعطيل إضافات التطبيق', language)}
      />

      {warning && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20" role="alert">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-sm text-warning-800">{warning}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Sparkles className="h-4 w-4" />
          <span>
            {t(
              `${installedCount} of ${modules.length} plugins active`,
              `${installedCount} من ${modules.length} إضافة نشطة`,
              language
            )}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((mod) => {
          const enabled = localStates[mod.id] ?? false;
          const Icon = ICON_MAP[mod.icon] || Puzzle;
          const gradient = GRADIENTS[mod.id] || 'from-gray-500 to-gray-700';
          const missingDeps = mod.dependencies.filter((depId) => !localStates[depId]);

          return (
            <Card
              key={mod.id}
              className={cnCard(enabled)}
            >
              <CardBody className="flex flex-col h-full">
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-sm`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      enabled ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {enabled ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          {t('Active', 'نشط', language)}
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3" />
                          {t('Inactive', 'معطل', language)}
                        </>
                      )}
                    </span>
                    <Toggle
                      checked={enabled}
                      onCheckedChange={() => handleToggle(mod.id)}
                    />
                  </div>
                </div>

                <h3 className="mt-3 text-sm font-semibold text-gray-900">
                  {t(mod.name, mod.nameAr, language)}
                </h3>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed flex-1">
                  {t(mod.description, mod.descriptionAr, language)}
                </p>

                {mod.dependencies.length > 0 && (
                  <div className="mt-3 flex items-start gap-1.5 text-[11px] text-gray-400">
                    <Link2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>
                      {t('Requires:', 'يتطلب:', language)}{' '}
                      {mod.dependencies
                        .map((d) => {
                          const dep = modules.find((m) => m.id === d);
                          return dep ? t(dep.name, dep.nameAr, language) : d;
                        })
                        .join(', ')}
                      {missingDeps.length > 0 && (
                        <span className="text-warning font-medium">
                          {t(' (missing)', ' (مفقود)', language)}
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {enabled && mod.route && (
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-primary">
                    <Power className="h-3.5 w-3.5" />
                    <span>{t('Live at', 'متاح في', language)} {mod.route}</span>
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end sticky bottom-4">
        <Button
          onClick={handleSave}
          loading={saving}
          title={t('Save Changes', 'حفظ التغييرات', language)}
          aria-label={t('Save Changes', 'حفظ التغييرات', language)}
        >
          <Save className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function cnCard(enabled: boolean): string {
  return `transition-all duration-200 ${enabled ? 'border-success/30 bg-white' : 'border-gray-200 bg-gray-50/60 opacity-80'}`;
}
