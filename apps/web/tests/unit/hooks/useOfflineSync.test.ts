import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getPendingActions = vi.fn();
const removePendingAction = vi.fn();
const incrementActionRetry = vi.fn();
const getLastSyncTime = vi.fn();
const saveCondominioInfo = vi.fn();
const saveUserProfile = vi.fn();
const cacheNotifications = vi.fn();

vi.mock('@/lib/offline-db', () => ({
  getPendingActions,
  removePendingAction,
  incrementActionRetry,
  getLastSyncTime,
  saveCondominioInfo,
  saveUserProfile,
  cacheNotifications,
}));

vi.mock('@/lib/pwa', () => ({
  useOnlineStatus: () => true,
  requestBackgroundSync: vi.fn(async () => true),
}));

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: null })) })),
        order: vi.fn(() => ({ limit: vi.fn(async () => ({ data: [] })) })),
      })),
    })),
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn() },
}));

vi.mock('@/lib/sentry', () => ({
  captureError: vi.fn(),
}));

describe('useOfflineSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLastSyncTime.mockResolvedValue(null);
    getPendingActions.mockResolvedValue([]);
  });

  it('processa acao pendente com sucesso', async () => {
    getPendingActions.mockResolvedValue([
      { id: 'a1', url: 'https://abc.supabase.co/rest/v1/test', method: 'POST', body: {}, retries: 0 },
    ]);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200 })));

    const { useOfflineSync } = await import('@/hooks/useOfflineSync');
    const { result } = renderHook(() => useOfflineSync());
    let summary: { processed: number; failed: number } = { processed: 0, failed: 0 };
    await act(async () => {
      summary = await result.current.processPendingActions();
    });

    expect(summary.processed).toBe(1);
    expect(removePendingAction).toHaveBeenCalledWith('a1');
  });

  it('descarta acao com conflito 409 e emite evento', async () => {
    getPendingActions.mockResolvedValue([
      { id: 'a2', url: 'https://abc.supabase.co/rest/v1/test', method: 'PUT', body: {}, retries: 0 },
    ]);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 409 })));
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    const { useOfflineSync } = await import('@/hooks/useOfflineSync');
    const { result } = renderHook(() => useOfflineSync());
    let summary: { processed: number; failed: number } = { processed: 0, failed: 0 };
    await act(async () => {
      summary = await result.current.processPendingActions();
    });

    expect(summary.failed).toBe(1);
    expect(removePendingAction).toHaveBeenCalledWith('a2');
    expect(dispatchSpy).toHaveBeenCalled();
  });
});
