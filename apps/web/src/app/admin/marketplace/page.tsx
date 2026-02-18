import dynamic from 'next/dynamic';

const MarketplaceDashboard = dynamic(
  () =>
    import('@/components/admin/marketplace/MarketplaceDashboard').then(
      (mod) => ({ default: mod.MarketplaceDashboard })
    ),
  {
    loading: () => (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    ),
    ssr: false,
  }
);

export default function AdminMarketplacePage() {
  return <MarketplaceDashboard />;
}
