import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Helper to resolve params that might be a Promise (Next types vary)
async function resolveParams(params: any) {
  return await Promise.resolve(params);
}

export async function PUT(request: NextRequest, context: { params: any }) {
  const supabase = createClient(await cookies());
  const payload = await request.json();
  const params = await resolveParams(context.params);
  const id = params?.id;

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

export async function DELETE(_request: NextRequest, context: { params: any }) {
  const supabase = createClient(await cookies());
  const params = await resolveParams(context.params);
  const id = params?.id;

  const { error } = await supabase.from('marketplace_partners').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
