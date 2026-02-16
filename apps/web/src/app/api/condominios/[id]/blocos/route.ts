import { createAdminClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/condominios/[id]/blocos
 * Lista pública de blocos/ruas de um condomínio para fluxo de cadastro.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: condominioId } = await params;
  if (!condominioId) {
    return NextResponse.json({ error: 'Condomínio inválido' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('blocos')
    .select('id, nome')
    .eq('condominio_id', condominioId)
    .order('nome', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
