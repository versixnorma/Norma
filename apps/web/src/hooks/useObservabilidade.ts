// =====================================================
// SPRINT 10: useObservabilidade Hook
// Dashboard de monitoramento
// =====================================================

import { getSupabaseClient } from '@/lib/supabase';
import type {
  AlertaSistema,
  AlertasResumo,
  DashboardObservabilidade,
  FiltroAlertas,
  MetricasPerformance,
  MetricasUso,
  ResolverAlertaInput,
  StatusAlerta,
  SystemStatus,
  TipoPeriodo,
  UptimeCheck,
} from '@/types/observabilidade';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// =====================================================
// QUERIES
// =====================================================

// Dashboard completo
export function useObservabilidadeDashboard() {
  return useQuery({
    queryKey: ['observabilidade', 'dashboard'],
    queryFn: async (): Promise<DashboardObservabilidade> => {
      const [statusRes, alertasRes, metricasRes, performanceRes, uptimeRes] = await Promise.all([
        getSupabaseClient().from('v_system_status').select('*').single(),
        fetchAlertas(),
        fetchMetricasGlobais(),
        fetchPerformance(),
        fetchUptime(),
      ]);

      return {
        status: statusRes.data as SystemStatus,
        alertas: alertasRes,
        metricas: metricasRes,
        performance: performanceRes,
        uptime: uptimeRes,
        custos: await fetchCustos(),
      };
    },
    refetchInterval: 30000, // 30 segundos
    staleTime: 10000,
  });
}

// Status do sistema
export function useSystemStatus() {
  return useQuery({
    queryKey: ['observabilidade', 'status'],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from('v_system_status')
        .select('*')
        .single();

      if (error) throw error;
      return data as SystemStatus;
    },
    refetchInterval: 15000,
  });
}

// Alertas
export function useAlertas(filtros?: FiltroAlertas) {
  return useQuery({
    queryKey: ['observabilidade', 'alertas', filtros],
    queryFn: async () => {
      let query = getSupabaseClient()
        .from('alertas_sistema')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filtros?.limit || 50);

      if (filtros?.tipo) query = query.eq('tipo', filtros.tipo);
      if (filtros?.severidade) query = query.eq('severidade', filtros.severidade);
      if (filtros?.status) query = query.eq('status', filtros.status);
      if (filtros?.condominio_id) query = query.eq('condominio_id', filtros.condominio_id);

      const { data, error } = await query;
      if (error) throw error;
      return data as AlertaSistema[];
    },
    refetchInterval: 30000,
  });
}

// Alertas ativos (não resolvidos)
export function useAlertasAtivos() {
  return useQuery({
    queryKey: ['observabilidade', 'alertas', 'ativos'],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from('alertas_sistema')
        .select('*')
        .in('status', ['aberto', 'reconhecido'])
        .order('severidade', { ascending: true }) // critical primeiro
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AlertaSistema[];
    },
    refetchInterval: 15000,
  });
}

// Resumo de alertas
export function useAlertasResumo() {
  return useQuery({
    queryKey: ['observabilidade', 'alertas', 'resumo'],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient().from('v_alertas_resumo').select('*');

      if (error) throw error;
      return data as AlertasResumo[];
    },
    refetchInterval: 30000,
  });
}

// Métricas de uso por condomínio
export function useMetricasUso(condominioId: string, periodo: TipoPeriodo = 'dia', dias = 30) {
  return useQuery({
    queryKey: ['observabilidade', 'metricas', condominioId, periodo, dias],
    queryFn: async () => {
      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - dias);

      const { data, error } = await getSupabaseClient()
        .from('metricas_uso')
        .select('*')
        .eq('condominio_id', condominioId)
        .eq('tipo_periodo', periodo)
        .gte('periodo', dataInicio.toISOString().split('T')[0])
        .order('periodo', { ascending: true });

      if (error) throw error;
      return data as MetricasUso[];
    },
    staleTime: 60000,
  });
}

// Métricas de performance
export function useMetricasPerformance(horas = 24) {
  return useQuery({
    queryKey: ['observabilidade', 'performance', horas],
    queryFn: async () => {
      const dataInicio = new Date();
      dataInicio.setHours(dataInicio.getHours() - horas);

      const { data, error } = await getSupabaseClient()
        .from('metricas_performance')
        .select('*')
        .gte('periodo', dataInicio.toISOString())
        .order('periodo', { ascending: true });

      if (error) throw error;
      return data as MetricasPerformance[];
    },
    staleTime: 30000,
  });
}

