'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLanguageStore } from '@/stores/language-store';
import { t } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Modern confirm dialog — replaces window.confirm across the app.
 * Flat design: 5px corners, no outlines, theme tokens, RTL-safe.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = true,
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { language } = useLanguageStore();

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 animate-fade-in"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-md bg-white shadow-modal animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${danger ? 'bg-error/10 text-error' : 'bg-warning/10 text-warning'}`}>
            <AlertTriangle className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
            {message ? <p className="mt-1 text-xs leading-5 text-gray-500">{message}</p> : null}
          </div>
          <button
            onClick={onClose}
            aria-label={t('Close', 'إغلاق', language)}
            className="rounded-md p-1 text-gray-300 hover:bg-gray-100 hover:text-gray-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {cancelLabel || t('Cancel', 'إلغاء', language)}
          </Button>
          <Button variant={danger ? 'danger' : 'warning'} size="sm" loading={loading} onClick={onConfirm}>
            {confirmLabel || t('Confirm', 'تأكيد', language)}
          </Button>
        </div>
      </div>
    </div>
  );
}
