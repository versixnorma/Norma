import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Support both synchronous and promise-based context.params (Next types may vary)
async function resolveParams(params: unknown): Promise<{ id?: string } | undefined> {
  return await Promise.resolve(params as { id?: string } | undefined);
}

export async function PUT(request: NextRequest, context: { params: unknown }) {
  const supabase = createClient(await cookies());
  const payload = (await request.json()) as Record<string, unknown>;
  const params = await resolveParams(context.params);
  const id = params?.id;

  const { data, error } = await supabase
    .from('marketplace_discounts')
    .update(payload)
    .eq('id', id)
    .select(
      `
      *,
      partner:partner_id (id, name, category)
    `
    )
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

  const { error } = await supabase.from('marketplace_discounts').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
