'use client';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const ReportsContent = dynamic(
  () => import('@/components/reports/ReportsContent').then(m => m.ReportsContent),
  { ssr: false, loading: () => <div className="animate-pulse h-64 bg-gray-100 rounded" /> }
);

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-gray-100 rounded" />}>
      <ReportsContent />
    </Suspense>
  );
}
