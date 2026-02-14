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

  const { data, error } = await admin.from('condominios').insert(body).select('id').single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data: { id: data.id } }, { status: 201 });
}

// PUT - Update condominio
export async function PUT(request: NextRequest) {
  const result = await verifySuperadmin();
  if ('error' in result) return result.error;
  const { admin } = result;

  const body = await request.json();
  const { id, ...updates } = body as { id: string; [key: string]: unknown };

  if (!id) {
    return NextResponse.json({ error: 'ID do condominio e obrigatorio' }, { status: 400 });
  }

  const { error } = await admin.from('condominios').update(updates).eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data: { id } });
}
