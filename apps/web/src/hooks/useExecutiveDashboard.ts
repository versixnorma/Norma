'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  ExecutiveKPIs,
  DailyActivity,
  CondominioHealth,
  TimeRange,
} from '@/lib/services/analyticsService';

interface ExecutiveDashboardState {
  kpis: ExecutiveKPIs | null;
  dailyActivity: DailyActivity[];
  condominioHealth: CondominioHealth[];
  loading: boolean;
  error: string | null;
  timeRange: TimeRange;
}

export function useExecutiveDashboard() {
  const [state, setState] = useState<ExecutiveDashboardState>({
    kpis: null,
    dailyActivity: [],
    condominioHealth: [],
    loading: false,
    error: null,
    timeRange: '30d',
  });

  const setTimeRange = useCallback((timeRange: TimeRange) => {
    setState((prev) => ({ ...prev, timeRange }));
  }, []);

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const [kpisRes, metricsRes] = await Promise.all([
        fetch('/api/admin/analytics/executive'),
        fetch(`/api/admin/analytics/unified?timeRange=${state.timeRange}`),
      ]);

      if (!kpisRes.ok || !metricsRes.ok) {
        throw new Error('Erro ao buscar dados');
      }

      const [kpisData, metricsData] = await Promise.all([kpisRes.json(), metricsRes.json()]);

      setState((prev) => ({
        ...prev,
        kpis: kpisData.data,
        dailyActivity: metricsData.data?.dailyActivity || [],
        condominioHealth: metricsData.data?.condominioHealth || [],
        loading: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Erro desconhecido',
        loading: false,
      }));
    }
  }, [state.timeRange]);

  const refreshViews = useCallback(async () => {
    try {
      await fetch('/api/admin/analytics/refresh', { method: 'POST' });
      await fetchData();
    } catch {
      // silent fail on refresh
    }
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    setTimeRange,
    fetchData,
    refreshViews,
  };
}
