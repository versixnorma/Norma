'use client';

import dynamic from 'next/dynamic';

const NormaAIDashboard = dynamic(
  () =>
    import('@/components/admin/norma-ai/NormaAIDashboard').then((mod) => ({
      default: mod.NormaAIDashboard,
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

export default function AdminNormaAIPage() {
  return <NormaAIDashboard />;
}
