import { withAdminAuth } from '@/lib/api-helpers';
import { documentUploadSchema } from '@/lib/schemas/api';
import { NextResponse } from 'next/server';

interface DocumentRow {
  id: string;
  name: string;
  type: string;
  source_type: string;
  category: string | null;
  tags: string[] | null;
  status: string;
  file_url: string | null;
  created_by: string;
  created_at: string;
  processed_at: string | null;
  document_chunks?: { count: number }[];
}

export const GET = withAdminAuth(async ({ admin }, request) => {
  const { searchParams } = new URL(request.url);

  const sourceType = searchParams.get('source_type');
  const category = searchParams.get('category');
  const status = searchParams.get('status');

  let query = admin
    .from('documents')
    .select('*, document_chunks(count)')
    .order('created_at', { ascending: false });

  if (sourceType) query = query.eq('source_type', sourceType);
  if (category) query = query.eq('category', category);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Map chunk count from nested relation
  const documents = ((data || []) as unknown as DocumentRow[]).map((doc) => ({
    ...doc,
    chunk_count: doc.document_chunks?.[0]?.count ?? 0,
    document_chunks: undefined,
  }));

  return NextResponse.json({ data: documents });
});

export const POST = withAdminAuth(async ({ admin }, request) => {
  const body = await request.json();
  const parsed = documentUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const payload = parsed.data;

  const { data, error } = await admin.functions.invoke('process-manual-knowledge', {
    body: payload,
  });

  if (error) {
    return NextResponse.json({ error: error.message || 'Falha ao processar' }, { status: 500 });
  }

  return NextResponse.json(data);
});
