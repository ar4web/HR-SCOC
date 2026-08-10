'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { useCompanyStore } from '@/stores/company-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { t } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { settingsService } from '@/modules/settings/service';
import { Clock, Save } from 'lucide-react';

const weekDays = [
  { key: '0', en: 'Sunday', ar: 'الأحد' },
  { key: '1', en: 'Monday', ar: 'الإثنين' },
  { key: '2', en: 'Tuesday', ar: 'الثلاثاء' },
  { key: '3', en: 'Wednesday', ar: 'الأربعاء' },
  { key: '4', en: 'Thursday', ar: 'الخميس' },
  { key: '5', en: 'Friday', ar: 'الجمعة' },
  { key: '6', en: 'Saturday', ar: 'السبت' },
];

export default function WorkWeekPage() {
  const { language } = useLanguageStore();
  const { company, updateSettings } = useCompanyStore();
  const [weekendDays, setWeekendDays] = React.useState<number[]>([5, 6]);
  const [startHour, setStartHour] = React.useState('09:00');
  const { addToast } = useToast();
  const [endHour, setEndHour] = React.useState('18:00');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (company) {
      setWeekendDays(company.settings.weekendDays);
      setStartHour(company.settings.workingHours.start);
      setEndHour(company.settings.workingHours.end);
    }
  }, [company]);

  const toggleWeekend = (dayIndex: number) => {
    setWeekendDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const [hoursRes, weekendRes] = await Promise.all([
        settingsService.update('working-hours', { start: startHour, end: endHour }),
        settingsService.update('weekend', weekendDays),
      ]);
      if (hoursRes.success && weekendRes.success) {
        await updateSettings({
          workingHours: { start: startHour, end: endHour },
          weekendDays,
        });
        addToast({ type: 'success', title: t('Work week settings saved!', 'تم حفظ إعدادات أسبوع العمل!', language) });
      } else {
        addToast({ type: 'error', title: t('Failed to save settings', 'فشل حفظ الإعدادات', language) });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={t('Work Week Settings', 'إعدادات أسبوع العمل', language)}
        subtitle={t('Configure working days and hours', 'تكوين أيام وساعات العمل', language)}
      />

      <Card>
        <CardHeader className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">
            {t('Working Hours', 'ساعات العمل', language)}
          </h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('Start Time', 'وقت البداية', language)}
              </label>
              <input
                type="time"
                value={startHour}
                onChange={(e) => setStartHour(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('End Time', 'وقت النهاية', language)}
              </label>
              <input
                type="time"
                value={endHour}
                onChange={(e) => setEndHour(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">
            {t('Weekend Days', 'أيام العطلة الأسبوعية', language)}
          </h2>
        </CardHeader>
        <CardBody className="space-y-2">
          <p className="text-sm text-gray-500 mb-4">
            {t('Select which days are considered weekend (non-working)', 'اختر الأيام التي تعتبر عطلة أسبوعية', language)}
          </p>
          {weekDays.map((day) => (
            <div key={day.key} className="flex items-center justify-between py-3 border-b last:border-0">
              <span className="text-sm font-medium">{t(day.en, day.ar, language)}</span>
              <Toggle
                checked={!weekendDays.includes(parseInt(day.key))}
                onCheckedChange={() => toggleWeekend(parseInt(day.key))}
                label={weekendDays.includes(parseInt(day.key))
                  ? t('Weekend', 'عطلة', language)
                  : t('Working Day', 'يوم عمل', language)}
              />
            </div>
          ))}
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving} title={t('Save Settings', 'حفظ الإعدادات', language)} aria-label={t('Save Settings', 'حفظ الإعدادات', language)}>
          <Save className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
