import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

async function resolveParams(params: Promise<Record<string, string>>) {
  return await Promise.resolve(params);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const supabase = createClient(await cookies());
  const payload = await request.json();
  const params = await resolveParams(context.params);
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { data, error } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types
    .from('documents' as any)
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ data });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const supabase = createClient(await cookies());
  const params = await resolveParams(context.params);
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  await supabase
    .from('document_chunks' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .delete()
    .eq('document_id', id);

  const { error } = await supabase
    .from('documents' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
