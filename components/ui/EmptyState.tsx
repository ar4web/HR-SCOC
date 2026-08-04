import React from 'react';
import { cn, t } from '@/lib/utils';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ElementType;
  title?: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  action?: React.ReactNode;
  locale?: 'en' | 'ar';
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  titleAr,
  description,
  descriptionAr,
  action,
  locale = 'en',
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-gray-300" />
      </div>
      {title && (
        <h3 className="text-base font-semibold text-gray-900 mb-1">
          {t(title, titleAr || title, locale)}
        </h3>
      )}
      {description && (
        <p className="text-sm text-gray-500 max-w-sm mb-4">
          {t(description, descriptionAr || description, locale)}
        </p>
      )}
      {action}
    </div>
  );
}
