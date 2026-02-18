'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  ExecutiveKPIs,
  DailyActivity,
  CondominioHealth,
  TimeRange,
} from '@/lib/services/analyticsService';
import type { ExecutiveAlert } from '@/lib/services/analyticsAlerts';

interface ExecutiveDashboardState {
  kpis: ExecutiveKPIs | null;
  dailyActivity: DailyActivity[];
  condominioHealth: CondominioHealth[];
  alerts: ExecutiveAlert[];
  loading: boolean;
  error: string | null;
  timeRange: TimeRange;
}

export function useExecutiveDashboard() {
  const [state, setState] = useState<ExecutiveDashboardState>({
    kpis: null,
    dailyActivity: [],
    condominioHealth: [],
    alerts: [],
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
      const [kpisRes, metricsRes, alertsRes] = await Promise.all([
        fetch('/api/admin/analytics/executive'),
        fetch(`/api/admin/analytics/unified?timeRange=${state.timeRange}`),
        fetch(`/api/admin/analytics/alerts?timeRange=${state.timeRange}`),
      ]);

      if (!kpisRes.ok || !metricsRes.ok || !alertsRes.ok) {
        throw new Error('Erro ao buscar dados');
      }

      const [kpisData, metricsData, alertsData] = await Promise.all([
        kpisRes.json(),
        metricsRes.json(),
        alertsRes.json(),
      ]);

      setState((prev) => ({
        ...prev,
        kpis: kpisData.data,
        dailyActivity: metricsData.data?.dailyActivity || [],
        condominioHealth: metricsData.data?.condominioHealth || [],
        alerts: alertsData.data || [],
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

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchData();
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchData]);

  return {
    ...state,
    setTimeRange,
    fetchData,
    refreshViews,
  };
}
