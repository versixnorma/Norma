import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createClient(await cookies());
  const { searchParams } = new URL(request.url);

  const sourceType = searchParams.get('source_type');
  const category = searchParams.get('category');
  const status = searchParams.get('status');

  let query = supabase
    .from('documents' as any)
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
  const documents = (data || []).map((doc: any) => ({
    ...doc,
    chunk_count: doc.document_chunks?.[0]?.count ?? 0,
    document_chunks: undefined,
  }));

  return NextResponse.json({ data: documents });
}

export async function POST(request: Request) {
  const supabase = createClient(await cookies());
  const payload = await request.json();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  // Call edge function for manual knowledge processing
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-manual-knowledge`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      { error: result.error || 'Falha ao processar' },
      { status: response.status }
    );
  }

  return NextResponse.json(result);
}
