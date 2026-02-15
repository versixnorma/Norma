import { createAdminClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
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
    .maybeSingle();

  if (!usuario) {
    return NextResponse.json({ data: null });
  }

  const { data: link } = await admin
    .from('usuario_condominios' as any)
    .select(
      `
      condominio:condominio_id (
        id,
        nome
      )
    `
    )
    .eq('usuario_id', usuario.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    data: link?.condominio
      ? {
          id: link.condominio.id,
          nome: link.condominio.nome,
        }
      : null,
  });
}
