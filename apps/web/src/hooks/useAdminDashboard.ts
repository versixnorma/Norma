'use client';

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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [condominiosHealth, setCondominiosHealth] = useState<CondominioHealth[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all dashboard data via API route (service role bypasses RLS)
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/dashboard', {
        credentials: 'include',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string })?.error || res.statusText);
      }

      const { data } = await res.json();
      setStats(data.stats);
      setActivityData(data.activityData);
      setCondominiosHealth(data.condominiosHealth);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    stats,
    activityData,
    condominiosHealth,
    loading,
    error,
    fetchDashboardStats: fetchAll,
    fetchActivityData: fetchAll,
    fetchCondominiosHealth: fetchAll,
    fetchAll,
  };
}
