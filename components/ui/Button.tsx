import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-dark focus-ring',
    secondary: 'bg-secondary text-white hover:bg-secondary-700 focus-ring',
    outline: 'bg-gray-100/80 text-gray-700 hover:bg-gray-200/80 focus-ring',
    ghost: 'text-gray-600 hover:bg-gray-100 focus-ring',
    warning: 'bg-warning text-white hover:bg-warning-dark focus-ring',
    danger: 'bg-error text-white hover:bg-error-dark focus-ring',
  };

  const sizes = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-9 px-4 text-sm',
    lg: 'h-11 px-6 text-base',
  };

  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150',
        'active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
