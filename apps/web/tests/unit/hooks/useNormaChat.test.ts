import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();
const mockGetSession = vi.fn();

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    from: mockFrom,
    auth: {
      getSession: mockGetSession,
    },
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), log: vi.fn(), warn: vi.fn() },
}));

describe('useNormaChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(async () => ({ data: [], error: null })),
            })),
          })),
        })),
      })),
      insert: vi.fn(async () => ({ error: null })),
    });
  });

  it('carrega historico sem erro', async () => {
    const { useNormaChat } = await import('@/hooks/useNormaChat');
    const { result } = renderHook(() => useNormaChat({ condominioId: 'c1', userId: 'u1' }));

    await act(async () => {
      await result.current.loadHistory();
    });

    expect(Array.isArray(result.current.messages)).toBe(true);
  });

  it('marca erro quando nao ha token de sessao', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    const { useNormaChat } = await import('@/hooks/useNormaChat');
    const { result } = renderHook(() => useNormaChat({ condominioId: 'c1', userId: 'u1' }));

    await act(async () => {
      await result.current.sendMessage('teste');
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.messages.some((m) => m.status === 'error')).toBe(true);
    });
  });
});
