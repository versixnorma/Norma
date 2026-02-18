import { withAdminAuth } from '@/lib/api-helpers';
import { apiCache } from '@/lib/cache';
import {
  getFunnelData,
  type AnalyticsFilters,
  type FunnelStep,
} from '@/lib/services/analyticsService';
import { NextResponse } from 'next/server';

export const GET = withAdminAuth(async ({ admin }, request) => {
  const { searchParams } = new URL(request.url);

  const filters: AnalyticsFilters = {
    timeRange: (searchParams.get('timeRange') as AnalyticsFilters['timeRange']) || '30d',
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
  };

  const cacheKey = `analytics:funnel:${filters.timeRange}:${filters.startDate}:${filters.endDate}`;
  const cached = apiCache.get<FunnelStep[]>(cacheKey);
  if (cached) {
    return NextResponse.json({ data: cached });
  }

  try {
    const data = await getFunnelData(admin, filters);
    apiCache.set(cacheKey, data, 600);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar funil';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