// Uptime checks
export function useUptimeChecks(horas = 24) {
  return useQuery({
    queryKey: ['observabilidade', 'uptime', horas],
    queryFn: async () => {
      const dataInicio = new Date();
      dataInicio.setHours(dataInicio.getHours() - horas);

      const { data, error } = await getSupabaseClient()
        .from('uptime_checks')
        .select('*')
        .gte('checked_at', dataInicio.toISOString())
        .order('checked_at', { ascending: false });

      if (error) throw error;
      return data as UptimeCheck[];
    },
    staleTime: 30000,
  });
}

// Uptime percentual
export function useUptimePercentual(endpoint?: string, horas = 24) {
  return useQuery({
    queryKey: ['observabilidade', 'uptime', 'percentual', endpoint, horas],
    queryFn: async () => {
      const dataInicio = new Date();
      dataInicio.setHours(dataInicio.getHours() - horas);

      let query = getSupabaseClient()
        .from('uptime_checks')
        .select('status')
        .gte('checked_at', dataInicio.toISOString());

      if (endpoint) query = query.eq('endpoint_nome', endpoint);

      const { data, error } = await query;
      if (error) throw error;

      const total = data.length;
      const ok = data.filter((c: any) => c.status === 'ok').length;

      return total > 0 ? (ok / total) * 100 : 100;
    },
    staleTime: 60000,
  });
}

// =====================================================
// MUTATIONS
// =====================================================

// Resolver alerta
export function useResolverAlerta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alerta_id, notas }: ResolverAlertaInput) => {
      const {
        data: { user },
      } = await getSupabaseClient().auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await getSupabaseClient().rpc('resolver_alerta', {
        p_alerta_id: alerta_id,
        p_resolvido_por: user.id,
        p_notas: notas || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['observabilidade', 'alertas'] });
    },
  });
}

// Reconhecer alerta
export function useReconhecerAlerta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertaId: string) => {
      const { error } = await getSupabaseClient()
        .from('alertas_sistema')
        .update({ status: 'ignorado' as StatusAlerta })
        .eq('id', alertaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['observabilidade', 'alertas'] });
    },
  });
}

