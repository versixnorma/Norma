import { createAdminClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

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

  const blocosByName = new Map<string, { id: string; nome: string }>();
  for (const bloco of blocosExistentes || []) {
    blocosByName.set(String(bloco.nome).trim().toLowerCase(), {
      id: bloco.id,
      nome: bloco.nome,
    });
  }

  const desiredNames = blockNames.length > 0 ? blockNames : ['Bloco Único'];
  const orderedBlocos: Array<{ id: string; nome: string }> = [];

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
      } as any)
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

  const unidadesAtivas = unidadesExistentes || [];
  const existingCount = unidadesAtivas.length;
  if (existingCount >= totalUnidades) return;

  const nextNumberByBloco = new Map<string, number>();
  for (const bloco of orderedBlocos) {
    const maxNumero = unidadesAtivas
      .filter((u: any) => u.bloco_id === bloco.id)
      .map((u: any) => Number(u.numero))
      .filter((n: number) => Number.isFinite(n))
      .reduce((max: number, n: number) => Math.max(max, n), 0);
    nextNumberByBloco.set(bloco.id, maxNumero + 1);
  }

  const missing = totalUnidades - existingCount;
  const novasUnidades: Array<Record<string, unknown>> = [];
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
      .insert(novasUnidades as any);
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
  const condominioIds = (condominios || []).map((c: { id: string }) => c.id);

  // Get users per condominio via usuario_condominios
  const ucTable = 'usuario_condominios' as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: ucData } = await admin
    .from(ucTable)
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
  for (const uc of (ucData as any[]) || []) {
    const cid = uc.condominio_id;
    userCountMap[cid] = (userCountMap[cid] || 0) + 1;
    if (uc.role === 'sindico' && uc.usuario) {
      sindicoMap[cid] = (uc.usuario as any).nome || null;
    }
  }

  const unitCountMap: Record<string, number> = {};
  for (const bloco of (blocos as any[]) || []) {
    const cid = bloco.condominio_id;
    unitCountMap[cid] = (unitCountMap[cid] || 0) + (bloco.unidades_habitacionais?.length || 0);
  }

  const formatted = (condominios || []).map((c: any) => ({
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
  const { data, error } = await admin.from('condominios').insert(insertPayload).select('id').single();

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
  const { id, blocos_ruas, ...updates } = body as { id: string; blocos_ruas?: unknown; [key: string]: unknown };

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
