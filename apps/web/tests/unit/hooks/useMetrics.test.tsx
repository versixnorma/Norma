import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRecord = vi.fn();
const mockTrack = vi.fn();
const mockLoggerDebug = vi.fn();
const mockLoggerError = vi.fn();

vi.mock('@/lib/metrics', () => ({
  recordNormaChatMetric: (...args: any[]) => mockRecord(...args),
  trackAsyncOperation: (...args: any[]) => mockTrack(...args),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: (...args: any[]) => mockLoggerDebug(...args),
    error: (...args: any[]) => mockLoggerError(...args),
  },
}));

describe('useMetrics hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useNormaChatMetrics.trackMessage calls recordNormaChatMetric and logs', async () => {
    const { useNormaChatMetrics } = await import('@/hooks/useMetrics');
    const { result } = renderHook(() => useNormaChatMetrics('c1', 'u1'));
    await result.current.trackMessage('ola', 123, true, false, 10);
    expect(mockRecord).toHaveBeenCalled();
    expect(mockLoggerDebug).toHaveBeenCalled();
  });

  it('useFinancialMetrics.trackOperation calls trackAsyncOperation and logs', async () => {
    const { useFinancialMetrics } = await import('@/hooks/useMetrics');
    const { result } = renderHook(() => useFinancialMetrics('c1'));
    await result.current.trackOperation('view', async () => Promise.resolve('ok'), 2, 1000);
    expect(mockTrack).toHaveBeenCalled();
    expect(mockLoggerDebug).toHaveBeenCalled();
  });
});
