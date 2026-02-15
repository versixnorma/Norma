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

  let { data, error } = await admin
    .from('unidades_habitacionais')
    .select(
      `
      id,
      bloco_id,
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

  // Auto-healing para condomínios legados sem unidades cadastradas.
  if (!data || data.length === 0) {
    const { data: condominio } = await admin
      .from('condominios')
      .select('total_unidades')
      .eq('id', condominioId)
      .maybeSingle();

    const totalUnidades = Number(condominio?.total_unidades || 0);
    if (totalUnidades > 0) {
      const { data: bloco } = await admin
        .from('blocos')
        .select('id')
        .eq('condominio_id', condominioId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      let blocoId = bloco?.id as string | undefined;
      if (!blocoId) {
        const { data: novoBloco } = await admin
          .from('blocos')
          .insert({
            condominio_id: condominioId,
            nome: 'Bloco Único',
          } as any)
          .select('id')
          .single();
        blocoId = novoBloco?.id;
      }

      if (blocoId) {
        const novasUnidades = Array.from({ length: totalUnidades }, (_, idx) => ({
          condominio_id: condominioId,
          bloco_id: blocoId,
          numero: String(idx + 1),
          tipo: 'apartamento',
          ativo: true,
        }));
        await admin.from('unidades_habitacionais').insert(novasUnidades as any);

        const refreshed = await admin
          .from('unidades_habitacionais')
          .select(
            `
            id,
            bloco_id,
            numero,
            bloco:bloco_id (
              nome
            )
          `
          )
          .eq('condominio_id', condominioId)
          .eq('ativo', true)
          .order('numero', { ascending: true });

        data = refreshed.data || [];
      }
    }
  }

  const formatted = (data || []).map((u: any) => ({
    id: u.id,
    numero: u.numero,
    bloco_id: u.bloco_id || null,
    bloco_nome: u.bloco?.nome || null,
  }));

  return NextResponse.json(formatted);
}
