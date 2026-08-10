'use client';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const DashboardContent = dynamic(
  () => import('@/components/dashboard/DashboardContent').then(m => m.DashboardContent),
  { ssr: false, loading: () => <div className="animate-pulse h-64 bg-gray-100 rounded" /> }
);

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-gray-100 rounded" />}>
      <DashboardContent />
    </Suspense>
  );
}