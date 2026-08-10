'use client';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const NotificationsContent = dynamic(
  () => import('@/components/notifications/NotificationsContent').then((m) => m.NotificationsContent),
  { ssr: false, loading: () => <div className="animate-pulse h-64 bg-gray-100 rounded" /> }
);

export default function NotificationsPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-gray-100 rounded" />}>
      <NotificationsContent />
    </Suspense>
  );
}