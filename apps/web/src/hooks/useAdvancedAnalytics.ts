'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  FunnelStep,
  CohortRow,
  RetentionPoint,
  TimeRange,
} from '@/lib/services/analyticsService';

type AnalyticsTab = 'funnel' | 'cohort' | 'retention';

interface AdvancedAnalyticsState {
  activeTab: AnalyticsTab;
  funnel: FunnelStep[];
  cohort: CohortRow[];
  retention: RetentionPoint[];
  loading: boolean;
  error: string | null;
  timeRange: TimeRange;
}

export function useAdvancedAnalytics() {
  const [state, setState] = useState<AdvancedAnalyticsState>({
    activeTab: 'funnel',
    funnel: [],
    cohort: [],
    retention: [],
    loading: false,
    error: null,
    timeRange: '30d',
  });

  const setActiveTab = useCallback((activeTab: AnalyticsTab) => {
    setState((prev) => ({ ...prev, activeTab }));
  }, []);

  const setTimeRange = useCallback((timeRange: TimeRange) => {
    setState((prev) => ({ ...prev, timeRange }));
  }, []);

  const fetchTabData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const params = `timeRange=${state.timeRange}`;
      const url = `/api/admin/analytics/${state.activeTab}?${params}`;
      const res = await fetch(url);

      if (!res.ok) throw new Error('Erro ao buscar dados');

      const json = await res.json();

      setState((prev) => ({
        ...prev,
        [state.activeTab]: json.data || [],
        loading: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Erro desconhecido',
        loading: false,
      }));
    }
  }, [state.activeTab, state.timeRange]);

  useEffect(() => {
    fetchTabData();
  }, [fetchTabData]);

  return {
    ...state,
    setActiveTab,
    setTimeRange,
    fetchTabData,
  };
}
