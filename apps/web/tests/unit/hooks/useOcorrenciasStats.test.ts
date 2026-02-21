import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createBuilder = (data: any, error: any = null) => {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    then: (resolve: any) => Promise.resolve(resolve({ data, error })),
  };
  return builder;
};

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };
vi.mock('@/lib/supabase', () => ({ getSupabaseClient: () => mockSupabase }));

const now = new Date().toISOString();
const twoHoursAgo = new Date(Date.now() - 7200000).toISOString();

describe('useOcorrenciasStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(createBuilder([]));
  });

  it('inicia com loading false e sem erro', async () => {
    const { useOcorrenciasStats } = await import('@/hooks/useOcorrenciasStats');
    const { result } = renderHook(() => useOcorrenciasStats());
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('getStats retorna null quando data é null', async () => {
    mockFrom.mockReturnValue(createBuilder(null));
    const { useOcorrenciasStats } = await import('@/hooks/useOcorrenciasStats');
    const { result } = renderHook(() => useOcorrenciasStats());

    let stats: any;
    await act(async () => {
      stats = await result.current.getStats('cond-1');
    });

    expect(stats).toBeNull();
  });

  it('getStats agrega totais por status', async () => {
    const rows = [
      {
        status: 'aberta',
        categoria: 'hidraulica',
        prioridade: 'alta',
        created_at: twoHoursAgo,
        resolvido_em: null,
      },
      {
        status: 'em_andamento',
        categoria: 'eletrica',
        prioridade: 'media',
        created_at: twoHoursAgo,
        resolvido_em: null,
      },
      {
        status: 'resolvida',
        categoria: 'hidraulica',
        prioridade: 'baixa',
        created_at: twoHoursAgo,
        resolvido_em: now,
      },
    ];
    mockFrom.mockReturnValue(createBuilder(rows));
    const { useOcorrenciasStats } = await import('@/hooks/useOcorrenciasStats');
    const { result } = renderHook(() => useOcorrenciasStats());

    let stats: any;
    await act(async () => {
      stats = await result.current.getStats('cond-1');
    });

    expect(stats).not.toBeNull();
    expect(stats.total).toBe(3);
    expect(stats.abertas).toBe(1);
    expect(stats.em_andamento).toBe(1);
    expect(stats.resolvidas).toBe(1);
    expect(stats.por_categoria.hidraulica).toBe(2);
    expect(stats.por_prioridade.alta).toBe(1);
  });

  it('getStats calcula tempo médio de resolução', async () => {
    const rows = [
      {
        status: 'resolvida',
        categoria: 'geral',
        prioridade: 'alta',
        created_at: twoHoursAgo,
        resolvido_em: now,
      },
    ];
    mockFrom.mockReturnValue(createBuilder(rows));
    const { useOcorrenciasStats } = await import('@/hooks/useOcorrenciasStats');
    const { result } = renderHook(() => useOcorrenciasStats());

    let stats: any;
    await act(async () => {
      stats = await result.current.getStats('cond-1');
    });

    expect(stats.tempo_medio_resolucao_horas).toBeCloseTo(2, 0);
  });

  it('getStats com lista vazia retorna zeros', async () => {
    mockFrom.mockReturnValue(createBuilder([]));
    const { useOcorrenciasStats } = await import('@/hooks/useOcorrenciasStats');
    const { result } = renderHook(() => useOcorrenciasStats());

    let stats: any;
    await act(async () => {
      stats = await result.current.getStats('cond-1');
    });

    expect(stats.total).toBe(0);
    expect(stats.tempo_medio_resolucao_horas).toBeNull();
  });
});
