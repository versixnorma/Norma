import { withAdminAuth } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

type CondominioHealthItem = {
  id: string;
  nome: string;
  blocos?: Array<{
    unidades_habitacionais?: Array<{ id: string }> | null;
  }> | null;
};

export const GET = withAdminAuth(async ({ admin }) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const startOfToday = new Date().toISOString().split('T')[0];

  // ── Stats ──
  const [
    { count: totalCondominios },
    { count: totalUsuarios },
    { count: usuariosAtivos },
    { count: usuariosPendentes },
    { count: totalUnidades },
    { count: usuariosNovosMes },
    { count: condominiosNovosMes },
    { count: loginsHoje },
    { count: loginsSemana },
  ] = await Promise.all([
    admin.from('condominios').select('*', { count: 'exact', head: true }),
    admin.from('usuarios').select('*', { count: 'exact', head: true }),
    admin.from('usuarios').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('usuarios').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('unidades_habitacionais').select('*', { count: 'exact', head: true }),
    admin
      .from('usuarios')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth),
    admin
      .from('condominios')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth),
    admin
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('acao', 'LOGIN')
      .gte('created_at', startOfToday),
    admin
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('acao', 'LOGIN')
      .gte('created_at', startOfWeek),
  ]);

  const stats = {
    total_condominios: totalCondominios || 0,
    total_usuarios: totalUsuarios || 0,
    usuarios_ativos: usuariosAtivos || 0,
    usuarios_pendentes: usuariosPendentes || 0,
    total_unidades: totalUnidades || 0,
    usuarios_novos_mes: usuariosNovosMes || 0,
    condominios_novos_mes: condominiosNovosMes || 0,
    logins_hoje: loginsHoje || 0,
    logins_semana: loginsSemana || 0,
    uptime_percent: 99.9,
    avg_response_time_ms: 120,
  };

  // ── Activity (last 7 days) ──
  const activityData: Array<{ date: string; usuarios: number; logins: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().split('T')[0];

    const [{ count: usuarios }, { count: logins }] = await Promise.all([
      admin
        .from('usuarios')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dateStr)
        .lt('created_at', nextDateStr),
      admin
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('acao', 'LOGIN')
        .gte('created_at', dateStr)
        .lt('created_at', nextDateStr),
    ]);

    activityData.push({
      date: date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }),
      usuarios: usuarios || 0,
      logins: logins || 0,
    });
  }

  // ── Condominios Health ──
  const { data: condominios } = await admin
    .from('condominios')
    .select('id, nome, blocos (unidades_habitacionais (id))')
    .limit(10);

  const ucTable = 'usuario_condominios';
  const condominiosHealth = await Promise.all(
    ((condominios || []) as CondominioHealthItem[]).map(async (condo) => {
      const { count: usuariosActiveCondo } = await admin
        .from(ucTable)
        .select('*', { count: 'exact', head: true })
        .eq('condominio_id', condo.id)
        .eq('status', 'active');

      const { count: usuariosTotalCondo } = await admin
        .from(ucTable)
        .select('*', { count: 'exact', head: true })
        .eq('condominio_id', condo.id);

      const totalUnidadesCondo =
        condo.blocos?.reduce(
          (acc: number, bloco) => acc + (bloco.unidades_habitacionais?.length || 0),
          0
        ) || 0;

      const ocupacao =
        totalUnidadesCondo > 0
          ? Math.round(((usuariosTotalCondo || 0) / totalUnidadesCondo) * 100)
          : 0;

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (ocupacao < 30) status = 'critical';
      else if (ocupacao < 60) status = 'warning';

      return {
        id: condo.id,
        nome: condo.nome,
        usuarios_ativos: usuariosActiveCondo || 0,
        usuarios_total: usuariosTotalCondo || 0,
        ocupacao_percent: ocupacao,
        status,
      };
    })
  );

  return NextResponse.json({
    data: { stats, activityData, condominiosHealth },
  });
});
