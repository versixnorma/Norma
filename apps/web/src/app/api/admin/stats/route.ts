import { withAdminAuth } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

export const GET = withAdminAuth(async ({ admin }) => {
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
});
