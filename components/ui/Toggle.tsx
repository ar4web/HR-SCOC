import React from 'react';
import * as Switch from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

interface ToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
}

export function Toggle({ checked, onCheckedChange, disabled, label, description }: ToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          'w-11 h-6 rounded-full transition-all duration-150',
          'data-[state=checked]:bg-primary data-[state=unchecked]:bg-gray-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
        )}
      >
        <Switch.Thumb
          className={cn(
            'block w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-150',
            'data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-[2px]'
          )}
        />
      </Switch.Root>
      {(label || description) && (
        <div>
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {description && <p className="text-xs text-gray-500">{description}</p>}
        </div>
      )}
    </div>
  );
}
