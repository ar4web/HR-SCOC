'use client';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const EmailContent = dynamic(
  () => import('@/components/email/EmailContent').then(m => m.EmailContent),
  { ssr: false, loading: () => <div className="animate-pulse h-64 bg-gray-100 rounded" /> }
);

export default function EmailPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-gray-100 rounded" />}>
      <EmailContent />
    </Suspense>
  );
}