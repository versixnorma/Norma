import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Helper to resolve params that might be a Promise (Next types vary)
async function resolveParams(params: unknown): Promise<{ id?: string } | undefined> {
  return await Promise.resolve(params as { id?: string } | undefined);
}

export async function PUT(request: NextRequest, context: { params: unknown }) {
  const supabase = createClient(await cookies());
  const payload = (await request.json()) as Record<string, unknown>;
  const params = await resolveParams(context.params);
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { data, error } = await supabase
    .from('marketplace_partners')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ data });
}

export async function DELETE(_request: NextRequest, context: { params: unknown }) {
  const supabase = createClient(await cookies());
  const params = await resolveParams(context.params);
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabase.from('marketplace_partners').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
