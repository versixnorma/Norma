import { withAdminAuth } from '@/lib/api-helpers';
import { apiCache } from '@/lib/cache';
import {
  getRetentionData,
  type AnalyticsFilters,
  type RetentionPoint,
} from '@/lib/services/analyticsService';
import { NextResponse } from 'next/server';

export const GET = withAdminAuth(async ({ admin }, request) => {
  const { searchParams } = new URL(request.url);

  const filters: AnalyticsFilters = {
    timeRange: (searchParams.get('timeRange') as AnalyticsFilters['timeRange']) || '90d',
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
  };

  const cacheKey = `analytics:retention:${filters.timeRange}`;
  const cached = apiCache.get<RetentionPoint[]>(cacheKey);
  if (cached) {
    return NextResponse.json({ data: cached });
  }

  try {
    const data = await getRetentionData(admin, filters);
    apiCache.set(cacheKey, data, 900);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar retenção';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