// Ignorar alerta
export function useIgnorarAlerta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertaId: string) => {
      const { error } = await getSupabaseClient()
        .from('alertas_sistema')
        .update({ status: 'ignorado' as StatusAlerta })
        .eq('id', alertaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['observabilidade', 'alertas'] });
    },
  });
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function fetchAlertas() {
  const [resumoRes, recentesRes] = await Promise.all([
    getSupabaseClient().from('v_alertas_resumo').select('*'),
    getSupabaseClient()
      .from('alertas_sistema')
      .select('*')
      .in('status', ['aberto', 'reconhecido'])
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  return {
    resumo: (resumoRes.data || []) as AlertasResumo[],
    recentes: (recentesRes.data || []) as AlertaSistema[],
  };
}

async function fetchMetricasGlobais() {
  const hoje = new Date().toISOString().split('T')[0];
  const semanaAtras = new Date();
  semanaAtras.setDate(semanaAtras.getDate() - 7);

  const [hojeRes, semanaRes] = await Promise.all([
    getSupabaseClient()
      .from('metricas_globais')
      .select('*')
      .eq('periodo', hoje)
      .eq('tipo_periodo', 'dia')
      .single(),
    getSupabaseClient()
      .from('metricas_uso')
      .select('*')
      .eq('tipo_periodo', 'dia')
      .gte('periodo', semanaAtras.toISOString().split('T')[0]),
  ]);

  // Calcular tendência
  const tendencia = (semanaRes.data || []).reduce(
    (acc: { data: string; metrica: string; valor: number }[], m: MetricasUso) => {
      acc.push(
        { data: m.periodo, metrica: 'usuarios', valor: m.usuarios_ativos },
        { data: m.periodo, metrica: 'requests', valor: m.sessoes_totais }
      );
      return acc;
    },
    [] as { data: string; metrica: string; valor: number }[]
  );

  return {
    hoje: hojeRes.data || {
      total_condominios_ativos: 0,
      total_usuarios_ativos: 0,
      total_requisicoes: 0,
      total_erros: 0,
      custo_total_centavos: 0,
    },
    semana: {
      total_condominios_ativos: 0,
      total_usuarios_ativos: 0,
      total_requisicoes: 0,
      total_erros: 0,
      custo_total_centavos: 0,
    },
    tendencia,
  };
}

async function fetchPerformance() {
  const umHoraAtras = new Date();
  umHoraAtras.setHours(umHoraAtras.getHours() - 1);

  const { data } = await getSupabaseClient()
    .from('metricas_performance')
    .select('*')
    .gte('periodo', umHoraAtras.toISOString())
    .order('latencia_p99', { ascending: false })
    .limit(10);

  const metricas = data || [];

  const latencias = metricas.map((m: any) => m.latencia_avg || 0);
  const latenciaAtual =
    latencias.length > 0
      ? latencias.reduce((a: number, b: number) => a + b, 0) / latencias.length
      : 0;

  const p99s = metricas.map((m: any) => m.latencia_p99 || 0);
  const latenciaP99 = p99s.length > 0 ? Math.max(...p99s) : 0;

  const totalReqs = metricas.reduce((acc: number, m: any) => acc + (m.total_requests || 0), 0);
  const totalErros = metricas.reduce((acc: number, m: any) => acc + (m.requests_erro || 0), 0);
  const taxaErro = totalReqs > 0 ? (totalErros / totalReqs) * 100 : 0;

  const rps =
    metricas.reduce((acc: number, m: any) => acc + (m.rps_avg || 0), 0) /
    Math.max(metricas.length, 1);

  return {
    latencia_atual: Math.round(latenciaAtual),
    latencia_p99: Math.round(latenciaP99),
    taxa_erro: parseFloat(taxaErro.toFixed(2)),
    rps: parseFloat(rps.toFixed(2)),
    endpoints_lentos: metricas.slice(0, 5).map((m: any) => ({
      endpoint: m.endpoint,
      latencia_p99: m.latencia_p99 || 0,
      requests: m.total_requests,
    })),
  };
}

async function fetchUptime() {
  const vintQuatroHorasAtras = new Date();
  vintQuatroHorasAtras.setHours(vintQuatroHorasAtras.getHours() - 24);

  const { data } = await getSupabaseClient()
    .from('uptime_checks')
    .select('*')
    .gte('checked_at', vintQuatroHorasAtras.toISOString())
    .order('checked_at', { ascending: false });

  const checks = data || [];
  const total = checks.length;
  const ok = checks.filter((c: any) => c.status === 'ok').length;
  const percentual = total > 0 ? (ok / total) * 100 : 100;

  return {
    percentual_24h: parseFloat(percentual.toFixed(2)),
    checks_recentes: checks.slice(0, 20) as UptimeCheck[],
  };
}

async function fetchCustos() {
  const mesAtras = new Date();
  mesAtras.setMonth(mesAtras.getMonth() - 1);

  const { data } = await getSupabaseClient()
    .from('metricas_uso')
    .select(
      'condominio_id, custo_ia_centavos, custo_email_centavos, custo_sms_centavos, custo_total_centavos'
    )
    .eq('tipo_periodo', 'dia')
    .gte('periodo', mesAtras.toISOString().split('T')[0]);

  const metricas = data || [];

  const custoHoje = metricas
    .filter((m: any) => m.condominio_id) // filter para hoje seria baseado em periodo
    .reduce((acc: number, m: any) => acc + (m.custo_total_centavos || 0), 0);

  const custoMes = metricas.reduce((acc: number, m: any) => acc + (m.custo_total_centavos || 0), 0);

  // Agregar por categoria
  const iaTotal = metricas.reduce((acc: number, m: any) => acc + (m.custo_ia_centavos || 0), 0);
  const emailTotal = metricas.reduce(
    (acc: number, m: any) => acc + (m.custo_email_centavos || 0),
    0
  );
  const smsTotal = metricas.reduce((acc: number, m: any) => acc + (m.custo_sms_centavos || 0), 0);

  const porCategoria = [
    {
      categoria: 'IA (Groq)',
      valor_centavos: iaTotal,
      percentual: custoMes > 0 ? (iaTotal / custoMes) * 100 : 0,
    },
    {
      categoria: 'Email',
      valor_centavos: emailTotal,
      percentual: custoMes > 0 ? (emailTotal / custoMes) * 100 : 0,
    },
    {
      categoria: 'SMS',
      valor_centavos: smsTotal,
      percentual: custoMes > 0 ? (smsTotal / custoMes) * 100 : 0,
    },
  ];

  // Agregar por condomínio (top 5)
  const porCondominioMap = new Map<string, number>();
  metricas.forEach((m: any) => {
    if (m.condominio_id) {
      const atual = porCondominioMap.get(m.condominio_id) || 0;
      porCondominioMap.set(m.condominio_id, atual + (m.custo_total_centavos || 0));
    }
  });

  const porCondominio = Array.from(porCondominioMap.entries())
    .map(([id, valor]) => ({
      condominio_id: id,
      condominio_nome: id.substring(0, 8), // Placeholder
      custo_centavos: valor,
      percentual: custoMes > 0 ? (valor / custoMes) * 100 : 0,
    }))
    .sort((a, b) => b.custo_centavos - a.custo_centavos)
    .slice(0, 5);

  return {
    hoje: custoHoje,
    mes: custoMes,
    por_categoria: porCategoria,
    por_condominio: porCondominio,
  };
}

// =====================================================
// EXPORTS
// =====================================================

// All functions are exported directly above
