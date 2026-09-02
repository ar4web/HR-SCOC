'use client';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const InvoicingContent = dynamic(
  () => import('@/components/invoicing/InvoicingContent').then(m => m.InvoicingContent),
  { ssr: false, loading: () => <div className="animate-pulse h-64 bg-gray-100 rounded" /> }
);

export default function InvoicingPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-gray-100 rounded" />}>
      <InvoicingContent />
    </Suspense>
  );
}
