import { createAdminClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

type BlocoRow = { id: string; nome: string };
type UnidadeAtivaRow = { id: string; bloco_id: string | null; numero: string | number | null };
type CondominioListRow = {
  id: string;
  nome: string;
  cnpj: string | null;
  endereco: string | null;
  created_at: string;
};
type UsuarioCondominioRow = {
  condominio_id: string;
  role: string;
  usuario: { id: string; nome: string } | null;
};
type BlocoComUnidadesRow = {
  condominio_id: string;
  unidades_habitacionais?: Array<{ id: string }> | null;
};

async function verifySuperadmin() {
  const authClient = createClient(await cookies());
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const admin = createAdminClient();
  const { data: usuario } = await admin
    .from('usuarios')
    .select('id, role')
    .eq('auth_id', user.id)
    .single();

  if (!usuario || usuario.role !== 'superadmin') {
    return {
      error: NextResponse.json({ error: 'Forbidden - requer superadmin' }, { status: 403 }),
    };
  }

  return { admin, usuario };
}

function parseBlockNames(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .map((item) => String(item).trim())
      .filter((name, idx, arr) => name.length > 0 && arr.indexOf(name) === idx);
  }
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((part) => part.trim())
      .filter((name, idx, arr) => name.length > 0 && arr.indexOf(name) === idx);
  }
  return [];
}

/**
 * Garante que o condomínio tenha unidades suficientes para o signup.
 * Estratégia:
 * - Cria blocos/ruas informados (ou "Bloco Único" por fallback).
 * - Gera unidades faltantes distribuindo por blocos sem duplicar (bloco_id, numero).
 */
async function ensureCondominioUnits(
  admin: ReturnType<typeof createAdminClient>,
  condominioId: string,
  totalUnidades: number,
  blockNames: string[] = []
) {
  if (!Number.isFinite(totalUnidades) || totalUnidades <= 0) return;

  const { data: blocosExistentes } = await admin
    .from('blocos')
    .select('id, nome')
    .eq('condominio_id', condominioId)
    .order('created_at', { ascending: true });

  const blocosByName = new Map<string, BlocoRow>();
  for (const bloco of blocosExistentes || []) {
    blocosByName.set(String(bloco.nome).trim().toLowerCase(), {
      id: bloco.id,
      nome: bloco.nome,
    });
  }

  const existingNames = (blocosExistentes || [])
    .map((bloco) => String(bloco.nome).trim())
    .filter((name, idx, arr) => name.length > 0 && arr.indexOf(name) === idx);
  const desiredNames =
    blockNames.length > 0 ? blockNames : existingNames.length > 0 ? existingNames : ['Bloco Único'];
  const orderedBlocos: BlocoRow[] = [];

  for (const name of desiredNames) {
    const key = name.trim().toLowerCase();
    const existing = blocosByName.get(key);
    if (existing) {
      orderedBlocos.push(existing);
      continue;
    }

    const { data: novoBloco, error: blocoError } = await admin
      .from('blocos')
      .insert({
        condominio_id: condominioId,
        nome: name,
      })
      .select('id, nome')
      .single();

    if (blocoError || !novoBloco?.id) {
      console.error('Erro ao criar bloco:', blocoError);
      continue;
    }

    const created = { id: novoBloco.id, nome: novoBloco.nome };
    blocosByName.set(key, created);
    orderedBlocos.push(created);
  }

  if (orderedBlocos.length === 0) {
    const fallback = Array.from(blocosByName.values())[0];
    if (fallback) orderedBlocos.push(fallback);
  }

  if (orderedBlocos.length === 0) return;

  const { data: unidadesExistentes } = await admin
    .from('unidades_habitacionais')
    .select('id, bloco_id, numero')
    .eq('condominio_id', condominioId)
    .eq('ativo', true);

  let unidadesAtivas = (unidadesExistentes || []) as UnidadeAtivaRow[];

  // Auto-healing:
  // Se houver configuração explícita de blocos e unidades vinculadas a blocos inexistentes,
  // reatribui para os blocos configurados em round-robin para evitar "blocos fantasmas".
  if (blockNames.length > 0 && unidadesAtivas.length > 0) {
    const desiredBlocoIds = new Set(orderedBlocos.map((b) => b.id));
    const unidadesOrfas = unidadesAtivas.filter((u) => !u.bloco_id || !desiredBlocoIds.has(u.bloco_id));

    if (unidadesOrfas.length > 0) {
      await Promise.all(
        unidadesOrfas.map((u, idx) =>
          admin
            .from('unidades_habitacionais')
            .update({ bloco_id: orderedBlocos[idx % orderedBlocos.length].id })
            .eq('id', u.id)
        )
      );

      const { data: healedUnits } = await admin
        .from('unidades_habitacionais')
        .select('id, bloco_id, numero')
        .eq('condominio_id', condominioId)
        .eq('ativo', true);

      unidadesAtivas = (healedUnits || []) as UnidadeAtivaRow[];
    }
  }

  const existingCount = unidadesAtivas.length;
  if (existingCount >= totalUnidades) return;

  const nextNumberByBloco = new Map<string, number>();
  for (const bloco of orderedBlocos) {
    const maxNumero = unidadesAtivas
      .filter((u) => u.bloco_id === bloco.id)
      .map((u) => Number(u.numero))
      .filter((n: number) => Number.isFinite(n))
      .reduce((max: number, n: number) => Math.max(max, n), 0);
    nextNumberByBloco.set(bloco.id, maxNumero + 1);
  }

  const missing = totalUnidades - existingCount;
  const novasUnidades: Database['public']['Tables']['unidades_habitacionais']['Insert'][] = [];
  for (let i = 0; i < missing; i += 1) {
    const bloco = orderedBlocos[i % orderedBlocos.length];
    const numero = String(nextNumberByBloco.get(bloco.id) || 1);
    nextNumberByBloco.set(bloco.id, Number(numero) + 1);
    novasUnidades.push({
      condominio_id: condominioId,
      bloco_id: bloco.id,
      numero,
      tipo: 'apartamento',
      ativo: true,
    });
  }

  if (novasUnidades.length > 0) {
    const { error: unidadesError } = await admin
      .from('unidades_habitacionais')
      .insert(novasUnidades);
    if (unidadesError) {
      console.error('Erro ao criar unidades automáticas:', unidadesError);
    }
  }
}

