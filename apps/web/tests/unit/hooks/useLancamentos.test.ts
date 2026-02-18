import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = Record<string, unknown>;

function createAwaitableQuery(response: { data: unknown; error: unknown; count?: number }) {
  const query: {
    eq: ReturnType<typeof vi.fn>;
    is: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    range: ReturnType<typeof vi.fn>;
    gte: ReturnType<typeof vi.fn>;
    lte: ReturnType<typeof vi.fn>;
    or: ReturnType<typeof vi.fn>;
    then: (resolve: (value: { data: unknown; error: unknown; count?: number }) => unknown) => Promise<unknown>;
  } = {
    eq: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    or: vi.fn(),
    then: (resolve) => Promise.resolve(resolve(response)),
  };

  query.eq.mockReturnValue(query);
  query.is.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.range.mockReturnValue(query);
  query.gte.mockReturnValue(query);
  query.lte.mockReturnValue(query);
  query.or.mockReturnValue(query);

  return query;
}

const sanitizeSearchQuery = vi.fn((value: string) => value.trim());
const mockFrom = vi.fn();

let dbRows: Row[] = [];
let failFetch = false;
let failInsert = false;
let failUpdate = false;
let failDelete = false;

vi.mock('@/lib/sanitize', () => ({
  sanitizeSearchQuery,
}));

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    from: mockFrom,
  }),
}));

describe('useLancamentos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbRows = [
      {
        id: 'l-1',
        descricao: 'Conta de agua',
        fornecedor: 'Saneamento',
        status: 'pendente',
        valor: 120,
      },
    ];
    failFetch = false;
    failInsert = false;
    failUpdate = false;
    failDelete = false;

    mockFrom.mockImplementation((table: string) => {
      if (table !== 'lancamentos_financeiros') {
        throw new Error(`Tabela inesperada: ${table}`);
      }

      return {
        select: vi.fn(() => {
          if (failFetch) {
            return createAwaitableQuery({
              data: null,
              error: new Error('fetch failed'),
              count: 0,
            });
          }
          return createAwaitableQuery({
            data: dbRows,
            error: null,
            count: dbRows.length,
          });
        }),
        insert: vi.fn((payload: Row) => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => {
              if (failInsert) return { data: null, error: new Error('insert failed') };
              const inserted = { id: `l-${dbRows.length + 1}`, ...payload };
              dbRows = [inserted, ...dbRows];
              return { data: inserted, error: null };
            }),
          })),
        })),
        update: vi.fn((payload: Row) => ({
          eq: vi.fn((_col: string, id: string) => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => {
                if (failUpdate) return { data: null, error: new Error('update failed') };
                dbRows = dbRows.map((row) => (row.id === id ? { ...row, ...payload } : row));
                const updated = dbRows.find((row) => row.id === id) || null;
                return { data: updated, error: null };
              }),
            })),
            then: (resolve: (value: { error: unknown }) => unknown) => {
              if (failDelete) return Promise.resolve(resolve({ error: new Error('delete failed') }));
              dbRows = dbRows.map((row) => (row.id === id ? { ...row, ...payload } : row));
              if ('deleted_at' in payload) {
                dbRows = dbRows.filter((row) => row.id !== id);
              }
              return Promise.resolve(resolve({ error: null }));
            },
          })),
        })),
      };
    });
  });

  it('busca lancamentos com filtros e atualiza paginacao', async () => {
    const { useLancamentos } = await import('@/hooks/useLancamentos');
    const { result } = renderHook(() => useLancamentos());

    await act(async () => {
      const response = await result.current.fetchLancamentos('c-1', {
        page: 2,
        pageSize: 10,
        busca: '  agua  ',
        status: 'pendente',
      });
      expect(response.total).toBe(1);
      expect(response.data).toHaveLength(1);
    });

    expect(sanitizeSearchQuery).toHaveBeenCalledWith('  agua  ');
    expect(result.current.pagination.page).toBe(2);
    expect(result.current.pagination.pageSize).toBe(10);
    expect(result.current.error).toBeNull();
  });

  it('retorna vazio e seta erro em falha no fetch', async () => {
    failFetch = true;
    const { useLancamentos } = await import('@/hooks/useLancamentos');
    const { result } = renderHook(() => useLancamentos());

    await act(async () => {
      const response = await result.current.fetchLancamentos('c-1');
      expect(response.data).toEqual([]);
      expect(response.total).toBe(0);
    });

    expect(result.current.error).toContain('fetch failed');
  });

  it('cria, atualiza, confirma e deleta lancamento', async () => {
    const { useLancamentos } = await import('@/hooks/useLancamentos');
    const { result } = renderHook(() => useLancamentos());

    let createdId = '';
    await act(async () => {
      const created = await result.current.createLancamento('c-1', 'u-1', {
        tipo: 'despesa',
        categoria_id: 'cat-1',
        valor: 89.5,
        data_competencia: '2026-02-01',
        descricao: 'Internet',
      });
      expect(created).toBeTruthy();
      createdId = String(created?.id);
    });

    await act(async () => {
      const updated = await result.current.updateLancamento({
        id: createdId,
        descricao: 'Internet Fibra',
      });
      expect(updated?.descricao).toBe('Internet Fibra');
    });

    await act(async () => {
      const confirmado = await result.current.confirmarLancamento(createdId, 'admin-1');
      expect(confirmado).toBe(true);
    });

    await act(async () => {
      const deleted = await result.current.deleteLancamento(createdId);
      expect(deleted).toBe(true);
    });

    expect(result.current.error).toBeNull();
  });

  it('retorna null na criacao quando insert falha', async () => {
    failInsert = true;
    const { useLancamentos } = await import('@/hooks/useLancamentos');
    const { result } = renderHook(() => useLancamentos());

    await act(async () => {
      const created = await result.current.createLancamento('c-1', 'u-1', {
        tipo: 'receita',
        categoria_id: 'cat-1',
        valor: 10,
        data_competencia: '2026-02-01',
        descricao: 'Teste',
      });
      expect(created).toBeNull();
    });

    expect(result.current.error).toContain('insert failed');
  });

  it('retorna false na exclusao quando update falha', async () => {
    failDelete = true;
    const { useLancamentos } = await import('@/hooks/useLancamentos');
    const { result } = renderHook(() => useLancamentos());

    await act(async () => {
      const deleted = await result.current.deleteLancamento('l-1');
      expect(deleted).toBe(false);
    });

    expect(result.current.error).toContain('delete failed');
  });
});
