'use client';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const RemindersContent = dynamic(
  () => import('@/components/reminders/RemindersContent').then((m) => m.RemindersContent),
  { ssr: false, loading: () => <div className="animate-pulse h-64 bg-gray-100 rounded" /> }
);

export default function RemindersPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-gray-100 rounded" />}>
      <RemindersContent />
    </Suspense>
  );
}