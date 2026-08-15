'use client';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const ContractsContent = dynamic(
  () => import('@/components/contracts/ContractsContent').then(m => m.ContractsContent),
  { ssr: false, loading: () => <div className="animate-pulse h-64 bg-gray-100 rounded" /> }
);

export default function ContractsPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-gray-100 rounded" />}>
      <ContractsContent />
    </Suspense>
  );
}