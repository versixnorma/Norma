import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubGlobal('fetch', vi.fn());

describe('useAdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as unknown as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { stats: { total_condominios: 1 }, activityData: [], condominiosHealth: [] },
      }),
    });
  });

  it('fetchAll calls /api/admin/dashboard and respects throttle', async () => {
    const { useAdminDashboard } = await import('@/hooks/useAdminDashboard');
    const { result } = renderHook(() => useAdminDashboard());

    await act(async () => {
      await result.current.fetchAll();
    });

    expect((global.fetch as unknown as jest.Mock).mock.calls[0][0]).toBe('/api/admin/dashboard');

    // Call again immediately - should be throttled and not call fetch again
    await act(async () => {
      await result.current.fetchAll();
    });

    expect((global.fetch as unknown as jest.Mock).mock.calls.length).toBe(1);
  });
});
