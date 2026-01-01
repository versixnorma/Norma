// =====================================================
// SPRINT 10: useHealthCheck Hook
// Verificação de saúde do sistema
// =====================================================

import { getSupabaseClient } from '@/lib/supabase';
import type { CheckResult, HealthCheckResponse } from '@/types/observabilidade';
import { useQuery } from '@tanstack/react-query';

// =====================================================
// HEALTH CHECK HOOK
// =====================================================

export function useHealthCheck() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async (): Promise<HealthCheckResponse> => {
      const { data, error } = await getSupabaseClient().functions.invoke('health');

      if (error) {
        // Se falhou, retornar status unhealthy
        return {
          status: 'unhealthy',
          checks: {
            database: { status: 'error', latencyMs: 0, message: 'Falha ao conectar' },
            auth: { status: 'error', latencyMs: 0, message: 'Falha ao conectar' },
            storage: { status: 'error', latencyMs: 0, message: 'Falha ao conectar' },
          },
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        };
      }

      return data as HealthCheckResponse;
    },
    refetchInterval: 60000, // 1 minuto
    staleTime: 30000,
    retry: 1,
  });
}

// =====================================================
// INDIVIDUAL CHECKS
// =====================================================

export function useDatabaseHealth() {
  return useQuery({
    queryKey: ['health', 'database'],
    queryFn: async (): Promise<CheckResult> => {
      const start = Date.now();

      try {
        const { error } = await getSupabaseClient()
          .from('condominios')
          .select('id')
          .limit(1)
          .single();

        return {
          status: error ? 'degraded' : 'ok',
          latencyMs: Date.now() - start,
          message: error?.message,
        };
      } catch (err) {
        return {
          status: 'error',
          latencyMs: Date.now() - start,
          message: err instanceof Error ? err.message : 'Erro desconhecido',
        };
      }
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

export function useAuthHealth() {
  return useQuery({
    queryKey: ['health', 'auth'],
    queryFn: async (): Promise<CheckResult> => {
      const start = Date.now();

      try {
        const { error } = await getSupabaseClient().auth.getSession();

        return {
          status: error ? 'degraded' : 'ok',
          latencyMs: Date.now() - start,
          message: error?.message,
        };
      } catch (err) {
        return {
          status: 'error',
          latencyMs: Date.now() - start,
          message: err instanceof Error ? err.message : 'Erro desconhecido',
        };
      }
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useStorageHealth() {
  return useQuery({
    queryKey: ['health', 'storage'],
    queryFn: async (): Promise<CheckResult> => {
      const start = Date.now();

      try {
        const { error } = await getSupabaseClient().storage.listBuckets();

        return {
          status: error ? 'degraded' : 'ok',
          latencyMs: Date.now() - start,
          message: error?.message,
        };
      } catch (err) {
        return {
          status: 'degraded',
          latencyMs: Date.now() - start,
          message: err instanceof Error ? err.message : 'Erro desconhecido',
        };
      }
    },
    refetchInterval: 120000, // 2 minutos
    staleTime: 60000,
  });
}

// =====================================================
// CONNECTIVITY CHECK
// =====================================================

export function useConnectivityCheck() {
  return useQuery({
    queryKey: ['connectivity'],
    queryFn: async () => {
      // Verificar se está online
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        return { connected: false, latency: null };
      }

      // Ping simples
      const start = Date.now();
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
          method: 'HEAD',
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          },
        });

        return {
          connected: true,
          latency: Date.now() - start,
        };
      } catch {
        return { connected: false, latency: null };
      }
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

// =====================================================
// AGGREGATED HEALTH STATUS
// =====================================================

export function useSystemHealthStatus() {
  const { data: health, isLoading } = useHealthCheck();
  const { data: connectivity } = useConnectivityCheck();

  // Determinar status geral
  const getOverallStatus = () => {
    if (!connectivity?.connected) return 'offline';
    if (!health) return 'unknown';
    return health.status;
  };

  // Contar checks por status
  const getChecksSummary = () => {
    if (!health?.checks) return { ok: 0, degraded: 0, error: 0 };

    const checks = Object.values(health.checks);
    return {
      ok: checks.filter((c: any) => c.status === 'ok').length,
      degraded: checks.filter((c: any) => c.status === 'degraded').length,
      error: checks.filter((c: any) => c.status === 'error').length,
    };
  };

  // Latência média
  const getAverageLatency = () => {
    if (!health?.checks) return 0;

    const latencies = Object.values(health.checks)
      .map((c: any) => c.latencyMs)
      .filter((l: number) => l > 0);

    return latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;
  };

  return {
    status: getOverallStatus(),
    isLoading,
    isOnline: connectivity?.connected ?? true,
    networkLatency: connectivity?.latency,
    checks: health?.checks,
    summary: getChecksSummary(),
    averageLatency: getAverageLatency(),
    version: health?.version,
    lastCheck: health?.timestamp,
  };
}

// =====================================================
// STATUS COLOR HELPERS
// =====================================================

export function getStatusColor(status: string): string {
  switch (status) {
    case 'healthy':
    case 'ok':
      return 'text-green-600 bg-green-100';
    case 'degraded':
      return 'text-yellow-600 bg-yellow-100';
    case 'unhealthy':
    case 'error':
      return 'text-red-600 bg-red-100';
    case 'offline':
      return 'text-gray-600 bg-gray-100';
    default:
      return 'text-gray-500 bg-gray-50';
  }
}

export function getStatusIcon(status: string): string {
  switch (status) {
    case 'healthy':
    case 'ok':
      return '✓';
    case 'degraded':
      return '⚠';
    case 'unhealthy':
    case 'error':
      return '✗';
    case 'offline':
      return '◯';
    default:
      return '?';
  }
}

export function getStatusText(status: string): string {
  switch (status) {
    case 'healthy':
      return 'Saudável';
    case 'ok':
      return 'OK';
    case 'degraded':
      return 'Degradado';
    case 'unhealthy':
      return 'Indisponível';
    case 'error':
      return 'Erro';
    case 'offline':
      return 'Offline';
    default:
      return 'Desconhecido';
  }
}
