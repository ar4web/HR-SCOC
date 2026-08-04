'use client';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const CommunicationContent = dynamic(
  () => import('@/components/communication/CommunicationContent').then(m => m.CommunicationContent),
  { ssr: false, loading: () => <div className="animate-pulse h-64 bg-gray-100 rounded" /> }
);

export default function CommunicationPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-gray-100 rounded" />}>
      <CommunicationContent />
    </Suspense>
  );
}
