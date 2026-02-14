import { createAdminClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const authClient = createClient(await cookies());
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: usuario } = await admin
    .from('usuarios')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  if (!usuario) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  const { data: uc } = await admin
    .from('usuario_condominios')
    .select('role')
    .eq('usuario_id', usuario.id)
    .eq('role', 'superadmin')
    .eq('status', 'active')
    .maybeSingle();

  if (!uc) {
    return NextResponse.json({ error: 'Forbidden - requer superadmin' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get('status') || undefined) as
    | 'pending'
    | 'active'
    | 'inactive'
    | 'suspended'
    | 'removed'
    | undefined;
  const condominioId = searchParams.get('condominio_id') || undefined;
  const searchQuery = searchParams.get('search') || undefined;

  let query = admin
    .from('usuarios')
    .select(
      `
      id,
      auth_id,
      nome,
      email,
      telefone,
      avatar_url,
      status,
      created_at,
      updated_at,
      role,
      unidade_id,
      usuario_condominios (
        role,
        condominio:condominio_id (
          id,
          nome
        )
      ),
      unidades_habitacionais:unidade_id (numero)
    `
    )
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }
  if (condominioId) {
    query = query.filter('usuario_condominios.condominio_id', 'eq', condominioId);
  }
  if (searchQuery && searchQuery.length >= 2) {
    const safe = searchQuery.replace(/%/g, '\\%').replace(/_/g, '\\_');
    query = query.or(`nome.ilike.%${safe}%,email.ilike.%${safe}%`).limit(20);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const formatted = (data || []).map((u: any) => ({
    id: u.id,
    auth_id: u.auth_id || '',
    nome: u.nome,
    email: u.email,
    telefone: u.telefone,
    avatar_url: u.avatar_url,
    status: u.status,
    created_at: u.created_at,
    updated_at: u.updated_at,
    condominios: (u.usuario_condominios || []).map((uc: any) => ({
      condominio_id: uc.condominio?.id || '',
      condominio_nome: uc.condominio?.nome || 'Desconhecido',
      role: uc.role,
      unidade_id: u.unidade_id,
      unidade_identificador: u.unidades_habitacionais?.numero || null,
    })),
  }));

  return NextResponse.json({ data: formatted });
}
