import { createClient } from '@/lib/supabase/server';
import { apiCache } from '@/lib/cache';
import {
  getUnifiedMetrics,
  type AnalyticsFilters,
  type UnifiedMetrics,
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
    condominioIds: searchParams.get('condominioIds')?.split(',').filter(Boolean) || undefined,
  };

  const cacheKey = `analytics:unified:${JSON.stringify(filters)}`;
  const cached = apiCache.get<UnifiedMetrics>(cacheKey);
  if (cached) {
    return NextResponse.json({ data: cached });
  }

  try {
    const data = await getUnifiedMetrics(supabase, filters);
    apiCache.set(cacheKey, data, 300); // 5 min cache
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar métricas';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
