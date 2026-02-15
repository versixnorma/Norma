import { createAdminClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

type UserRole = Database['public']['Enums']['user_role'];
type UserStatus = Database['public']['Enums']['user_status'];

type UsuarioAuthIdRow = { auth_id: string | null };
type UsuarioCondominioLinkRow = { id: string };
type UsuarioListRow = {
  id: string;
  auth_id: string | null;
  nome: string;
  email: string;
  telefone: string | null;
  avatar_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  role: string | null;
  unidade_id: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  notificacoes_email: boolean;
  notificacoes_push: boolean;
  notificacoes_whatsapp: boolean;
  usuario_condominios?: Array<{
    role: string;
    condominio?: { id: string; nome: string } | null;
  }> | null;
  unidades_habitacionais?: { numero: string | null } | null;
};

const VALID_ROLES: UserRole[] = [
  'superadmin',
  'admin_condo',
  'sindico',
  'subsindico',
  'conselheiro',
  'morador',
  'proprietario',
  'inquilino',
  'porteiro',
  'zelador',
];
const VALID_STATUS: UserStatus[] = ['pending', 'active', 'inactive', 'suspended', 'removed'];

function normalizeRole(role: string | undefined, fallback: UserRole = 'morador'): UserRole {
  return role && VALID_ROLES.includes(role as UserRole) ? (role as UserRole) : fallback;
}
function normalizeStatus(status: string | undefined, fallback: UserStatus = 'active'): UserStatus {
  return status && VALID_STATUS.includes(status as UserStatus) ? (status as UserStatus) : fallback;
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
// GET - List users (with orphan sync)
// ============================================
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

  const { data: currentUser } = await admin
    .from('usuarios')
    .select('id, role')
    .eq('auth_id', user.id)
    .single();

  if (!currentUser || currentUser.role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden - requer superadmin' }, { status: 403 });
  }

  // Sync orphaned auth users (in auth.users but missing from public.usuarios)
  try {
    const { data: authListData } = await admin.auth.admin.listUsers({ perPage: 200 });
    if (authListData?.users) {
      const { data: existingUsuarios } = await admin.from('usuarios').select('auth_id');
      const existingAuthIds = new Set(
        ((existingUsuarios || []) as UsuarioAuthIdRow[])
          .map((u) => u.auth_id)
          .filter((authId): authId is string => Boolean(authId))
      );

      const orphans = authListData.users.filter((au) => !existingAuthIds.has(au.id));
      let orphanSyncErrors = 0;

      for (const orphan of orphans) {
        try {
          const meta = orphan.user_metadata || {};
          const condominioRaw = typeof meta.condominio_id === 'string' ? meta.condominio_id : null;
          const condominioId =
            condominioRaw &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
              condominioRaw
            )
              ? condominioRaw
              : null;

          const { data: existingUsuario } = await admin
            .from('usuarios')
            .select('id')
            .eq('auth_id', orphan.id)
            .maybeSingle();

          let usuarioId = existingUsuario?.id as string | undefined;
          if (!usuarioId) {
            const { data: createdUsuario, error: createErr } = await admin
              .from('usuarios')
              .insert({
                auth_id: orphan.id,
                nome: meta.nome || meta.full_name || orphan.email?.split('@')[0] || 'Usuário',
                email: orphan.email || '',
                telefone: meta.telefone || null,
                role: 'morador',
                status: 'pending',
              })
              .select('id')
              .single();

            if (createErr) {
              orphanSyncErrors += 1;
              console.error('Orphan usuario insert failed:', {
                auth_id: orphan.id,
                error: createErr,
              });
              continue;
            }

            usuarioId = createdUsuario.id;
          }

          if (condominioId && usuarioId) {
            await admin.from('usuario_condominios').upsert(
              {
                usuario_id: usuarioId,
                condominio_id: condominioId,
                role: 'morador',
                status: 'pending',
              },
              { onConflict: 'usuario_id,condominio_id' }
            );
          }
        } catch (orphanErr) {
          orphanSyncErrors += 1;
          console.error('Orphan sync item error:', { auth_id: orphan.id, error: orphanErr });
        }
      }

      if (orphanSyncErrors > 0) {
        console.warn(`Orphan sync finished with ${orphanSyncErrors} errors`);
      }
    }
  } catch (syncErr) {
    console.error('Orphan sync error (non-fatal):', syncErr);
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
      cpf,
      data_nascimento,
      notificacoes_email,
      notificacoes_push,
      notificacoes_whatsapp,
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

  const formatted = ((data || []) as UsuarioListRow[]).map((u) => ({
    id: u.id,
    auth_id: u.auth_id || '',
    nome: u.nome,
    email: u.email,
    telefone: u.telefone,
    avatar_url: u.avatar_url,
    status: u.status,
    role: u.role || 'morador',
    unidade_id: u.unidade_id,
    cpf: u.cpf,
    data_nascimento: u.data_nascimento,
    notificacoes_email: u.notificacoes_email,
    notificacoes_push: u.notificacoes_push,
    notificacoes_whatsapp: u.notificacoes_whatsapp,
    created_at: u.created_at,
    updated_at: u.updated_at,
    condominios: (u.usuario_condominios || []).map((uc) => ({
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
// POST - Create user (auth + usuarios + usuario_condominios)
// ============================================
export async function POST(request: NextRequest) {
  const result = await verifySuperadmin();
  if ('error' in result) return result.error;
  const { admin } = result;

  const body = await request.json();
  const {
    nome,
    email,
    telefone,
    role,
    status,
    condominio_id,
    unidade_id,
    cpf,
    data_nascimento,
    notificacoes_email,
    notificacoes_push,
    notificacoes_whatsapp,
    senha,
  } = body as {
    nome: string;
    email: string;
    telefone?: string;
    role?: string;
    status?: string;
    condominio_id?: string;
    unidade_id?: string;
    cpf?: string;
    data_nascimento?: string;
    notificacoes_email?: boolean;
    notificacoes_push?: boolean;
    notificacoes_whatsapp?: boolean;
    senha?: string;
  };

  if (!nome || !email) {
    return NextResponse.json({ error: 'Nome e email são obrigatórios' }, { status: 400 });
  }

  const targetRole = normalizeRole(role);
  const targetStatus = normalizeStatus(status);

  // 1. Create auth user (trigger handle_new_user may create usuarios row)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: senha || Math.random().toString(36).slice(-12) + 'A1!',
    email_confirm: true,
    user_metadata: {
      nome,
      telefone: telefone || null,
      condominio_id: condominio_id || null,
      unidade_id: unidade_id || null,
      cpf: cpf || null,
      data_nascimento: data_nascimento || null,
      notificacoes_email: typeof notificacoes_email === 'boolean' ? notificacoes_email : true,
      notificacoes_push: typeof notificacoes_push === 'boolean' ? notificacoes_push : true,
      notificacoes_whatsapp:
        typeof notificacoes_whatsapp === 'boolean' ? notificacoes_whatsapp : false,
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
    usuarioId = existingUsuario.id;
    const updatePayload: Database['public']['Tables']['usuarios']['Update'] = {
      nome,
      telefone: telefone || null,
      role: targetRole,
      status: targetStatus,
      unidade_id: unidade_id || null,
      cpf: cpf || null,
      data_nascimento: data_nascimento || null,
      notificacoes_email: typeof notificacoes_email === 'boolean' ? notificacoes_email : true,
      notificacoes_push: typeof notificacoes_push === 'boolean' ? notificacoes_push : true,
      notificacoes_whatsapp:
        typeof notificacoes_whatsapp === 'boolean' ? notificacoes_whatsapp : false,
    };
    await admin.from('usuarios').update(updatePayload).eq('id', usuarioId);
  } else {
    const insertPayload: Database['public']['Tables']['usuarios']['Insert'] = {
      auth_id: authId,
      nome,
      email,
      telefone: telefone || null,
      role: targetRole,
      status: targetStatus,
      unidade_id: unidade_id || null,
      cpf: cpf || null,
      data_nascimento: data_nascimento || null,
      notificacoes_email: typeof notificacoes_email === 'boolean' ? notificacoes_email : true,
      notificacoes_push: typeof notificacoes_push === 'boolean' ? notificacoes_push : true,
      notificacoes_whatsapp:
        typeof notificacoes_whatsapp === 'boolean' ? notificacoes_whatsapp : false,
    };
    const { data: newUser, error: insertError } = await admin
      .from('usuarios')
      .insert(insertPayload)
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
      .from('usuario_condominios')
      .select('id')
      .eq('usuario_id', usuarioId)
      .eq('condominio_id', condominio_id)
      .single();

    if (!existingLink) {
      await admin.from('usuario_condominios').insert({
        usuario_id: usuarioId,
        condominio_id,
        role: targetRole,
        status: targetStatus,
      });
    }
  }

  return NextResponse.json({ data: { id: usuarioId, auth_id: authId } }, { status: 201 });
}

// ============================================
// PUT - Update user (usuarios + usuario_condominios role sync)
// ============================================
export async function PUT(request: NextRequest) {
  const result = await verifySuperadmin();
  if ('error' in result) return result.error;
  const { admin } = result;

  const body = await request.json();
  const {
    id,
    nome,
    email,
    telefone,
    role,
    status,
    condominio_id,
    unidade_id,
    cpf,
    data_nascimento,
    notificacoes_email,
    notificacoes_push,
    notificacoes_whatsapp,
  } = body as {
    id: string;
    nome?: string;
    email?: string;
    telefone?: string;
    role?: string;
    status?: string;
    condominio_id?: string;
    unidade_id?: string;
    cpf?: string;
    data_nascimento?: string;
    notificacoes_email?: boolean;
    notificacoes_push?: boolean;
    notificacoes_whatsapp?: boolean;
  };

  if (!id) {
    return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 });
  }

  // Build update object with only provided fields
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (nome !== undefined) updates.nome = nome;
  if (email !== undefined) updates.email = email;
  if (telefone !== undefined) updates.telefone = telefone;
  if (unidade_id !== undefined) updates.unidade_id = unidade_id;
  if (cpf !== undefined) updates.cpf = cpf;
  if (data_nascimento !== undefined) updates.data_nascimento = data_nascimento;
  if (notificacoes_email !== undefined) updates.notificacoes_email = notificacoes_email;
  if (notificacoes_push !== undefined) updates.notificacoes_push = notificacoes_push;
  if (notificacoes_whatsapp !== undefined) updates.notificacoes_whatsapp = notificacoes_whatsapp;
  if (role !== undefined) updates.role = normalizeRole(role);
  if (status !== undefined) updates.status = normalizeStatus(status);

  const { error: updateError } = await admin.from('usuarios').update(updates).eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  // Sync role to usuario_condominios if role changed
  if (role !== undefined) {
    const roleValue = normalizeRole(role);
    const { data: links } = await admin
      .from('usuario_condominios')
      .select('id')
      .eq('usuario_id', id);

    if (((links || []) as UsuarioCondominioLinkRow[]).length > 0) {
      await admin.from('usuario_condominios').update({ role: roleValue }).eq('usuario_id', id);
    }
  }

  // Sync status to usuario_condominios links when status changed
  if (status !== undefined) {
    const statusValue = normalizeStatus(status);
    const { data: links } = await admin
      .from('usuario_condominios')
      .select('id')
      .eq('usuario_id', id);

    if (((links || []) as UsuarioCondominioLinkRow[]).length > 0) {
      await admin.from('usuario_condominios').update({ status: statusValue }).eq('usuario_id', id);
    }
  }

  // Sync selected condominio link when condominio_id is provided
  if (condominio_id) {
    const { data: usuarioAtual } = await admin
      .from('usuarios')
      .select('role, status')
      .eq('id', id)
      .maybeSingle();
    const roleValue = normalizeRole(
      role,
      (usuarioAtual?.role as UserRole | undefined) || 'morador'
    );
    const statusValue = normalizeStatus(
      status,
      (usuarioAtual?.status as UserStatus | undefined) || 'active'
    );
    const linkPayload: Database['public']['Tables']['usuario_condominios']['Insert'] = {
      usuario_id: id,
      condominio_id,
      role: roleValue,
      status: statusValue,
    };
    await admin
      .from('usuario_condominios')
      .upsert(linkPayload, { onConflict: 'usuario_id,condominio_id' });
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
