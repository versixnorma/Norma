import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

interface ChatLogRow {
  id: string;
  condominio_id: string;
  user_id: string;
  message: string;
  response: string;
  sources: unknown;
  created_at: string;
  usuarios?: { nome: string };
  condominios?: { nome: string };
}

export async function GET(request: Request) {
  const supabase = createClient(await cookies());
  const { searchParams } = new URL(request.url);

  const condominioId = searchParams.get('condominio_id');
  const limit = parseInt(searchParams.get('limit') || '50');

  let query = supabase
    .from('norma_chat_logs')
    .select(
      '*, usuarios!norma_chat_logs_user_id_fkey(nome), condominios!norma_chat_logs_condominio_id_fkey(nome)'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (condominioId) {
    query = query.eq('condominio_id', condominioId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const conversations = ((data || []) as unknown as ChatLogRow[]).map((row) => ({
    id: row.id,
    condominio_id: row.condominio_id,
    condominio_nome: row.condominios?.nome || '',
    user_id: row.user_id,
    usuario_nome: row.usuarios?.nome || '',
    message: row.message,
    response: row.response,
    sources: row.sources,
    created_at: row.created_at,
  }));

  return NextResponse.json({ data: conversations });
}
