import { withAdminAuth } from '@/lib/api-helpers';
import { apiCache } from '@/lib/cache';
import { getExecutiveKPIs, type ExecutiveKPIs } from '@/lib/services/analyticsService';
import { NextResponse } from 'next/server';

export const GET = withAdminAuth(async ({ admin }) => {

  const cacheKey = 'analytics:executive';
  const cached = apiCache.get<ExecutiveKPIs>(cacheKey);
  if (cached) {
    return NextResponse.json({ data: cached });
  }

  try {
    const data = await getExecutiveKPIs(admin);
    apiCache.set(cacheKey, data, 600); // 10 min cache
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar KPIs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
