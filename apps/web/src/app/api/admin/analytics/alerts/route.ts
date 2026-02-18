import { withAdminAuth } from '@/lib/api-helpers';
import { apiCache } from '@/lib/cache';
import { buildExecutiveAlerts, type ExecutiveAlert } from '@/lib/services/analyticsAlerts';
import { getExecutiveKPIs, getUnifiedMetrics, type AnalyticsFilters } from '@/lib/services/analyticsService';
import { NextResponse } from 'next/server';

export const GET = withAdminAuth(async ({ admin }, request) => {
  const { searchParams } = new URL(request.url);
  const timeRange = (searchParams.get('timeRange') as AnalyticsFilters['timeRange']) || '30d';
  const cacheKey = `analytics:alerts:${timeRange}`;

  try {
    const data = await apiCache.getOrSet<ExecutiveAlert[]>(cacheKey, 120, async () => {
      const [kpis, unified] = await Promise.all([
        getExecutiveKPIs(admin),
        getUnifiedMetrics(admin, { timeRange }),
      ]);
      return buildExecutiveAlerts(kpis, unified.condominioHealth);
    });

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao gerar alertas';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
