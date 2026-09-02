'use client';

/**
 * Shared page toolbar — the standard "top rail" inside every module's main card.
 *
 * Placement contract (same on every page):
 *   <Card><CardBody>
 *     <Toolbar>
 *       <ToolbarSegments … />      ← view/tab switcher (start)
 *       <ToolbarChips … />         ← filter pills
 *       <ToolbarDivider />
 *       …page-specific tools…
 *       <ToolbarSpacer />
 *       <ToolbarCount … />         ← result count (end)
 *     </Toolbar>
 *     …content…
 *   </CardBody></Card>
 *
 * Design rules: borderless, radius ≤ 5px (pills excepted), gray-100 idle,
 * primary/10 active — matching the Documents page reference.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export function Toolbar({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('flex flex-wrap items-center gap-3', className)}>{children}</div>;
}

export interface SegmentOption<T extends string> {
  value: T;
  label?: string;
  icon?: LucideIcon | React.ReactNode;
  count?: number;
  title?: string;
}

/** Segmented control (gray track, white active pill) — for view modes / tabs. */
export function ToolbarSegments<T extends string>({
  value,
  onChange,
  options,
  iconOnly,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegmentOption<T>[];
  iconOnly?: boolean;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-md bg-gray-100 p-1">
      {options.map((o) => {
        const active = value === o.value;
        const icon =
          o.icon && typeof o.icon === 'function' ? React.createElement(o.icon as LucideIcon, { className: 'h-4 w-4' }) : o.icon;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            title={o.title || o.label}
            aria-label={o.title || o.label}
            className={cn(
              'inline-flex shrink-0 items-center justify-center gap-1.5 rounded transition-colors',
              iconOnly ? 'h-8 w-8' : 'px-3 py-1.5 text-xs font-semibold',
              active ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {icon}
            {!iconOnly && o.label}
            {!iconOnly && o.count !== undefined && (
              <span className={cn('rounded-full px-1.5 py-0.5 text-[10px]', active ? 'bg-primary/10 text-primary' : 'bg-gray-200/70 text-gray-500')}>
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export interface ChipOption {
  value: string;
  label: string;
  count?: number;
}

/** Filter pills — primary/10 when active. */
export function ToolbarChips({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: ChipOption[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((o) => (
        <button
          key={o.value || 'all'}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
            value === o.value ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="ms-1 opacity-60">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function ToolbarDivider() {
  return <span className="hidden h-4 w-px bg-gray-200 sm:block" />;
}

export function ToolbarSpacer() {
  return <div className="flex-1" />;
}

/** Muted result count at the end of the rail. */
export function ToolbarCount({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-gray-400">{children}</p>;
}

/** Styled select for toolbar-level dropdown filters. */
export function ToolbarSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props;
  return (
    <select
      {...rest}
      className={cn(
        'rounded-md border-0 bg-gray-100 px-3 py-2 text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40',
        className
      )}
    />
  );
}

/** Styled date/text input for toolbar-level filters. */
export function ToolbarInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      {...rest}
      className={cn(
        'rounded-md border-0 bg-gray-100 px-3 py-2 text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40',
        className
      )}
    />
  );
}
