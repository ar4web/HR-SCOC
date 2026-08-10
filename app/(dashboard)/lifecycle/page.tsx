import dynamic from 'next/dynamic';

const LifecycleContent = dynamic(
  () => import('@/components/lifecycle/LifecycleContent').then((m) => m.LifecycleContent),
  { ssr: false }
);

export default function LifecyclePage() {
  return <LifecycleContent />;
}