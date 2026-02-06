'use client';

import { getSupabaseClient } from '@/lib/supabase';
import { useCallback, useState } from 'react';

export interface DashboardStats {
  // Basic counts
  total_condominios: number;
  total_usuarios: number;
  usuarios_ativos: number;
  usuarios_pendentes: number;
  total_unidades: number;

  // Growth metrics
  usuarios_novos_mes: number;
  condominios_novos_mes: number;

  // Activity metrics
  logins_hoje: number;
  logins_semana: number;

  // System health
  uptime_percent: number;
  avg_response_time_ms: number;
}

export interface ActivityData {
  date: string;
  usuarios: number;
  logins: number;
}

export interface CondominioHealth {
  id: string;
  nome: string;
  usuarios_ativos: number;
  usuarios_total: number;
  ocupacao_percent: number;
  status: 'healthy' | 'warning' | 'critical';
}

export function useAdminDashboard() {
  const supabase = getSupabaseClient();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [condominiosHealth, setCondominiosHealth] = useState<CondominioHealth[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch comprehensive dashboard stats
  const fetchDashboardStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfWeek = new Date(now.setDate(now.getDate() - 7)).toISOString();
      const startOfToday = new Date().toISOString().split('T')[0];

      // Parallel queries for better performance
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
        supabase.from('condominios').select('*', { count: 'exact', head: true }),
        supabase.from('usuarios').select('*', { count: 'exact', head: true }),
        supabase
          .from('usuarios')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase
          .from('usuarios')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase.from('unidades_habitacionais').select('*', { count: 'exact', head: true }),
        supabase
          .from('usuarios')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfMonth),
        supabase
          .from('condominios')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfMonth),
        supabase
          .from('audit_logs')
          .select('*', { count: 'exact', head: true })
          .eq('acao', 'LOGIN')
          .gte('created_at', startOfToday),
        supabase
          .from('audit_logs')
          .select('*', { count: 'exact', head: true })
          .eq('acao', 'LOGIN')
          .gte('created_at', startOfWeek),
      ]);

      setStats({
        total_condominios: totalCondominios || 0,
        total_usuarios: totalUsuarios || 0,
        usuarios_ativos: usuariosAtivos || 0,
        usuarios_pendentes: usuariosPendentes || 0,
        total_unidades: totalUnidades || 0,
        usuarios_novos_mes: usuariosNovosMes || 0,
        condominios_novos_mes: condominiosNovosMes || 0,
        logins_hoje: loginsHoje || 0,
        logins_semana: loginsSemana || 0,
        uptime_percent: 99.9, // Placeholder - would come from monitoring service
        avg_response_time_ms: 120, // Placeholder - would come from monitoring service
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Fetch activity data for charts (last 7 days)
  const fetchActivityData = useCallback(async () => {
    try {
      const days = 7;
      const data: ActivityData[] = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const [{ count: usuarios }, { count: logins }] = await Promise.all([
          supabase
            .from('usuarios')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', dateStr)
            .lt('created_at', nextDate.toISOString().split('T')[0]),
          supabase
            .from('audit_logs')
            .select('*', { count: 'exact', head: true })
            .eq('acao', 'LOGIN')
            .gte('created_at', dateStr)
            .lt('created_at', nextDate.toISOString().split('T')[0]),
        ]);

        data.push({
          date: date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }),
          usuarios: usuarios || 0,
          logins: logins || 0,
        });
      }

      setActivityData(data);
    } catch (err) {
      console.error('Error fetching activity data:', err);
    }
  }, [supabase]);

  // Fetch condominios health status
  const fetchCondominiosHealth = useCallback(async () => {
    try {
      const { data: condominios } = await supabase
        .from('condominios')
        .select(
          `
          id,
          nome,
          blocos (
            unidades_habitacionais (id)
          )
        `
        )
        .limit(10);

      if (!condominios) return;

      const healthData: CondominioHealth[] = await Promise.all(
        condominios.map(async (condo: any) => {
          const { count: usuariosAtivos } = await supabase
            .from('usuario_condominios')
            .select('*', { count: 'exact', head: true })
            .eq('condominio_id', condo.id)
            .eq('status', 'active');

          const { count: usuariosTotal } = await supabase
            .from('usuario_condominios')
            .select('*', { count: 'exact', head: true })
            .eq('condominio_id', condo.id);

          const totalUnidades =
            condo.blocos?.reduce(
              (acc: number, bloco: any) => acc + (bloco.unidades_habitacionais?.length || 0),
              0
            ) || 0;

          const ocupacao =
            totalUnidades > 0 ? Math.round(((usuariosTotal || 0) / totalUnidades) * 100) : 0;

          let status: 'healthy' | 'warning' | 'critical' = 'healthy';
          if (ocupacao < 30) status = 'critical';
          else if (ocupacao < 60) status = 'warning';

          return {
            id: condo.id,
            nome: condo.nome,
            usuarios_ativos: usuariosAtivos || 0,
            usuarios_total: usuariosTotal || 0,
            ocupacao_percent: ocupacao,
            status,
          };
        })
      );

      setCondominiosHealth(healthData);
    } catch (err) {
      console.error('Error fetching condominios health:', err);
    }
  }, [supabase]);

  // Fetch all dashboard data
  const fetchAll = useCallback(async () => {
    await Promise.all([fetchDashboardStats(), fetchActivityData(), fetchCondominiosHealth()]);
  }, [fetchDashboardStats, fetchActivityData, fetchCondominiosHealth]);

  return {
    stats,
    activityData,
    condominiosHealth,
    loading,
    error,
    fetchDashboardStats,
    fetchActivityData,
    fetchCondominiosHealth,
    fetchAll,
  };
}
