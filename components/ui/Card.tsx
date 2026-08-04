import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className, children }: CardProps) {
  return <div className={cn('card', className)}>{children}</div>;
}

export function CardHeader({ className, children }: CardProps) {
  return <div className={cn('card-header', className)}>{children}</div>;
}

export function CardBody({ className, children }: CardProps) {
  return <div className={cn('card-body', className)}>{children}</div>;
}
