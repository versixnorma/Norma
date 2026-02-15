import { createAdminClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/condominios/[id]/unidades
 * Lista pública de unidades habitacionais ativas por condomínio para signup.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: condominioId } = await params;
  if (!condominioId) {
    return NextResponse.json({ error: 'Condomínio inválido' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('unidades_habitacionais')
    .select(
      `
      id,
      numero,
      bloco:bloco_id (
        nome
      )
    `
    )
    .eq('condominio_id', condominioId)
    .eq('ativo', true)
    .order('numero', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const formatted = (data || []).map((u: any) => ({
    id: u.id,
    numero: u.numero,
    bloco_nome: u.bloco?.nome || null,
  }));

  return NextResponse.json(formatted);
}
