import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubGlobal('fetch', vi.fn());

describe('useExecutiveDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as unknown as jest.Mock).mockImplementation(async (url: string) => {
      if (url.includes('/api/admin/analytics/executive')) {
        return { ok: true, json: async () => ({ data: {} }) };
      }
      if (url.includes('/api/admin/analytics/unified')) {
        return {
          ok: true,
          json: async () => ({ data: { dailyActivity: [], condominioHealth: [] } }),
        };
      }
      if (url.includes('/api/admin/analytics/alerts')) {
        return { ok: true, json: async () => ({ data: [] }) };
      }
      return { ok: false, statusText: 'not found', json: async () => ({}) };
    });
  });

  it('fetchData called on mount and on interval', async () => {
    vi.useFakeTimers();
    const { useExecutiveDashboard } = await import('@/hooks/useExecutiveDashboard');
    const { result, unmount } = renderHook(() => useExecutiveDashboard());

    // initial fetch triggered on mount
    await act(async () => {
      // allow initial promise microtasks to resolve
      await Promise.resolve();
    });

    expect((global.fetch as unknown as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(1);

    // advance 60s to trigger interval
    await act(async () => {
      vi.advanceTimersByTime(60_000);
      // allow promises to resolve
      await Promise.resolve();
    });

    expect((global.fetch as unknown as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);

    unmount();
    vi.useRealTimers();
  });
});
