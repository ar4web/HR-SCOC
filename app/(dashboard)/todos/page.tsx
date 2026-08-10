'use client';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const TodosContent = dynamic(
  () => import('@/components/todos/TodosContent').then(m => m.TodosContent),
  { ssr: false, loading: () => <div className="animate-pulse h-64 bg-gray-100 rounded" /> }
);

export default function TodosPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-gray-100 rounded" />}>
      <TodosContent />
    </Suspense>
  );
}