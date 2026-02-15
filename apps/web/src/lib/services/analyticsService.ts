import { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TimeRange = '7d' | '30d' | '90d' | 'custom';

export interface AnalyticsFilters {
  timeRange: TimeRange;
  startDate?: string;
  endDate?: string;
  condominioIds?: string[];
}

export interface DateRange {
  start: string;
  end: string;
}

export interface ExecutiveKPIs {
  totalUsers: number;
  activeUsers: number;
  activeUsers30d: number;
  totalCondominios: number;
  custoMesCentavos: number;
  gmvMes: number;
  conversasIA30d: number;
  satisfacaoIA30d: number;
  totalDocuments: number;
  totalChunks: number;
  refreshedAt: string;
}

export interface DailyActivity {
  condominio_id: string;
  condominio_nome: string;
  date: string;
  usuarios_ativos: number;
  sessoes_totais: number;
  comunicados_criados: number;
  ocorrencias_criadas: number;
  norma_conversas: number;
  custo_total_centavos: number;
}

export interface CondominioHealth {
  condominio_id: string;
  nome: string;
  tier: string;
  total_unidades: number;
  total_usuarios: number;
  usuarios_ativos: number;
  usuarios_ativos_7d: number;
  comunicados_7d: number;
  ocorrencias_7d: number;
  conversas_ia_7d: number;
  custo_7d_centavos: number;
}

export interface FunnelStep {
  step: string;
  label: string;
  count: number;
  rate: number;
}

export interface CohortRow {
  cohort: string;
  size: number;
  periods: { period: number; retained: number; rate: number }[];
}

export interface RetentionPoint {
  period: string;
  rate: number;
}

export interface UnifiedMetrics {
  dailyActivity: DailyActivity[];
  condominioHealth: CondominioHealth[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getDateRange(filters: AnalyticsFilters): DateRange {
  const end = new Date();
  const start = new Date();

  switch (filters.timeRange) {
    case '7d':
      start.setDate(end.getDate() - 7);
      break;
    case '30d':
      start.setDate(end.getDate() - 30);
      break;
    case '90d':
      start.setDate(end.getDate() - 90);
      break;
    case 'custom':
      return {
        start: filters.startDate || start.toISOString(),
        end: filters.endDate || end.toISOString(),
      };
  }

  return { start: start.toISOString(), end: end.toISOString() };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getExecutiveKPIs(supabase: SupabaseClient): Promise<ExecutiveKPIs> {
  const { data } = await supabase
    .from('mv_executive_kpis' as never)
    .select('*')
    .limit(1)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = (data as any) || {};
  return {
    totalUsers: row.total_users ?? 0,
    activeUsers: row.active_users ?? 0,
    activeUsers30d: row.active_users_30d ?? 0,
    totalCondominios: row.total_condominios ?? 0,
    custoMesCentavos: row.custo_mes_centavos ?? 0,
    gmvMes: Number(row.gmv_mes ?? 0),
    conversasIA30d: row.conversas_ia_30d ?? 0,
    satisfacaoIA30d: Number(row.satisfacao_ia_30d ?? 0),
    totalDocuments: row.total_documents ?? 0,
    totalChunks: row.total_chunks ?? 0,
    refreshedAt: row.refreshed_at ?? new Date().toISOString(),
  };
}

export async function getUnifiedMetrics(
  supabase: SupabaseClient,
  filters: AnalyticsFilters
): Promise<UnifiedMetrics> {
  const { start, end } = getDateRange(filters);

  let dailyQuery = supabase
    .from('mv_daily_activity_summary' as never)
    .select('*')
    .gte('date', start.split('T')[0])
    .lte('date', end.split('T')[0])
    .order('date', { ascending: true });

  if (filters.condominioIds?.length) {
    dailyQuery = dailyQuery.in('condominio_id', filters.condominioIds);
  }

  const [dailyRes, healthRes] = await Promise.all([
    dailyQuery,
    supabase
      .from('mv_condominio_health' as never)
      .select('*')
      .order('nome'),
  ]);

  return {
    dailyActivity: (dailyRes.data || []) as unknown as DailyActivity[],
    condominioHealth: (healthRes.data || []) as unknown as CondominioHealth[],
  };
}

export async function getFunnelData(
  supabase: SupabaseClient,
  filters: AnalyticsFilters
): Promise<FunnelStep[]> {
  const { start, end } = getDateRange(filters);

  // Registered: users created in period
  const { count: registered } = await supabase
    .from('usuarios')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', start)
    .lte('created_at', end);

  // Activated: active users with at least 1 audit_log
  const { data: activatedData } = await supabase
    .from('audit_logs' as never)
    .select('usuario_id')
    .gte('created_at', start)
    .lte('created_at', end);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uniqueActive = new Set(((activatedData as any[]) || []).map((r: any) => r.usuario_id));
  const activated = uniqueActive.size;

  // Engaged: users with > 5 actions
  const actionCounts: Record<string, number> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((activatedData as any[]) || []).forEach((r: any) => {
    if (r.usuario_id) actionCounts[r.usuario_id] = (actionCounts[r.usuario_id] || 0) + 1;
  });
  const engaged = Object.values(actionCounts).filter((c) => c > 5).length;

  // Retained: active in both halves of the period
  const midDate = new Date((new Date(start).getTime() + new Date(end).getTime()) / 2);
  const midISO = midDate.toISOString();

  const [firstHalf, secondHalf] = await Promise.all([
    supabase
      .from('audit_logs' as never)
      .select('usuario_id')
      .gte('created_at', start)
      .lt('created_at', midISO),
    supabase
      .from('audit_logs' as never)
      .select('usuario_id')
      .gte('created_at', midISO)
      .lte('created_at', end),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const firstSet = new Set(((firstHalf.data as any[]) || []).map((r: any) => r.usuario_id));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const secondSet = new Set(((secondHalf.data as any[]) || []).map((r: any) => r.usuario_id));
  let retained = 0;
  firstSet.forEach((uid) => {
    if (secondSet.has(uid)) retained++;
  });

  const total = registered || 1;
  return [
    { step: 'registered', label: 'Registrados', count: registered || 0, rate: 100 },
    {
      step: 'activated',
      label: 'Ativados',
      count: activated,
      rate: Math.round((activated / total) * 100),
    },
    {
      step: 'engaged',
      label: 'Engajados',
      count: engaged,
      rate: Math.round((engaged / total) * 100),
    },
    {
      step: 'retained',
      label: 'Retidos',
      count: retained,
      rate: Math.round((retained / total) * 100),
    },
  ];
}

export async function getCohortData(
  supabase: SupabaseClient,
  filters: AnalyticsFilters
): Promise<CohortRow[]> {
  const { start } = getDateRange(filters);

  // Get users created in last 6 months grouped by month
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const startDate = new Date(Math.max(sixMonthsAgo.getTime(), new Date(start).getTime()));

  const { data: users } = await supabase
    .from('usuarios')
    .select('id, created_at')
    .gte('created_at', startDate.toISOString())
    .is('deleted_at', null);

  const { data: logs } = await supabase
    .from('audit_logs' as never)
    .select('usuario_id, created_at')
    .gte('created_at', startDate.toISOString());

  // Group users by signup month

  const userCohorts: Record<string, string[]> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((users || []) as any[]).forEach((u) => {
    const month = u.created_at?.substring(0, 7); // YYYY-MM
    if (month) {
      if (!userCohorts[month]) userCohorts[month] = [];
      userCohorts[month].push(u.id);
    }
  });

  // Group activity by user+month

  const activityByUserMonth: Record<string, Set<string>> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((logs || []) as any[]).forEach((l) => {
    const uid = l.usuario_id;
    const month = l.created_at?.substring(0, 7);
    if (uid && month) {
      if (!activityByUserMonth[uid]) activityByUserMonth[uid] = new Set();
      activityByUserMonth[uid].add(month);
    }
  });

  // Build cohort table
  const sortedMonths = Object.keys(userCohorts).sort();
  return sortedMonths.map((cohortMonth) => {
    const cohortUsers = userCohorts[cohortMonth];
    const size = cohortUsers.length;
    const periods: { period: number; retained: number; rate: number }[] = [];

    sortedMonths.forEach((checkMonth) => {
      if (checkMonth < cohortMonth) return;
      const periodNum = sortedMonths.indexOf(checkMonth) - sortedMonths.indexOf(cohortMonth);
      const retained = cohortUsers.filter((uid) =>
        activityByUserMonth[uid]?.has(checkMonth)
      ).length;
      periods.push({
        period: periodNum,
        retained,
        rate: size > 0 ? Math.round((retained / size) * 100) : 0,
      });
    });

    return { cohort: cohortMonth, size, periods };
  });
}

export async function getRetentionData(
  supabase: SupabaseClient,
  filters: AnalyticsFilters
): Promise<RetentionPoint[]> {
  const { start, end } = getDateRange(filters);

  // Weekly retention: for each week, what % of users from week 0 are still active
  const startDate = new Date(start);
  const endDate = new Date(end);
  const weeks = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

  const { data: logs } = await supabase
    .from('audit_logs' as never)
    .select('usuario_id, created_at')
    .gte('created_at', start)
    .lte('created_at', end);

  // Find week 0 users (first week)
  const week0End = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allLogs = (logs || []) as any[];
  const week0Users = new Set(
    allLogs.filter((l) => new Date(l.created_at) < week0End).map((l) => l.usuario_id)
  );
  const baseSize = week0Users.size || 1;

  const points: RetentionPoint[] = [];
  for (let w = 0; w < Math.min(weeks, 13); w++) {
    const weekStart = new Date(startDate.getTime() + w * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const activeInWeek = new Set(
      allLogs
        .filter((l) => {
          const d = new Date(l.created_at);
          return d >= weekStart && d < weekEnd;
        })
        .map((l) => l.usuario_id)
    );

    let retained = 0;
    week0Users.forEach((uid) => {
      if (activeInWeek.has(uid)) retained++;
    });

    points.push({
      period: `Semana ${w}`,
      rate: Math.round((retained / baseSize) * 100),
    });
  }

  return points;
}
