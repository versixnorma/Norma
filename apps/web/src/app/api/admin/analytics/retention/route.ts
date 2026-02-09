import { createClient } from '@/lib/supabase/server';
import { apiCache } from '@/lib/cache';
import {
  getRetentionData,
  type AnalyticsFilters,
  type RetentionPoint,
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

  const cacheKey = `analytics:retention:${filters.timeRange}`;
  const cached = apiCache.get<RetentionPoint[]>(cacheKey);
  if (cached) {
    return NextResponse.json({ data: cached });
  }

  try {
    const data = await getRetentionData(supabase, filters);
    apiCache.set(cacheKey, data, 900);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar retenção';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
