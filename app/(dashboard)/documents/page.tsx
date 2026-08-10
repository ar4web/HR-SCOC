'use client';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const DocumentsContent = dynamic(
  () => import('@/components/documents/DocumentsContent').then(m => m.DocumentsContent),
  { ssr: false, loading: () => <div className="animate-pulse h-64 bg-gray-100 rounded" /> }
);

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-gray-100 rounded" />}>
      <DocumentsContent />
    </Suspense>
  );
}