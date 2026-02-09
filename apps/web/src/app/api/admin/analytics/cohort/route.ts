import { createClient } from '@/lib/supabase/server';
import { apiCache } from '@/lib/cache';
import {
  getCohortData,
  type AnalyticsFilters,
  type CohortRow,
} from '@/lib/services/analyticsService';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createClient(await cookies());
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
    const data = await getCohortData(supabase, filters);
    apiCache.set(cacheKey, data, 900); // 15 min cache
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar cohort';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
