'use client';

import dynamic from 'next/dynamic';

const ExecutiveDashboard = dynamic(
  () =>
    import('@/components/admin/analytics/ExecutiveDashboard').then((mod) => ({
      default: mod.ExecutiveDashboard,
    })),
  {
    loading: () => (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    ),
    ssr: false,
  }
);

export default function AdminAnalyticsPage() {
  return <ExecutiveDashboard />;
}
