import { withAdminAuth } from '@/lib/api-helpers';
import { apiCache } from '@/lib/cache';
import {
  getCohortData,
  type AnalyticsFilters,
  type CohortRow,
} from '@/lib/services/analyticsService';
import { NextResponse } from 'next/server';

export const GET = withAdminAuth(async ({ admin }, request) => {
  const { searchParams } = new URL(request.url);

  const filters: AnalyticsFilters = {
    timeRange: (searchParams.get('timeRange') as AnalyticsFilters['timeRange']) || '90d',
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
  };

  const cacheKey = `analytics:cohort:${filters.timeRange}`;
  const cached = apiCache.get<CohortRow[]>(cacheKey);
  if (cached) {
    return NextResponse.json({ data: cached });
  }

  try {
    const data = await getCohortData(admin, filters);
    apiCache.set(cacheKey, data, 900); // 15 min cache
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar cohort';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
