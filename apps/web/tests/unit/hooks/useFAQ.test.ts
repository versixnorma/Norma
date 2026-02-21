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
    not: vi.fn(() => builder),
    or: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    overlaps: vi.fn(() => builder),
    rpc: vi.fn(() => Promise.resolve({ data, error })),
    single: vi.fn(() => Promise.resolve({ data, error })),
    then: (resolve: any) =>
      Promise.resolve(resolve({ data, error, count: count ?? data?.length ?? null })),
  };
  return builder;
};

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({ from: mockFrom, rpc: mockRpc }),
}));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/lib/sanitize', () => ({ sanitizeSearchQuery: (q: string) => q }));

const mockFAQ = {
  id: 'faq-1',
  condominio_id: 'cond-1',
  pergunta: 'Como pagar boleto?',
  resposta: 'Acesse o app.',
  categoria: 'financeiro',
  destaque: false,
  ordem: 0,
  visualizacoes: 0,
  votos_util: 0,
  votos_inutil: 0,
  tags: [],
  deleted_at: null,
};

describe('useFAQ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(createBuilder([], null, 0));
    mockRpc.mockResolvedValue({ data: null, error: null });
  });

  it('inicia com estado vazio', async () => {
    const { useFAQ } = await import('@/hooks/useFAQ');
    const { result } = renderHook(() => useFAQ());
    expect(result.current.faqs).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('fetchFAQs retorna lista e atualiza paginação', async () => {
    mockFrom.mockReturnValue(createBuilder([mockFAQ], null, 1));
    const { useFAQ } = await import('@/hooks/useFAQ');
    const { result } = renderHook(() => useFAQ());

    await act(async () => {
      await result.current.fetchFAQs('cond-1');
    });

    expect(result.current.faqs).toHaveLength(1);
    expect(result.current.pagination.total).toBe(1);
    expect(result.current.loading).toBe(false);
  });

  it('fetchFAQs trata erro', async () => {
    mockFrom.mockReturnValue(createBuilder(null, { message: 'Falha' }, null));
    const { useFAQ } = await import('@/hooks/useFAQ');
    const { result } = renderHook(() => useFAQ());

    await act(async () => {
      await result.current.fetchFAQs('cond-1');
    });

    expect(result.current.error).toBeTruthy();
  });

  it('getFAQ retorna FAQ e incrementa visualização', async () => {
    mockFrom.mockReturnValue(createBuilder(mockFAQ));
    const { useFAQ } = await import('@/hooks/useFAQ');
    const { result } = renderHook(() => useFAQ());

    let faq: any;
    await act(async () => {
      faq = await result.current.getFAQ('faq-1');
    });

    expect(faq).not.toBeNull();
    expect(mockFrom).toHaveBeenCalledWith('faq');
  });

  it('createFAQ adiciona FAQ à lista', async () => {
    const novoFAQ = { ...mockFAQ, id: 'faq-2' };
    mockFrom.mockReturnValue(createBuilder(novoFAQ));
    const { useFAQ } = await import('@/hooks/useFAQ');
    const { result } = renderHook(() => useFAQ());

    let created: any;
    await act(async () => {
      created = await result.current.createFAQ('cond-1', 'user-1', {
        pergunta: 'Nova pergunta?',
        resposta: 'Nova resposta.',
      } as any);
    });

    expect(created).not.toBeNull();
    expect(result.current.faqs[0].id).toBe('faq-2');
  });

  it('updateFAQ atualiza FAQ na lista', async () => {
    mockFrom
      .mockReturnValueOnce(createBuilder([mockFAQ], null, 1))
      .mockReturnValue(createBuilder({ ...mockFAQ, pergunta: 'Atualizado?' }));
    const { useFAQ } = await import('@/hooks/useFAQ');
    const { result } = renderHook(() => useFAQ());

    await act(async () => {
      await result.current.fetchFAQs('cond-1');
    });

    let updated: any;
    await act(async () => {
      updated = await result.current.updateFAQ({ id: 'faq-1', pergunta: 'Atualizado?' });
    });

    expect(updated).not.toBeNull();
    expect(result.current.faqs[0].pergunta).toBe('Atualizado?');
  });

  it('deleteFAQ remove FAQ da lista', async () => {
    mockFrom
      .mockReturnValueOnce(createBuilder([mockFAQ], null, 1))
      .mockReturnValue(createBuilder(null));
    const { useFAQ } = await import('@/hooks/useFAQ');
    const { result } = renderHook(() => useFAQ());

    await act(async () => {
      await result.current.fetchFAQs('cond-1');
    });
    expect(result.current.faqs).toHaveLength(1);

    await act(async () => {
      await result.current.deleteFAQ('faq-1');
    });
    expect(result.current.faqs).toHaveLength(0);
  });

  it('voteUseful atualiza votos localmente', async () => {
    mockFrom.mockReturnValue(createBuilder([{ ...mockFAQ, votos_util: 0 }], null, 1));
    mockRpc.mockResolvedValue({ data: null, error: null });
    const { useFAQ } = await import('@/hooks/useFAQ');
    const { result } = renderHook(() => useFAQ());

    await act(async () => {
      await result.current.fetchFAQs('cond-1');
    });

    let ok: boolean;
    await act(async () => {
      ok = await result.current.voteUseful('faq-1', true);
    });

    expect(ok!).toBe(true);
    expect(result.current.faqs[0].votos_util).toBe(1);
  });

  it('getCategorias retorna lista única de categorias', async () => {
    mockFrom.mockReturnValue(
      createBuilder([{ categoria: 'financeiro' }, { categoria: 'segurança' }])
    );
    const { useFAQ } = await import('@/hooks/useFAQ');
    const { result } = renderHook(() => useFAQ());

    let cats: string[];
    await act(async () => {
      cats = await result.current.getCategorias('cond-1');
    });

    expect(cats!).toContain('financeiro');
    expect(cats!).toContain('segurança');
  });
});
