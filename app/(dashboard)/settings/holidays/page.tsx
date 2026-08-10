'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { useCompanyStore } from '@/stores/company-store';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { t, formatDate, generateId } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { settingsService } from '@/modules/settings/service';
import { CalendarDays, Plus, Save, Trash2 } from 'lucide-react';
import { Holiday } from '@/types';

export default function HolidaysPage() {
  const { language } = useLanguageStore();
  const { company, updateSettings } = useCompanyStore();
  const { addToast } = useToast();
  const [holidays, setHolidays] = React.useState<Holiday[]>([]);
  const [showNew, setShowNew] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [newHoliday, setNewHoliday] = React.useState({ name: '', nameAr: '', date: '' });

  React.useEffect(() => {
    if (company) setHolidays(company.settings.holidays);
  }, [company]);

  const handleAdd = () => {
    if (!newHoliday.name.trim() || !newHoliday.date) {
      addToast({ type: 'error', title: t('Name and date are required', 'الاسم والتاريخ مطلوبان', language) });
      return;
    }
    const holiday: Holiday = {
      id: generateId(),
      name: newHoliday.name,
      nameAr: newHoliday.nameAr || newHoliday.name,
      date: newHoliday.date,
      isRecurring: true,
    };
    setHolidays([...holidays, holiday]);
    setNewHoliday({ name: '', nameAr: '', date: '' });
    setShowNew(false);
  };

  const handleRemove = (id: string) => {
    setHolidays(holidays.filter((h) => h.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await settingsService.update('holidays', { holidays });
      if (res.success) {
        const storeRes = await updateSettings({ holidays });
        if (storeRes.success === false) {
          addToast({ type: 'error', title: storeRes.error || t('Failed to save holidays', 'فشل حفظ الإجازات', language) });
          return;
        }
        addToast({ type: 'success', title: t('Holidays saved!', 'تم حفظ الإجازات الرسمية!', language) });
      } else {
        addToast({ type: 'error', title: t('Failed to save holidays', 'فشل حفظ الإجازات', language) });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={t('Holiday Management', 'إدارة الإجازات الرسمية', language)}
        subtitle={t('Configure company holidays and non-working days', 'تكوين إجازات الشركة الرسمية وأيام العطل', language)}
      />

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{t('Holidays', 'الإجازات الرسمية', language)}</h2>
          </div>
          <Button size="sm" onClick={() => setShowNew(!showNew)}>
            <Plus className="h-4 w-4" />
            {t('Add', 'إضافة', language)}
          </Button>
        </CardHeader>
        <CardBody className="space-y-3">
          {showNew && (
            <div className="p-4 rounded-lg bg-gray-50 border space-y-3 animate-fade-in">
              <Input
                label={t('Holiday Name', 'اسم الإجازة', language)}
                value={newHoliday.name}
                onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                placeholder={t('e.g. Saudi National Day', 'مثال: اليوم الوطني السعودي', language)}
              />
              <Input
                label={t('Name (Arabic)', 'الاسم (عربي)', language)}
                value={newHoliday.nameAr}
                onChange={(e) => setNewHoliday({ ...newHoliday, nameAr: e.target.value })}
              />
              <Input
                label={t('Date', 'التاريخ', language)}
                type="date"
                value={newHoliday.date}
                onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAdd}>
                  {t('Add Holiday', 'إضافة إجازة', language)}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowNew(false)}>
                  {t('Cancel', 'إلغاء', language)}
                </Button>
              </div>
            </div>
          )}

          {holidays.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CalendarDays className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">{t('No holidays configured', 'لا توجد إجازات مضافة', language)}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {holidays.map((holiday) => (
                <div
                  key={holiday.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {language === 'ar' ? holiday.nameAr || holiday.name : holiday.name}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(holiday.date, language)}</p>
                  </div>
                  <button
                    onClick={() => handleRemove(holiday.id)}
                    aria-label={t('Delete holiday', 'حذف الإجازة', language)}
                    title={t('Delete holiday', 'حذف الإجازة', language)}
                    className="p-1.5 rounded-lg hover:bg-error/10 text-gray-400 hover:text-error transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t">
            <Button onClick={handleSave} loading={saving} title={t('Save Holidays', 'حفظ الإجازات', language)} aria-label={t('Save Holidays', 'حفظ الإجازات', language)}>
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
