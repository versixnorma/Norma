import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/lib/metrics', () => ({
  recordNormaChatMetric: vi.fn(),
  trackAsyncOperation: vi
    .fn()
    .mockImplementation(async (_name: string, op: () => Promise<unknown>) => op()),
}));

// Stub fetch for useHealthCheck
const mockFetch = vi.fn().mockResolvedValue({ ok: true });
vi.stubGlobal('fetch', mockFetch);

// Stub PerformanceObserver for useRenderMetrics
const mockObserver = { observe: vi.fn(), disconnect: vi.fn() };
class MockPerformanceObserver {
  observe = mockObserver.observe;
  disconnect = mockObserver.disconnect;
  constructor(_cb: PerformanceObserverCallback) {}
}
vi.stubGlobal('PerformanceObserver', MockPerformanceObserver);

describe('useNormaChatMetrics', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna trackMessage callback', async () => {
    const { useNormaChatMetrics } = await import('@/hooks/useMetrics');
    const { result } = renderHook(() => useNormaChatMetrics('cond-1', 'user-1'));
    expect(typeof result.current.trackMessage).toBe('function');
  });

  it('trackMessage chama recordNormaChatMetric sem erros', async () => {
    const { recordNormaChatMetric } = await import('@/lib/metrics');
    const { useNormaChatMetrics } = await import('@/hooks/useMetrics');
    const { result } = renderHook(() => useNormaChatMetrics('cond-1', 'user-1'));

    await act(async () => {
      await result.current.trackMessage('Ola Norma', 250, true, false, 100);
    });

    expect(recordNormaChatMetric).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'norma_chat_message',
        condominioId: 'cond-1',
        userId: 'user-1',
        responseTime: 250,
        hasSources: true,
        hadError: false,
      })
    );
  });
});

describe('useFinancialMetrics', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna trackOperation callback', async () => {
    const { useFinancialMetrics } = await import('@/hooks/useMetrics');
    const { result } = renderHook(() => useFinancialMetrics('cond-1'));
    expect(typeof result.current.trackOperation).toBe('function');
  });

  it('trackOperation executa operacao e chama trackAsyncOperation', async () => {
    const { trackAsyncOperation } = await import('@/lib/metrics');
    const { useFinancialMetrics } = await import('@/hooks/useMetrics');
    const { result } = renderHook(() => useFinancialMetrics('cond-1'));
    const mockOp = vi.fn().mockResolvedValue('resultado');

    await act(async () => {
      await result.current.trackOperation('view', mockOp, 10, 500);
    });

    expect(trackAsyncOperation).toHaveBeenCalledWith(
      'financial_view',
      mockOp,
      expect.objectContaining({ condominio: 'cond-1' })
    );
  });
});

describe('useAssembleiaMetrics', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna trackEvent callback', async () => {
    const { useAssembleiaMetrics } = await import('@/hooks/useMetrics');
    const { result } = renderHook(() => useAssembleiaMetrics('cond-1', 'assemb-1'));
    expect(typeof result.current.trackEvent).toBe('function');
  });

  it('trackEvent executa operacao sem erros', async () => {
    const { useAssembleiaMetrics } = await import('@/hooks/useMetrics');
    const { result } = renderHook(() => useAssembleiaMetrics('cond-1', 'assemb-1'));
    const mockOp = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      await result.current.trackEvent('vote', mockOp, 50);
    });

    expect(mockOp).toHaveBeenCalled();
  });
});

describe('useHealthCheck', () => {
  beforeEach(() => vi.clearAllMocks());

  it('monta sem erros e chama fetch', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const { useHealthCheck } = await import('@/hooks/useMetrics');
    const { unmount } = renderHook(() => useHealthCheck());

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/health',
      expect.objectContaining({ cache: 'no-store' })
    );
    unmount();
  });

  it('lida com falha de health check sem lancar erro', async () => {
    mockFetch.mockRejectedValue(new Error('Network down'));
    const { useHealthCheck } = await import('@/hooks/useMetrics');
    const { unmount } = renderHook(() => useHealthCheck());

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockFetch).toHaveBeenCalled();
    unmount();
  });
});

describe('useRenderMetrics', () => {
  beforeEach(() => vi.clearAllMocks());

  it('monta sem erros quando PerformanceObserver esta disponivel', async () => {
    const { useRenderMetrics } = await import('@/hooks/useMetrics');
    const { unmount } = renderHook(() => useRenderMetrics('TestComponent'));
    expect(mockObserver.observe).toHaveBeenCalled();
    unmount();
    expect(mockObserver.disconnect).toHaveBeenCalled();
  });
});

describe('useErrorTracking', () => {
  beforeEach(() => vi.clearAllMocks());

  it('adiciona e remove event listeners no ciclo de vida', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { useErrorTracking } = await import('@/hooks/useMetrics');
    const { unmount } = renderHook(() => useErrorTracking('TestComponent'));

    expect(addSpy).toHaveBeenCalledWith('error', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('error', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
  });
});
