import { createAdminClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/api-helpers';
import { condominioCreateSchema, condominioUpdateSchema } from '@/lib/schemas/api';
import type { CondominioFormInput } from '@/lib/schemas/condominioForm';
import { condominioFormSchema } from '@/lib/schemas/condominioForm';
import type { Database } from '@/types/database';
import { NextResponse } from 'next/server';

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
    const unidadesOrfas = unidadesAtivas.filter(
      (u) => !u.bloco_id || !desiredBlocoIds.has(u.bloco_id)
    );

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
export const GET = withAdminAuth(async ({ admin }) => {
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

  const condominioRows = (condominios || []) as CondominioListRow[];
  const condominioIds = condominioRows.map((c) => c.id);

  const { data: ucData } = await admin
    .from('usuario_condominios')
    .select('condominio_id, role, usuario:usuario_id (id, nome)')
    .in('condominio_id', condominioIds.length > 0 ? condominioIds : ['__none__']);

  const { data: blocos } = await admin
    .from('blocos')
    .select('condominio_id, unidades_habitacionais (id)')
    .in('condominio_id', condominioIds.length > 0 ? condominioIds : ['__none__']);

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
});

// POST - Create condominio
export const POST = withAdminAuth(async ({ admin }, req) => {
  const body = await req.json();

  // Prefer the new form schema, but fallback to legacy create schema for compatibility
  const parsedForm = condominioFormSchema.safeParse(body);
  let parsed: ReturnType<(typeof condominioCreateSchema)['safeParse']>;
  if (parsedForm.success) {
    // Map form input to insert payload
    const form = parsedForm.data;

    // Enrich CNPJ via BrasilAPI if possible and missing fields
    const cnpjDigits = String(form.cnpj || '').replace(/\D/g, '');
    if (cnpjDigits.length === 14) {
      try {
        const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjDigits}`, {
          method: 'GET',
        });
        if (resp.ok) {
          const info = await resp.json();
          // Fill missing values if not provided
          if (!form.razao_social && info.nome) form.razao_social = info.nome;
          if (!form.nome && info.fantasia) form.nome = info.fantasia;
          // Note: API may not provide administrative email/phone
        }
      } catch {
        // best-effort
      }
    }

    // Enrich CEP via ViaCEP if logradouro missing
    const cepDigits = String(form.cep || '').replace(/\D/g, '');
    if (cepDigits.length === 8 && !form.logradouro) {
      try {
        const r = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
        if (r.ok) {
          const v = await r.json();
          if (!v.erro) {
            form.logradouro = form.logradouro || v.logradouro || '';
            form.bairro = form.bairro || v.bairro || '';
            form.cidade = form.cidade || v.localidade || '';
            form.estado = form.estado || v.uf || '';
          }
        }
      } catch {
        // ignore
      }
    }

    const areas = String((form as Partial<CondominioFormInput>).areas_comuns_string || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const total_unidades =
      Number(form.quantidade_blocos || 0) * Number(form.unidades_por_bloco || 0);

    const insertPayload: Record<string, unknown> = {
      nome: form.nome,
      cnpj: cnpjDigits || null,
      razao_social: form.razao_social || null,
      logo_url: form.logo_url || null,
      primary_color: form.primary_color || null,
      email_administrativo: form.email_administrativo || null,
      telefone: form.telefone || null,
      cep: cepDigits || null,
      logradouro: form.logradouro || null,
      numero: form.numero || null,
      complemento: form.complemento || null,
      bairro: form.bairro || null,
      cidade: form.cidade || null,
      estado: form.estado || null,
      dia_vencimento: form.dia_vencimento || 10,
      total_unidades: total_unidades || null,
      areas_comuns: areas.length > 0 ? areas : null,
      modules: form.modules || null,
      blocos_ruas: form.quantidade_blocos
        ? Array.from({ length: form.quantidade_blocos }).map((_, i) => `Bloco ${i + 1}`)
        : undefined,
    };

    // Validate minimally against existing create schema
    parsed = condominioCreateSchema.safeParse(insertPayload);
  } else {
    parsed = condominioCreateSchema.safeParse(body);
  }

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { blocos_ruas, ...insertPayload } = parsed.data;
  const condominioInsert = insertPayload as Database['public']['Tables']['condominios']['Insert'];
  const { data, error } = await admin
    .from('condominios')
    .insert(condominioInsert)
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const totalUnidades = Number((insertPayload as { total_unidades?: number }).total_unidades || 0);
  await ensureCondominioUnits(admin, data.id, totalUnidades, parseBlockNames(blocos_ruas));

  return NextResponse.json({ data: { id: data.id } }, { status: 201 });
});

// PUT - Update condominio
export const PUT = withAdminAuth(async ({ admin }, req) => {
  const body = await req.json();
  const parsed = condominioUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { id, blocos_ruas, ...updates } = parsed.data;

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
});
