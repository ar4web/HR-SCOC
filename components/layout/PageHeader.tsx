import React from 'react';
import type { LucideIcon } from 'lucide-react';

/* =========================================================================
 * Unified page toolbar system — modeled on the Spark-style email toolbar.
 *
 * Rules:
 * - One slim row: small tinted icon tile · title (+optional badge/subtitle)
 *   · sleek borderless icon actions at the end.
 * - No outlines, no filled bulky buttons, corners ≤ 5px.
 * - Primary action = colored icon (like Spark's compose pencil).
 * ========================================================================= */

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  /** Page identity icon — small flat tinted tile, mirrors the sidebar icon. */
  icon?: LucideIcon;
  /** Optional small element next to the title (count pill, live chip…). */
  badge?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  actions,
  icon: Icon,
  badge,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`flex items-center gap-3 border-b border-gray-100 pb-3 ${className}`}>
      {Icon ? (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-[15px] font-semibold leading-tight text-gray-900">
            {title}
          </h1>
          {badge}
        </div>
        {subtitle ? (
          <p className="hidden truncate text-xs text-gray-400 sm:block">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-0.5">{actions}</div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * HeaderAction — the sleek borderless icon button used for every toolbar
 * item (same treatment as the email page's search / deliver / compose).
 * ------------------------------------------------------------------------- */

interface HeaderActionProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: LucideIcon;
  /** Accessible label; also shown as the native tooltip. */
  label: string;
  /** Colored primary action (Spark pencil treatment). */
  primary?: boolean;
  /** Spin the icon (refresh/loading states). */
  spinning?: boolean;
}

export function HeaderAction({
  icon: Icon,
  label,
  primary = false,
  spinning = false,
  className = '',
  type = 'button',
  ...props
}: HeaderActionProps) {
  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      className={`rounded-md p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        primary
          ? 'text-primary hover:bg-primary/10'
          : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
      } ${className}`}
      {...props}
    >
      <Icon className={`h-[18px] w-[18px] ${spinning ? 'animate-spin' : ''}`} />
    </button>
  );
}