// GET - List condominios
export async function GET() {
  const result = await verifySuperadmin();
  if ('error' in result) return result.error;
  const { admin } = result;

  // Fetch condominios with related data
  const { data: condominios, error } = await admin
    .from('condominios')
    .select(
      `
      id,
      nome,
      cnpj,
      endereco,
      created_at
    `
    )
    .order('nome');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // For each condominio, get user count and sindico
  const condominioRows = (condominios || []) as CondominioListRow[];
  const condominioIds = condominioRows.map((c) => c.id);

  // Get users per condominio via usuario_condominios
  const { data: ucData } = await admin
    .from('usuario_condominios')
    .select('condominio_id, role, usuario:usuario_id (id, nome)')
    .in('condominio_id', condominioIds.length > 0 ? condominioIds : ['__none__']);

  // Get unit counts via blocos -> unidades_habitacionais
  const { data: blocos } = await admin
    .from('blocos')
    .select('condominio_id, unidades_habitacionais (id)')
    .in('condominio_id', condominioIds.length > 0 ? condominioIds : ['__none__']);

  // Build lookup maps
  const userCountMap: Record<string, number> = {};
  const sindicoMap: Record<string, string | null> = {};
  for (const uc of (ucData || []) as UsuarioCondominioRow[]) {
    const cid = uc.condominio_id;
    userCountMap[cid] = (userCountMap[cid] || 0) + 1;
    if (uc.role === 'sindico' && uc.usuario) {
      sindicoMap[cid] = uc.usuario.nome || null;
    }
  }

  const unitCountMap: Record<string, number> = {};
  for (const bloco of (blocos || []) as BlocoComUnidadesRow[]) {
    const cid = bloco.condominio_id;
    unitCountMap[cid] = (unitCountMap[cid] || 0) + (bloco.unidades_habitacionais?.length || 0);
  }

  const formatted = condominioRows.map((c) => ({
    id: c.id,
    nome: c.nome,
    slug: c.cnpj || c.id,
    endereco: c.endereco || '',
    status: 'ativo',
    created_at: c.created_at,
    total_usuarios: userCountMap[c.id] || 0,
    total_unidades: unitCountMap[c.id] || 0,
    sindico_nome: sindicoMap[c.id] || null,
  }));

  return NextResponse.json({ data: formatted });
}

// POST - Create condominio
export async function POST(request: NextRequest) {
  const result = await verifySuperadmin();
  if ('error' in result) return result.error;
  const { admin } = result;

  const body = await request.json();
  const { blocos_ruas, ...insertPayload } = body as Record<string, unknown>;
  const { data, error } = await admin
    .from('condominios')
    .insert(insertPayload as any)
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const totalUnidades = Number((insertPayload as { total_unidades?: number }).total_unidades || 0);
  await ensureCondominioUnits(admin, data.id, totalUnidades, parseBlockNames(blocos_ruas));

  return NextResponse.json({ data: { id: data.id } }, { status: 201 });
}

// PUT - Update condominio
export async function PUT(request: NextRequest) {
  const result = await verifySuperadmin();
  if ('error' in result) return result.error;
  const { admin } = result;

  const body = await request.json();
  const { id, blocos_ruas, ...updates } = body as {
    id: string;
    blocos_ruas?: unknown;
    [key: string]: unknown;
  };

  if (!id) {
    return NextResponse.json({ error: 'ID do condominio e obrigatorio' }, { status: 400 });
  }

  const { error } = await admin.from('condominios').update(updates).eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (updates.total_unidades !== undefined || blocos_ruas !== undefined) {
    const { data: condominioAtual } = await admin
      .from('condominios')
      .select('total_unidades')
      .eq('id', id)
      .maybeSingle();

    const totalUnidades = Number(
      (updates.total_unidades as number | undefined) ?? condominioAtual?.total_unidades ?? 0
    );
    await ensureCondominioUnits(admin, id, totalUnidades, parseBlockNames(blocos_ruas));
  }

  return NextResponse.json({ data: { id } });
}
