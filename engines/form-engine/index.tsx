'use client';

import React from 'react';
import { cn, t } from '@/lib/utils';

export interface FormField {
  name: string;
  label: string;
  labelAr?: string;
  type?: 'text' | 'email' | 'tel' | 'number' | 'date' | 'select' | 'textarea' | 'password';
  placeholder?: string;
  placeholderAr?: string;
  required?: boolean;
  options?: { value: string; label: string; labelAr?: string }[];
  helperText?: string;
  helperTextAr?: string;
  validation?: {
    pattern?: RegExp;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
  colSpan?: 1 | 2;
}

interface FormBuilderProps {
  fields: FormField[][];
  locale?: 'en' | 'ar';
  onSubmit?: (data: Record<string, string>) => void;
  submitLabel?: string;
  submitLabelAr?: string;
  loading?: boolean;
  defaultValues?: Record<string, string>;
  title?: string;
  titleAr?: string;
  icon?: React.ReactNode;
  showSubmit?: boolean;
  onValuesChange?: (data: Record<string, string>) => void;
}

export function FormBuilder({
  fields,
  locale = 'en',
  onSubmit,
  submitLabel,
  submitLabelAr,
  loading,
  defaultValues,
  title,
  titleAr,
  icon,
  showSubmit = true,
  onValuesChange,
}: FormBuilderProps) {
  const [values, setValues] = React.useState<Record<string, string>>(defaultValues || {});
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleChange = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    onValuesChange?.({ ...values, [name]: value });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const flatFields = fields.flat();

    for (const field of flatFields) {
      const value = values[field.name] || '';
      if (field.required && !value.trim()) {
        newErrors[field.name] = t(
          `${field.label} is required`,
          `${field.labelAr || field.label} مطلوب`,
          locale
        );
        continue;
      }
      if (field.validation) {
        if (field.validation.minLength && value !== '' && value.length < field.validation.minLength) {
          newErrors[field.name] = t(
            `Minimum ${field.validation.minLength} characters`,
            `الحد الأدنى ${field.validation.minLength} أحرف`,
            locale
          );
        }
        if (field.validation.maxLength && value !== '' && value.length > field.validation.maxLength) {
          newErrors[field.name] = t(
            `Maximum ${field.validation.maxLength} characters`,
            `الحد الأقصى ${field.validation.maxLength} أحرف`,
            locale
          );
        }
        if (field.validation.pattern && value && !field.validation.pattern.test(value)) {
          newErrors[field.name] = t('Invalid format', 'تنسيق غير صحيح', locale);
        }
        if (field.type === 'number') {
          const num = value === '' ? Number.NaN : Number(value);
          if (typeof field.validation.min === 'number' && value !== '' && (Number.isNaN(num) || num < field.validation.min)) {
            newErrors[field.name] = t(
              `Minimum value is ${field.validation.min}`,
              `الحد الأدنى للقيمة ${field.validation.min}`,
              locale
            );
          }
          if (typeof field.validation.max === 'number' && value !== '' && (Number.isNaN(num) || num > field.validation.max)) {
            newErrors[field.name] = t(
              `Maximum value is ${field.validation.max}`,
              `الحد الأقصى للقيمة ${field.validation.max}`,
              locale
            );
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit?.(values);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {title && (
        <div className="flex items-center gap-3">
          {icon}
          <h2 className="text-lg font-semibold">{t(title, titleAr || title, locale)}</h2>
        </div>
      )}

      {fields.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${row.reduce((sum, f) => sum + (f.colSpan || 1), 0)}, 1fr)`,
          }}
        >
          {row.map((field) => {
            const fieldId = `field-${field.name}`;
            const error = errors[field.name];
            const value = values[field.name] || '';

            return (
              <div key={field.name} className="space-y-1.5">
                <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700">
                  {t(field.label, field.labelAr || field.label, locale)}
                  {field.required && <span className="text-error ml-1">*</span>}
                </label>

                {field.type === 'select' ? (
                  <select
                    id={fieldId}
                    value={value}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className={cn(
                      'w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary',
                      error ? 'border-error' : 'border-gray-300'
                    )}
                    required={field.required}
                  >
                    <option value="">
                      {t('Select...', 'اختر...', locale)}
                    </option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {t(opt.label, opt.labelAr || opt.label, locale)}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    id={fieldId}
                    value={value}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    rows={3}
                    className={cn(
                      'w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary',
                      error ? 'border-error' : 'border-gray-300'
                    )}
                    placeholder={t(field.placeholder || '', field.placeholderAr || '', locale)}
                    required={field.required}
                  />
                ) : (
                  <input
                    id={fieldId}
                    type={field.type || 'text'}
                    value={value}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className={cn(
                      'w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary',
                      error ? 'border-error' : 'border-gray-300'
                    )}
                    placeholder={t(field.placeholder || '', field.placeholderAr || '', locale)}
                    required={field.required}
                  />
                )}

                {error && (
                  <p className="text-sm text-error animate-shake" role="alert">{error}</p>
                )}
                {field.helperText && !error && (
                  <p className="text-sm text-gray-500">
                    {t(field.helperText, field.helperTextAr || '', locale)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {showSubmit && onSubmit && (
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {loading && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {t(submitLabel || 'Save', submitLabelAr || 'حفظ', locale)}
          </button>
        </div>
      )}
    </form>
  );
}
