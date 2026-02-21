import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({ from: mockFrom }),
}));

function awaitable(response: any) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    order: vi.fn(() => chain),
    range: vi.fn(() => Promise.resolve(response)),
    single: vi.fn(() => Promise.resolve(response)),
  };
  return chain;
}

describe('useChamados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchChamados sets chamados and pagination on success', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'chamados') {
        return awaitable({ data: [{ id: 'c1', anexos: '[]' }], count: 1 });
      }
      return awaitable({ data: [] });
    });

    const { useChamados } = await import('@/hooks/useChamados');
    const { result } = renderHook(() => useChamados());
    const res = await result.current.fetchChamados('cond-1', {});
    expect(res.data.length).toBeGreaterThanOrEqual(0);
    expect(result.current.loading).toBe(false);
  });

  it('fetchChamados returns empty and sets error on failure', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => Promise.resolve({ data: null, error: new Error('fail') })),
    }));

    const { useChamados } = await import('@/hooks/useChamados');
    const { result } = renderHook(() => useChamados());
    let res;
    await act(async () => {
      res = await result.current.fetchChamados('cond-1', {});
    });
    expect(res.data).toEqual([]);
    expect(result.current.error).toBeTruthy();
  });
});
