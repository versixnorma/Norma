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
    single: vi.fn(() => Promise.resolve({ data, error })),
    then: (resolve: any) =>
      Promise.resolve(resolve({ data, error, count: count ?? data?.length ?? null })),
  };
  return builder;
};

const mockSupabase = { from: vi.fn() };

vi.mock('@/lib/supabase', () => ({ getSupabaseClient: () => mockSupabase }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/lib/errors', () => ({ getErrorMessage: (err: any) => err?.message ?? 'Erro' }));
vi.mock('@/lib/type-helpers', () => ({
  parseAnexos: (a: any) => a || [],
  serializeAnexos: (a: any) => a || [],
}));
vi.mock('@/lib/sanitize', () => ({ sanitizeSearchQuery: (q: string) => q }));

describe('useChamados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(createBuilder([], null, 0));
  });

  it('inicia com estado vazio', async () => {
    const { useChamados } = await import('@/hooks/useChamados');
    const { result } = renderHook(() => useChamados());
    expect(result.current.chamados).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetchChamados retorna dados e atualiza paginação', async () => {
    const mockData = [
      { id: '1', titulo: 'Chamado 1', anexos: [] },
      { id: '2', titulo: 'Chamado 2', anexos: [] },
    ];
    mockSupabase.from.mockReturnValue(createBuilder(mockData, null, 10));
    const { useChamados } = await import('@/hooks/useChamados');
    const { result } = renderHook(() => useChamados());

    await act(async () => {
      await result.current.fetchChamados('cond-1');
    });

    expect(result.current.chamados).toHaveLength(2);
    expect(result.current.pagination.total).toBe(10);
    expect(result.current.loading).toBe(false);
  });

  it('fetchChamados trata erro do Supabase', async () => {
    mockSupabase.from.mockReturnValue(createBuilder(null, { message: 'DB error' }, null));
    const { useChamados } = await import('@/hooks/useChamados');
    const { result } = renderHook(() => useChamados());

    await act(async () => {
      await result.current.fetchChamados('cond-1');
    });

    expect(result.current.chamados).toEqual([]);
    expect(result.current.error).toBeTruthy();
  });

  it('createChamado adiciona chamado ao estado', async () => {
    const newChamado = { id: '3', titulo: 'Novo', anexos: [] };
    mockSupabase.from.mockReturnValue(createBuilder(newChamado));
    const { useChamados } = await import('@/hooks/useChamados');
    const { result } = renderHook(() => useChamados());

    await act(async () => {
      await result.current.createChamado('cond-1', 'user-1', {
        titulo: 'Teste',
        descricao: 'Desc',
        categoria: 'geral',
        prioridade: 'baixa',
        anexos: [],
      });
    });

    expect(result.current.chamados[0].id).toBe('3');
  });

  it('deleteChamado remove chamado do estado local', async () => {
    const mockData = [{ id: '1', titulo: 'Chamado 1', anexos: [] }];
    mockSupabase.from
      .mockReturnValueOnce(createBuilder(mockData, null, 1))
      .mockReturnValue(createBuilder(null, null));
    const { useChamados } = await import('@/hooks/useChamados');
    const { result } = renderHook(() => useChamados());

    await act(async () => {
      await result.current.fetchChamados('cond-1');
    });
    expect(result.current.chamados).toHaveLength(1);

    await act(async () => {
      await result.current.deleteChamado('1');
    });
    expect(result.current.chamados).toHaveLength(0);
  });

  it('updateChamado atualiza chamado com sucesso', async () => {
    const updatedChamado = { id: '1', titulo: 'Chamado 1', status: 'resolvido', anexos: [] };
    mockSupabase.from.mockReturnValue(createBuilder(updatedChamado, null));
    const { useChamados } = await import('@/hooks/useChamados');
    const { result } = renderHook(() => useChamados());

    await act(async () => {
      await result.current.updateChamado({ id: '1', status: 'resolvido' } as any);
    });

    expect(result.current.error).toBeNull();
  });
});
