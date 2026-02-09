import { createClient } from '@/lib/supabase/server';
import { apiCache } from '@/lib/cache';
import {
  getFunnelData,
  type AnalyticsFilters,
  type FunnelStep,
} from '@/lib/services/analyticsService';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createClient(await cookies());
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
    const data = await getFunnelData(supabase, filters);
    apiCache.set(cacheKey, data, 600);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar funil';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
