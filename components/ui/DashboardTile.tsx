'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

export interface TileChip {
  label: string;
  className?: string;
  href?: string;
}

export interface DashboardTileProps {
  icon?: LucideIcon;
  label: string;
  value?: string;
  sub?: string;
  chip?: string;
  chipClassName?: string;
  iconClassName?: string;
  pct?: number;
  barClassName?: string;
  empty?: boolean;
  emptyIcon?: LucideIcon;
  emptyText?: string;
  footer?: TileChip[];
  href?: string;
  onClick?: () => void;
  size?: 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

export function DashboardTile({
  icon: Icon,
  label,
  value,
  sub,
  chip,
  chipClassName = 'bg-primary/10 text-primary',
  iconClassName = 'bg-primary/10 text-primary',
  pct,
  barClassName = 'bg-primary',
  empty,
  emptyIcon: EmptyIcon = Inbox,
  emptyText,
  footer,
  href,
  onClick,
  size = 'md',
  className,
  children,
}: DashboardTileProps) {
  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors group-hover:brightness-105', iconClassName)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-600">{label}</p>
          {chip && (
            <span className={cn('mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', chipClassName)}>
              {chip}
            </span>
          )}
        </div>
      </div>

      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400">
            <EmptyIcon className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-gray-500">{emptyText}</p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex-1">
            {value !== undefined && (
              <p className={cn('font-bold leading-tight text-gray-900', size === 'lg' ? 'text-[36px]' : 'text-[32px]')}>
                {value}
              </p>
            )}
            {sub && (
              <p className="mt-1 text-[13px] leading-snug text-[#6B7280]">{sub}</p>
            )}
          </div>
          {pct !== undefined && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={cn('h-full rounded-full', barClassName)}
                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
              />
            </div>
          )}
        </>
      )}

      {children}

      {!empty && footer && footer.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {footer.map((c, i) => {
            const cls = cn(
              'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
              c.className || 'bg-gray-100 text-gray-600',
              c.href && 'hover:brightness-95'
            );
            return c.href ? (
              <Link key={i} href={c.href} className={cls}>
                {c.label}
              </Link>
            ) : (
              <span key={i} className={cls}>
                {c.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );

  const base = cn(
    'group rounded-2xl border border-gray-100 bg-white p-6 shadow-card transition-all',
    (href || onClick) && 'hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-md',
    className
  );

  if (href) {
    return (
      <Link href={href} className={base}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(base, 'w-full text-start')}>
        {content}
      </button>
    );
  }
  return <div className={base}>{content}</div>;
}