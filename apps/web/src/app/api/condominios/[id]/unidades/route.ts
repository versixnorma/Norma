import { createAdminClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

type UnidadeRow = {
  id: string;
  bloco_id: string | null;
  numero: string;
  bloco?: { nome?: string | null } | null;
};

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

  const { data: initialData, error } = await admin
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
  let data = (initialData || []) as UnidadeRow[];

  // Auto-healing:
  // Se houver unidades apontando para blocos inexistentes, reatribui para blocos válidos
  // para evitar exibir "bloco fantasma" no cadastro.
  if (data.length > 0) {
    const { data: blocos } = await admin
      .from('blocos')
      .select('id')
      .eq('condominio_id', condominioId)
      .order('created_at', { ascending: true });

    const blocoIds = (blocos || []).map((b) => b.id);
    if (blocoIds.length > 0) {
      const validBlocos = new Set(blocoIds);
      const unidadesOrfas = data.filter((u) => !u.bloco_id || !validBlocos.has(u.bloco_id));

      if (unidadesOrfas.length > 0) {
        await Promise.all(
          unidadesOrfas.map((u, idx) =>
            admin
              .from('unidades_habitacionais')
              .update({ bloco_id: blocoIds[idx % blocoIds.length] })
              .eq('id', u.id)
          )
        );

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

        data = (refreshed.data || []) as UnidadeRow[];
      }
    }
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
          })
          .select('id')
          .single();
        blocoId = novoBloco?.id;
      }

      if (blocoId) {
        const novasUnidades: Array<{
          condominio_id: string;
          bloco_id: string;
          numero: string;
          tipo: string;
          ativo: boolean;
        }> = Array.from({ length: totalUnidades }, (_, idx) => ({
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

        data = (refreshed.data || []) as UnidadeRow[];
      }
    }
  }

  const formatted = (data || []).map((u) => ({
    id: u.id,
    numero: u.numero,
    bloco_id: u.bloco_id || null,
    bloco_nome: u.bloco?.nome || null,
  }));

  return NextResponse.json(formatted);
}
