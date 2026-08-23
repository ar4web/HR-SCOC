'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { t } from '@/lib/utils';
import { ListTodo, AlarmClock, X } from 'lucide-react';

const inputCls =
  'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary';
const labelCls = 'mb-1.5 block text-xs font-medium text-gray-600';

function FormHeader({ icon: Icon, iconCls, title, sub, onClose }: {
  icon: React.ElementType;
  iconCls: string;
  title: string;
  sub: string;
  onClose: () => void;
}) {
  const { language } = useLanguageStore();
  return (
    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconCls}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500">{sub}</p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
        title={t('Close', 'إغلاق', language)}
        aria-label={t('Close', 'إغلاق', language)}
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

export function AddTodoDialog({ onClose }: { onClose: () => void }) {
  const { language } = useLanguageStore();
  const { addToast } = useToast();
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [priority, setPriority] = React.useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      addToast({ type: 'error', title: t('Title is required', 'العنوان مطلوب', language) });
      return;
    }
    setSaving(true);
    const res = await api.post('/todos', {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      dueDate: dueDate || undefined,
    });
    setSaving(false);
    if (res.success) {
      addToast({ type: 'success', title: t('Todo added', 'تمت إضافة المهمة', language) });
      onClose();
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to add todo', 'فشل إضافة المهمة', language) });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <FormHeader
          icon={ListTodo}
          iconCls="bg-info/10 text-info"
          title={t('New Todo', 'مهمة جديدة', language)}
          sub={t('Create a to-do item', 'إنشاء مهمة', language)}
          onClose={onClose}
        />
        <div className="space-y-4 p-5">
          <div>
            <label className={labelCls}>{t('Title', 'العنوان', language)} *</label>
            <input
              className={inputCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('e.g. Review Q4 contracts', 'مثال: مراجعة عقود الربع الرابع', language)}
              autoFocus
            />
          </div>
          <div>
            <label className={labelCls}>{t('Description', 'الوصف', language)}</label>
            <textarea
              className={`${inputCls} min-h-20 resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('Optional details...', 'تفاصيل اختيارية...', language)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t('Priority', 'الأولوية', language)}</label>
              <select className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}>
                <option value="low">{t('Low', 'منخفضة', language)}</option>
                <option value="medium">{t('Medium', 'متوسطة', language)}</option>
                <option value="high">{t('High', 'عالية', language)}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('Due Date', 'تاريخ الاستحقاق', language)}</label>
              <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <Button variant="outline" onClick={onClose}>
            {t('Cancel', 'إلغاء', language)}
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {t('Save', 'حفظ', language)}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AddReminderDialog({ onClose }: { onClose: () => void }) {
  const { language } = useLanguageStore();
  const { addToast } = useToast();
  const [name, setName] = React.useState('');
  const [nameAr, setNameAr] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    if (!name.trim() || !dueDate) {
      addToast({ type: 'error', title: t('Name and due date are required', 'الاسم وتاريخ الاستحقاق مطلوبان', language) });
      return;
    }
    setSaving(true);
    const res = await api.post('/reminders', {
      create: true,
      name: name.trim(),
      nameAr: nameAr.trim() || undefined,
      dueDate,
    });
    setSaving(false);
    if (res.success) {
      addToast({ type: 'success', title: t('Reminder set', 'تم تعيين التذكير', language) });
      onClose();
    } else {
      addToast({ type: 'error', title: res.error || t('Failed to set reminder', 'فشل تعيين التذكير', language) });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <FormHeader
          icon={AlarmClock}
          iconCls="bg-warning/10 text-warning"
          title={t('New Reminder', 'تذكير جديد', language)}
          sub={t('Set a reminder', 'تعيين تذكير', language)}
          onClose={onClose}
        />
        <div className="space-y-4 p-5">
          <div>
            <label className={labelCls}>{t('Reminder Name', 'اسم التذكير', language)} *</label>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('e.g. Payroll submission', 'مثال: تقديم الرواتب', language)}
              autoFocus
            />
          </div>
          <div>
            <label className={labelCls}>{t('Name (Arabic)', 'الاسم (بالعربية)', language)}</label>
            <input className={inputCls} value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder={language === 'ar' ? 'مثال: تقديم الرواتب' : 'Optional'} />
          </div>
          <div>
            <label className={labelCls}>{t('Due Date', 'تاريخ الاستحقاق', language)} *</label>
            <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <Button variant="outline" onClick={onClose}>
            {t('Cancel', 'إلغاء', language)}
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {t('Save', 'حفظ', language)}
          </Button>
        </div>
      </div>
    </div>
  );
}
