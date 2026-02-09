import { createClient } from '@/lib/supabase/server';
import { apiCache } from '@/lib/cache';
import { getExecutiveKPIs, type ExecutiveKPIs } from '@/lib/services/analyticsService';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient(await cookies());

  const cacheKey = 'analytics:executive';
  const cached = apiCache.get<ExecutiveKPIs>(cacheKey);
  if (cached) {
    return NextResponse.json({ data: cached });
  }

  try {
    const data = await getExecutiveKPIs(supabase);
    apiCache.set(cacheKey, data, 600); // 10 min cache
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar KPIs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
