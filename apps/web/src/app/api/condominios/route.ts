import { createAdminClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

/**
 * GET /api/condominios
 * Lista pública de condomínios (id + nome) para uso no signup.
 * Usa service role para bypass RLS - retorna apenas campos públicos.
 */
export async function GET() {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('condominios')
    .select('id, nome')
    .order('nome', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
