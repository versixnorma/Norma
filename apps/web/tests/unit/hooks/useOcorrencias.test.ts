import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createBuilder = (data: any, error: any = null, count: number | null = null) => {
  const builder: any = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    or: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve({ data, error })),
    then: (resolve: any) =>
      Promise.resolve(resolve({ data, error, count: count ?? data?.length ?? null })),
  };
  return builder;
};

const mockSupabase = { from: vi.fn(), rpc: vi.fn().mockResolvedValue({ data: null, error: null }) };

vi.mock('@/lib/supabase', () => ({ getSupabaseClient: () => mockSupabase }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), debug: vi.fn(), warn: vi.fn() } }));
vi.mock('@/lib/errors', () => ({ getErrorMessage: (err: any) => err?.message ?? 'Erro' }));
vi.mock('@/lib/type-helpers', () => ({
  parseAnexos: (a: any) => a || [],
  serializeAnexos: (a: any) => a || [],
}));
vi.mock('@/lib/sanitize', () => ({ sanitizeSearchQuery: (q: string) => q }));
vi.mock('@versix/shared/rpc-overrides', () => ({
  rpcSetAppUserId: vi.fn().mockResolvedValue({ data: null, error: null }),
}));
vi.mock('@/hooks/useOcorrenciasStats', () => ({
  useOcorrenciasStats: () => ({ stats: null, loading: false, error: null, getStats: vi.fn() }),
}));

describe('useOcorrencias', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(createBuilder([], null, 0));
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
  });

  it('inicia com estado vazio', async () => {
    const { useOcorrencias } = await import('@/hooks/useOcorrencias');
    const { result } = renderHook(() => useOcorrencias());
    expect(result.current.ocorrencias).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetchOcorrencias retorna dados e atualiza paginacao', async () => {
    const mockData = [
      { id: '1', titulo: 'Ocorrencia 1', anexos: [] },
      { id: '2', titulo: 'Ocorrencia 2', anexos: [] },
    ];
    mockSupabase.from.mockReturnValue(createBuilder(mockData, null, 5));
    const { useOcorrencias } = await import('@/hooks/useOcorrencias');
    const { result } = renderHook(() => useOcorrencias());

    await act(async () => {
      await result.current.fetchOcorrencias('cond-1');
    });

    expect(result.current.ocorrencias).toHaveLength(2);
    expect(result.current.pagination.total).toBe(5);
    expect(result.current.loading).toBe(false);
  });

  it('fetchOcorrencias trata erro do Supabase', async () => {
    mockSupabase.from.mockReturnValue(createBuilder(null, { message: 'DB error' }, null));
    const { useOcorrencias } = await import('@/hooks/useOcorrencias');
    const { result } = renderHook(() => useOcorrencias());

    await act(async () => {
      await result.current.fetchOcorrencias('cond-1');
    });

    expect(result.current.ocorrencias).toEqual([]);
    expect(result.current.error).toBeTruthy();
  });

  it('createOcorrencia adiciona ao estado', async () => {
    const newItem = { id: '3', titulo: 'Nova', anexos: [] };
    mockSupabase.from.mockReturnValue(createBuilder(newItem));
    const { useOcorrencias } = await import('@/hooks/useOcorrencias');
    const { result } = renderHook(() => useOcorrencias());

    await act(async () => {
      await result.current.createOcorrencia('cond-1', 'user-1', {
        titulo: 'Teste',
        descricao: 'Desc',
        categoria: 'manutencao',
        prioridade: 'media',
        anexos: [],
      });
    });

    expect(result.current.ocorrencias.length).toBeGreaterThan(0);
    expect(result.current.ocorrencias[0].id).toBe('3');
  });

  it('deleteOcorrencia remove do estado local', async () => {
    const mockData = [{ id: '1', titulo: 'Ocorrencia', anexos: [] }];
    mockSupabase.from
      .mockReturnValueOnce(createBuilder(mockData, null, 1))
      .mockReturnValue(createBuilder(null, null));
    const { useOcorrencias } = await import('@/hooks/useOcorrencias');
    const { result } = renderHook(() => useOcorrencias());

    await act(async () => {
      await result.current.fetchOcorrencias('cond-1');
    });
    expect(result.current.ocorrencias).toHaveLength(1);

    await act(async () => {
      await result.current.deleteOcorrencia('1');
    });
    expect(result.current.ocorrencias).toHaveLength(0);
  });

  it('updateOcorrencia atualiza item no estado', async () => {
    const updatedItem = { id: '1', titulo: 'Atualizado', status: 'em_andamento', anexos: [] };
    mockSupabase.from.mockReturnValue(createBuilder(updatedItem));
    const { useOcorrencias } = await import('@/hooks/useOcorrencias');
    const { result } = renderHook(() => useOcorrencias());

    await act(async () => {
      await result.current.updateOcorrencia({ id: '1', status: 'em_andamento' } as any, 'user-1');
    });

    expect(result.current.error).toBeNull();
  });
});
