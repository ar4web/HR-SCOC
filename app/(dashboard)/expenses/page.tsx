'use client';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const ExpensesContent = dynamic(
  () => import('@/components/expenses/ExpensesContent').then(m => m.ExpensesContent),
  { ssr: false, loading: () => <div className="animate-pulse h-64 bg-gray-100 rounded" /> }
);

export default function ExpensesPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-gray-100 rounded" />}>
      <ExpensesContent />
    </Suspense>
  );
}