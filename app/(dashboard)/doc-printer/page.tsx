'use client';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const DocPrinterContent = dynamic(
  () => import('@/components/doc-printer/DocPrinterContent').then(m => m.DocPrinterContent),
  { ssr: false, loading: () => <div className="animate-pulse h-64 bg-gray-100 rounded" /> }
);

export default function DocPrinterPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-gray-100 rounded" />}>
      <DocPrinterContent />
    </Suspense>
  );
}
