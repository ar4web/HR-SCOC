'use client';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const PayrollContent = dynamic(
  () => import('@/components/payroll/PayrollContent').then(m => m.PayrollContent),
  { ssr: false, loading: () => <div className="animate-pulse h-64 bg-gray-100 rounded" /> }
);

export default function PayrollPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-gray-100 rounded" />}>
      <PayrollContent />
    </Suspense>
  );
}
