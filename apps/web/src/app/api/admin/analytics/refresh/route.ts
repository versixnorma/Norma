import { withAdminAuth } from '@/lib/api-helpers';
import { apiCache } from '@/lib/cache';
import { NextResponse } from 'next/server';

export const POST = withAdminAuth(async ({ admin }) => {
  try {
    const { error } = await admin.rpc('refresh_analytics_views' as never);

    if (error) throw error;

    // Invalidate all analytics caches
    apiCache.invalidatePrefix('analytics:');

    return NextResponse.json({ success: true, refreshedAt: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar views';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
