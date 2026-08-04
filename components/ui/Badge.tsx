import React from 'react';
import { cn, getStatusColor, getStatusLabel } from '@/lib/utils';

interface BadgeProps {
  status: string;
  locale?: 'en' | 'ar';
  className?: string;
}

export function Badge({ status, locale = 'en', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        getStatusColor(status),
        className
      )}
    >
      {getStatusLabel(status, locale)}
    </span>
  );
}
