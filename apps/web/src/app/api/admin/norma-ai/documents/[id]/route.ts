import { withAdminAuth } from '@/lib/api-helpers';
import { normaDocumentUpdateSchema } from '@/lib/schemas/norma-ai';
import { NextRequest, NextResponse } from 'next/server';

async function resolveParams(params: Promise<Record<string, string>>) {
  return await Promise.resolve(params);
}

export const PUT = withAdminAuth(async (
  { admin },
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) => {
  const body = await request.json();
  const parsed = normaDocumentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const params = await resolveParams(context.params);
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { data, error } = await admin
    .from('documents')
    .update(parsed.data)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ data });
});

export const DELETE = withAdminAuth(async (
  { admin },
  _request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) => {
  const params = await resolveParams(context.params);
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  await admin
    .from('document_chunks')
    .delete()
    .eq('document_id', id);

  const { error } = await admin
    .from('documents')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
});
