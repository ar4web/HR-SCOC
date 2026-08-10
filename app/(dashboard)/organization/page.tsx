import dynamic from 'next/dynamic';

const OrgChartContent = dynamic(() => import('@/components/org-chart/OrgChartContent'), {
  ssr: false,
  loading: () => (
    <p className="text-sm text-gray-500">Loading organization chart...</p>
  ),
});

export default function OrgChartPage() {
  return <OrgChartContent />;
}