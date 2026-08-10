import dynamic from 'next/dynamic';

const PortalContent = dynamic(
  () => import('@/components/portal/PortalContent').then((m) => m.PortalContent),
  { ssr: false }
);

export default function MePage() {
  return <PortalContent />;
}