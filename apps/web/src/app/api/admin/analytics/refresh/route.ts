import { createClient } from '@/lib/supabase/server';
import { apiCache } from '@/lib/cache';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = createClient(await cookies());

  try {
    const { error } = await supabase.rpc('refresh_analytics_views' as never);

    if (error) throw error;

    // Invalidate all analytics caches
    apiCache.invalidate('analytics:.*');

    return NextResponse.json({ success: true, refreshedAt: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar views';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
