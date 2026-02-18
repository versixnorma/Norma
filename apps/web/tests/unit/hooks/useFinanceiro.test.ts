import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSelect = vi.fn();
const mockFrom = vi.fn(() => ({
  select: mockSelect,
}));

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    from: mockFrom,
  }),
}));

describe('useFinanceiro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: successful empty response
    mockSelect.mockReturnValue({
      eq: vi.fn(() => ({
        is: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              data: [],
              error: null,
            })),
          })),
        })),
      })),
    });
  });

  it('inicia com loading false e sem erro', async () => {
    const { useFinanceiro } = await import('@/hooks/useFinanceiro');
    const { result } = renderHook(() => useFinanceiro());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetchCategorias retorna array vazio quando sem dados', async () => {
    const { useFinanceiro } = await import('@/hooks/useFinanceiro');
    const { result } = renderHook(() => useFinanceiro());

    let categorias: unknown[];
    await act(async () => {
      categorias = await result.current.fetchCategorias('condo-1');
    });

    expect(categorias!).toEqual([]);
  });

  it('fetchCategorias trata erro do Supabase', async () => {
    mockSelect.mockReturnValue({
      eq: vi.fn(() => ({
        is: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              data: null,
              error: { message: 'DB error' },
            })),
          })),
        })),
      })),
    });

    const { useFinanceiro } = await import('@/hooks/useFinanceiro');
    const { result } = renderHook(() => useFinanceiro());

    let categorias: unknown[];
    await act(async () => {
      categorias = await result.current.fetchCategorias('condo-1');
    });

    expect(categorias!).toEqual([]);
    expect(result.current.error).toBeTruthy();
  });
});
