import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();
const mockRpc = vi.fn();

function awaitable<T extends object>(response: T) {
  const chain: Record<string, unknown> = {
    eq: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    in: vi.fn(),
    gte: vi.fn(),
    lt: vi.fn(),
    limit: vi.fn(),
    select: vi.fn(),
    then: (resolve: (value: T) => unknown) => Promise.resolve(resolve(response)),
  };

  (chain.eq as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  (chain.is as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  (chain.order as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  (chain.in as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  (chain.gte as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  (chain.lt as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  (chain.limit as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  (chain.select as ReturnType<typeof vi.fn>).mockReturnValue(chain);

  return chain;
}

let failCategorias = false;
let failContas = false;
let failRpc = false;

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    from: mockFrom,
    rpc: mockRpc,
  }),
}));

describe('useDashboardFinanceiro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    failCategorias = false;
    failContas = false;
    failRpc = false;

    mockRpc.mockImplementation(async () => {
      if (failRpc) return { data: null, error: new Error('rpc failed') };
      return {
        data: [{ saldo_atual: 900, total_receitas: 1200, total_despesas: 300 }],
        error: null,
      };
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'categorias_financeiras') {
        if (failCategorias) {
          return {
            select: vi.fn(() =>
              awaitable({
                data: null,
                error: new Error('categorias failed'),
              })
            ),
          };
        }
        return {
          select: vi.fn(() =>
            awaitable({
              data: [
                { id: 'cat-root', nome: 'Despesas Gerais', parent_id: null, tipo: 'despesa' },
                { id: 'cat-child', nome: 'Agua', parent_id: 'cat-root', tipo: 'despesa' },
              ],
              error: null,
            })
          ),
        };
      }

      if (table === 'contas_bancarias') {
        if (failContas) {
          return {
            select: vi.fn(() =>
              awaitable({
                data: null,
                error: new Error('contas failed'),
              })
            ),
          };
        }
        return {
          select: vi.fn(() =>
            awaitable({
              data: [{ id: 'cb-1', saldo_atual: 200 }],
              error: null,
            })
          ),
        };
      }

      if (table === 'lancamentos_financeiros') {
        return {
          select: vi.fn((columns: string) => {
            if (columns.includes('categoria:categoria_id (nome)')) {
              return awaitable({
                data: [
                  { valor: 100, categoria: { nome: 'Operacao' } },
                  { valor: 50, categoria: { nome: 'Operacao' } },
                  { valor: 50, categoria: null },
                ],
                error: null,
              });
            }

            return awaitable({
              data: [
                { id: 'l-1', valor: 100, status: 'confirmado' },
                { id: 'l-2', valor: 120, status: 'confirmado' },
              ],
              error: null,
            });
          }),
        };
      }

      if (table === 'taxas_unidades') {
        return {
          select: vi.fn(() =>
            awaitable({
              data: [
                { status: 'atrasado', valor_final: 300 },
                { status: 'pendente', valor_final: 100 },
              ],
              error: null,
            })
          ),
        };
      }

      if (table === 'unidades_habitacionais') {
        return {
          select: vi.fn(() =>
            awaitable({
              data: null,
              error: null,
              count: 10,
            })
          ),
        };
      }

      throw new Error(`Tabela inesperada: ${table}`);
    });
  });

  it('fetchCategorias monta estrutura hierarquica', async () => {
    const { useDashboardFinanceiro } = await import('@/hooks/useDashboardFinanceiro');
    const { result } = renderHook(() => useDashboardFinanceiro());

    let categorias: unknown[] = [];
    await act(async () => {
      categorias = await result.current.fetchCategorias('c-1', 'despesa');
    });

    expect(categorias).toHaveLength(1);
    expect((categorias[0] as { children: unknown[] }).children).toHaveLength(1);
  });

  it('retorna [] e seta erro quando categorias falham', async () => {
    failCategorias = true;
    const { useDashboardFinanceiro } = await import('@/hooks/useDashboardFinanceiro');
    const { result } = renderHook(() => useDashboardFinanceiro());

    await act(async () => {
      const categorias = await result.current.fetchCategorias('c-1');
      expect(categorias).toEqual([]);
    });

    expect(result.current.error).toContain('categorias failed');
  });

  it('calcula saldo via rpc e retorna dashboard consolidado', async () => {
    const { useDashboardFinanceiro } = await import('@/hooks/useDashboardFinanceiro');
    const { result } = renderHook(() => useDashboardFinanceiro());

    await act(async () => {
      const saldo = await result.current.calcularSaldoPeriodo('c-1', '2026-02-01');
      expect(saldo?.saldo_atual).toBe(900);
    });

    await act(async () => {
      const dashboard = await result.current.getDashboard('c-1');
      expect(dashboard?.saldo_atual).toBe(900);
      expect(dashboard?.receitas_mes).toBe(1200);
      expect(dashboard?.despesas_mes).toBe(300);
      expect(dashboard?.inadimplencia.unidades_inadimplentes).toBe(1);
      expect(dashboard?.despesas_por_categoria).toHaveLength(2);
      expect(dashboard?.ultimos_lancamentos).toHaveLength(2);
    });
  });

  it('retorna null no saldo quando rpc falha', async () => {
    failRpc = true;
    const { useDashboardFinanceiro } = await import('@/hooks/useDashboardFinanceiro');
    const { result } = renderHook(() => useDashboardFinanceiro());

    await act(async () => {
      const saldo = await result.current.calcularSaldoPeriodo('c-1', '2026-02-01');
      expect(saldo).toBeNull();
    });

    expect(result.current.error).toContain('rpc failed');
  });

  it('retorna [] quando contas falham', async () => {
    failContas = true;
    const { useDashboardFinanceiro } = await import('@/hooks/useDashboardFinanceiro');
    const { result } = renderHook(() => useDashboardFinanceiro());

    await act(async () => {
      const contas = await result.current.fetchContas('c-1');
      expect(contas).toEqual([]);
    });

    expect(result.current.error).toContain('contas failed');
  });
});
