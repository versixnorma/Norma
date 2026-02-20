import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    from: mockFrom,
  }),
}));

function awaitable(response: any) {
  const chain: any = {
    select: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(response)),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    in: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    then: (resolve: any) => Promise.resolve(resolve(response)),
  };
  return chain;
}

describe('useObservabilidade hooks', () => {
  let qc: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    qc = new QueryClient();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'v_system_status') {
        return awaitable({ data: { status_geral: 'ok', endpoints: [] } });
      }

      if (table === 'alertas_sistema') {
        return awaitable({ data: [] });
      }

      if (table === 'v_alertas_resumo') {
        return awaitable({ data: [] });
      }

      if (table === 'metricas_globais') {
        return awaitable({ data: { total_condominios_ativos: 1 } });
      }

      if (table === 'metricas_uso') {
        return awaitable({ data: [] });
      }

      if (table === 'metricas_performance') {
        return awaitable({ data: [] });
      }

      if (table === 'uptime_checks') {
        return awaitable({ data: [] });
      }

      // default
      return awaitable({ data: [] });
    });
  });

  it('useObservabilidadeDashboard returns data', async () => {
    const wrapper = ({ children }: any) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { useObservabilidadeDashboard } = await import('@/hooks/useObservabilidade');
    const { result } = renderHook(() => useObservabilidadeDashboard(), { wrapper });

    await waitFor(
      () => {
        return result.current.isSuccess === true || !!result.current.data;
      },
      { timeout: 3000 }
    );

    expect(result.current.data).toBeDefined();
    expect(result.current.data.status.status_geral).toBe('ok');
  });
});
