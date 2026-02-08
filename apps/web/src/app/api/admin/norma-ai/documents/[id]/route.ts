import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

async function resolveParams(params: any) {
  return await Promise.resolve(params);
}

export async function PUT(request: NextRequest, context: { params: any }) {
  const supabase = createClient(await cookies());
  const payload = await request.json();
  const params = await resolveParams(context.params);
  const id = params?.id;

  const { data, error } = await supabase
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

export async function DELETE(_request: NextRequest, context: { params: any }) {
  const supabase = createClient(await cookies());
  const params = await resolveParams(context.params);
  const id = params?.id;

  // Delete chunks first (in case no CASCADE)
  await supabase
    .from('document_chunks' as any)
    .delete()
    .eq('document_id', id);

  // Delete document
  const { error } = await supabase
    .from('documents' as any)
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
