'use client';

import React from 'react';
import { useModuleStore } from '@/stores/module-store';
import { useLanguageStore } from '@/stores/language-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Toggle } from '@/components/ui/Toggle';
import { Button } from '@/components/ui/Button';
import { t } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { Puzzle, Save, AlertTriangle } from 'lucide-react';

export default function ModulesPage() {
  const { modules, moduleStates, toggleModule } = useModuleStore();
  const { language } = useLanguageStore();
  const [localStates, setLocalStates] = React.useState<Record<string, boolean>>({});
  const { addToast } = useToast();
  const [warning, setWarning] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

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
            `This module requires: ${depNames}. Please enable dependencies first.`,
            `هذه الوحدة تتطلب: ${depNames}. يرجى تفعيل الوحدات التابعة أولاً.`,
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
            `Cannot disable: ${names} depend${dependents.length === 1 ? 's' : ''} on this module.`,
            `لا يمكن التعطيل: ${names} تعتمد على هذه الوحدة.`,
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
            addToast({ type: 'error', title: result.error || t('Failed to save modules', 'فشل حفظ إعدادات الوحدات', language) });
            return;
          }
        }
      }
      addToast({ type: 'success', title: t('Module settings saved!', 'تم حفظ إعدادات الوحدات!', language) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={t('Module Management', 'إدارة الوحدات', language)}
        subtitle={t('Enable or disable system modules', 'تفعيل أو تعطيل وحدات النظام', language)}
      />

      {warning && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20" role="alert">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-sm text-warning-800">{warning}</p>
        </div>
      )}

      <Card>
        <CardHeader className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Puzzle className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">
            {t('Available Modules', 'الوحدات المتاحة', language)}
          </h2>
        </CardHeader>
        <CardBody className="space-y-1">
          {modules.map((mod) => (
            <div
              key={mod.id}
              className="flex items-center justify-between py-4 px-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {t(mod.name, mod.nameAr, language)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t(mod.description, mod.descriptionAr, language)}
                </p>
                {mod.dependencies.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t('Requires:', 'يتطلب:', language)}{' '}
                    {mod.dependencies
                      .map((d) => {
                        const dep = modules.find((m) => m.id === d);
                        return dep ? t(dep.name, dep.nameAr, language) : d;
                      })
                      .join(', ')}
                  </p>
                )}
              </div>
              <Toggle
                checked={localStates[mod.id] ?? false}
                onCheckedChange={() => handleToggle(mod.id)}
              />
            </div>
          ))}
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving} title={t('Save Changes', 'حفظ التغييرات', language)} aria-label={t('Save Changes', 'حفظ التغييرات', language)}>
          <Save className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
