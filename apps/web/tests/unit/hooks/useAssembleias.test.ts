import { renderHook, act } from '@testing-library/react';
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

describe('useAssembleias', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    });
  });

  it('inicia com loading false e assembleias vazio', async () => {
    const { useAssembleias } = await import('@/hooks/useAssembleias');
    const { result } = renderHook(() => useAssembleias());

    expect(result.current.loading).toBe(false);
    expect(result.current.assembleias).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('fetchAssembleias retorna array e seta loading', async () => {
    const { useAssembleias } = await import('@/hooks/useAssembleias');
    const { result } = renderHook(() => useAssembleias());

    let assembleias: unknown[];
    await act(async () => {
      assembleias = await result.current.fetchAssembleias('condo-1');
    });

    expect(assembleias!).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('fetchAssembleias trata erro do Supabase', async () => {
    mockSelect.mockReturnValue({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({
          data: null,
          error: { message: 'Query failed' },
        })),
      })),
    });

    const { useAssembleias } = await import('@/hooks/useAssembleias');
    const { result } = renderHook(() => useAssembleias());

    let assembleias: unknown[];
    await act(async () => {
      assembleias = await result.current.fetchAssembleias('condo-1');
    });

    expect(assembleias!).toEqual([]);
    expect(result.current.error).toBeTruthy();
  });
});
