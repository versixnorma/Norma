import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createBuilder = (data: any, error: any = null) => {
  const builder: any = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve({ data, error })),
    then: (resolve: any) => Promise.resolve(resolve({ data, error, count: data?.length ?? 0 })),
  };
  return builder;
};

const mockSupabase = { from: vi.fn(() => createBuilder([])) };

vi.mock('@/lib/supabase', () => ({ getSupabaseClient: () => mockSupabase }));
vi.mock('@/lib/errors', () => ({
  getErrorMessage: (err: any) => err?.message ?? 'Erro desconhecido',
}));

describe('useMarketplace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(createBuilder([]));
  });

  it('inicia com estado vazio', async () => {
    const { useMarketplace } = await import('@/hooks/useMarketplace');
    const { result } = renderHook(() => useMarketplace());
    expect(result.current.partners).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetchPartners retorna parceiros com sucesso', async () => {
    const mockPartners = [{ id: '1', name: 'Parceiro Teste' }];
    mockSupabase.from.mockReturnValue(createBuilder(mockPartners));
    const { useMarketplace } = await import('@/hooks/useMarketplace');
    const { result } = renderHook(() => useMarketplace());

    await act(async () => {
      await result.current.fetchPartners();
    });

    expect(result.current.partners).toEqual(mockPartners);
    expect(result.current.loading).toBe(false);
  });

  it('fetchPartners trata erro', async () => {
    mockSupabase.from.mockReturnValue(createBuilder(null, { message: 'Falha na rede' }));
    const { useMarketplace } = await import('@/hooks/useMarketplace');
    const { result } = renderHook(() => useMarketplace());

    await act(async () => {
      await result.current.fetchPartners();
    });

    expect(result.current.error).toBeTruthy();
  });

  it('createPartner adiciona parceiro à lista', async () => {
    const newPartner = { id: '2', name: 'Novo Parceiro' };
    mockSupabase.from.mockReturnValue(createBuilder(newPartner));
    const { useMarketplace } = await import('@/hooks/useMarketplace');
    const { result } = renderHook(() => useMarketplace());

    await act(async () => {
      await result.current.createPartner({ name: 'Novo Parceiro' } as any);
    });

    expect(result.current.partners).toContainEqual(newPartner);
  });

  it('deletePartner remove parceiro da lista', async () => {
    const partners = [{ id: '1', name: 'P1' }];
    mockSupabase.from
      .mockReturnValueOnce(createBuilder(partners))
      .mockReturnValue(createBuilder(null));
    const { useMarketplace } = await import('@/hooks/useMarketplace');
    const { result } = renderHook(() => useMarketplace());

    await act(async () => {
      await result.current.fetchPartners();
    });
    expect(result.current.partners).toHaveLength(1);

    await act(async () => {
      await result.current.deletePartner('1');
    });
    expect(result.current.partners).toHaveLength(0);
  });

  it('fetchMetrics calcula métricas com Promise.all', async () => {
    const mockResponses = [
      createBuilder([], null),
      createBuilder([], null),
      createBuilder([], null),
      createBuilder([], null),
      createBuilder([{ final_amount: 100, transaction_date: new Date().toISOString() }], null),
      createBuilder([{ partner: { category: 'Food' } }], null),
    ];
    let i = 0;
    mockSupabase.from.mockImplementation(() => {
      const b = mockResponses[i] || createBuilder([]);
      i = (i + 1) % mockResponses.length;
      return b;
    });
    const { useMarketplace } = await import('@/hooks/useMarketplace');
    const { result } = renderHook(() => useMarketplace());

    await act(async () => {
      await result.current.fetchMetrics();
    });

    expect(result.current.metrics).not.toBeNull();
  });

  it('derived flags refletem estado', async () => {
    mockSupabase.from.mockReturnValue(createBuilder([{ id: '1' }]));
    const { useMarketplace } = await import('@/hooks/useMarketplace');
    const { result } = renderHook(() => useMarketplace());

    await act(async () => {
      await result.current.fetchPartners();
    });

    expect(result.current.derived.hasPartners).toBe(true);
  });
});
