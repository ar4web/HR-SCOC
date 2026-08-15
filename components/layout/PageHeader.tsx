import React from 'react';

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Shared responsive page heading.
 *
 * Mobile rules:
 * - Title and action area STACK vertically (actions move below the title).
 * - Title: text-xl, tight leading, break-words (long Arabic words wrap cleanly).
 * - Subtitle: text-xs.
 * - Actions: wrap freely, smaller gaps.
 *
 * Desktop (sm+):
 * - Title and actions share one row, actions pushed to the end.
 * - Title: text-2xl. Subtitle: text-sm.
 */
export default function PageHeader({ title, subtitle, actions, className = '' }: PageHeaderProps) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="min-w-0">
        <h1 className="text-lg font-bold text-gray-900 leading-tight break-words sm:text-xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-xs text-gray-500 mt-1 sm:text-sm">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          {actions}
        </div>
      ) : null}
    </div>
  );
}