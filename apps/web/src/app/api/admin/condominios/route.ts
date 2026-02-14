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
