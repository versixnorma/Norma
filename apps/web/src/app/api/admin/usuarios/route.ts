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
    .select('id, role')
    .eq('auth_id', user.id)
    .single();

  if (!usuario) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  // superadmin is a global role on usuarios.role, not on usuario_condominios
  if (usuario.role !== 'superadmin') {
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

// ============================================
// Helper: verify superadmin
// ============================================
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

// ============================================
// POST - Create user (auth + usuarios + usuario_condominios)
// ============================================
export async function POST(request: NextRequest) {
  const result = await verifySuperadmin();
  if ('error' in result) return result.error;
  const { admin } = result;

  const body = await request.json();
  const { nome, email, telefone, role, status, condominio_id, senha } = body as {
    nome: string;
    email: string;
    telefone?: string;
    role?: string;
    status?: string;
    condominio_id?: string;
    senha?: string;
  };

  if (!nome || !email) {
    return NextResponse.json({ error: 'Nome e email são obrigatórios' }, { status: 400 });
  }

  const targetRole = role || 'morador';
  const targetStatus = status || 'active';

  // 1. Create auth user (trigger handle_new_user may create usuarios row)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: senha || Math.random().toString(36).slice(-12) + 'A1!',
    email_confirm: true,
    user_metadata: {
      nome,
      telefone: telefone || null,
      condominio_id: condominio_id || null,
    },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const authId = authData.user.id;

  // 2. Check if trigger already created the usuarios row
  const { data: existingUsuario } = await admin
    .from('usuarios')
    .select('id')
    .eq('auth_id', authId)
    .single();

  let usuarioId: string;

  if (existingUsuario) {
    // Trigger created the row — update it with admin-specified values
    usuarioId = existingUsuario.id;
    await admin
      .from('usuarios')
      .update({
        nome,
        telefone: telefone || null,
        role: targetRole,
        status: targetStatus,
        condominio_id: condominio_id || null,
      } as any)
      .eq('id', usuarioId);
  } else {
    // Trigger failed silently — create manually
    const { data: newUser, error: insertError } = await admin
      .from('usuarios')
      .insert({
        auth_id: authId,
        nome,
        email,
        telefone: telefone || null,
        role: targetRole,
        status: targetStatus,
        condominio_id: condominio_id || null,
      } as any)
      .select('id')
      .single();

    if (insertError) {
      await admin.auth.admin.deleteUser(authId);
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    usuarioId = newUser.id;
  }

  // 3. Ensure usuario_condominios link exists
  if (condominio_id) {
    const { data: existingLink } = await admin
      .from('usuario_condominios' as any)
      .select('id')
      .eq('usuario_id', usuarioId)
      .eq('condominio_id', condominio_id)
      .single();

    if (!existingLink) {
      await admin.from('usuario_condominios' as any).insert({
        usuario_id: usuarioId,
        condominio_id,
        role: targetRole,
        status: targetStatus,
      } as any);
    }
  }

  return NextResponse.json({ data: { id: usuarioId, auth_id: authId } }, { status: 201 });
}

// ============================================
// PUT - Update user (usuarios table)
// ============================================
export async function PUT(request: NextRequest) {
  const result = await verifySuperadmin();
  if ('error' in result) return result.error;
  const { admin } = result;

  const body = await request.json();
  const { id, nome, email, telefone, role, status, condominio_id } = body as {
    id: string;
    nome?: string;
    email?: string;
    telefone?: string;
    role?: string;
    status?: string;
    condominio_id?: string;
  };

  if (!id) {
    return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 });
  }

  // Build update object with only provided fields
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (nome !== undefined) updates.nome = nome;
  if (email !== undefined) updates.email = email;
  if (telefone !== undefined) updates.telefone = telefone;
  if (role !== undefined) updates.role = role;
  if (status !== undefined) updates.status = status;
  if (condominio_id !== undefined) updates.condominio_id = condominio_id;

  const { error: updateError } = await admin.from('usuarios').update(updates).eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  // If email changed, update auth user email too
  if (email) {
    const { data: usuario } = await admin.from('usuarios').select('auth_id').eq('id', id).single();

    if (usuario?.auth_id) {
      await admin.auth.admin.updateUserById(usuario.auth_id, { email });
    }
  }

  return NextResponse.json({ data: { id } });
}
