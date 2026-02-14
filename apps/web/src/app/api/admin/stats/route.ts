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
    .select('id, role')
    .eq('auth_id', user.id)
    .single();

  if (!usuario || usuario.role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden - requer superadmin' }, { status: 403 });
  }

  const [
    { count: totalCondominios },
    { count: totalUsuarios },
    { count: usuariosAtivos },
    { count: usuariosPendentes },
    { count: totalUnidades },
  ] = await Promise.all([
    admin.from('condominios').select('*', { count: 'exact', head: true }),
    admin.from('usuarios').select('*', { count: 'exact', head: true }),
    admin.from('usuarios').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('usuarios').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('unidades_habitacionais').select('*', { count: 'exact', head: true }),
  ]);

  return NextResponse.json({
    data: {
      total_condominios: totalCondominios || 0,
      total_usuarios: totalUsuarios || 0,
      usuarios_ativos: usuariosAtivos || 0,
      usuarios_pendentes: usuariosPendentes || 0,
      total_unidades: totalUnidades || 0,
    },
  });
}
