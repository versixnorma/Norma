import { withAdminAuth } from '@/lib/api-helpers';
import { apiCache } from '@/lib/cache';
import {
  getUnifiedMetrics,
  type AnalyticsFilters,
  type UnifiedMetrics,
} from '@/lib/services/analyticsService';
import { NextResponse } from 'next/server';

export const GET = withAdminAuth(async ({ admin }, request) => {
  const { searchParams } = new URL(request.url);

  const filters: AnalyticsFilters = {
    timeRange: (searchParams.get('timeRange') as AnalyticsFilters['timeRange']) || '30d',
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
    condominioIds: searchParams.get('condominioIds')?.split(',').filter(Boolean) || undefined,
  };

  const cacheKey = `analytics:unified:${JSON.stringify(filters)}`;
  const cached = apiCache.get<UnifiedMetrics>(cacheKey);
  if (cached) {
    return NextResponse.json({ data: cached });
  }

  try {
    const data = await getUnifiedMetrics(admin, filters);
    apiCache.set(cacheKey, data, 300); // 5 min cache
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar métricas';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
