import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubGlobal('fetch', vi.fn());

describe('useNormaAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchDocuments sets documents on success and error state on failure', async () => {
    // success response
    (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 'd1', name: 'Doc 1' }] }),
    });

    const { useNormaAI } = await import('@/hooks/useNormaAI');
    const { result } = renderHook(() => useNormaAI());

    await act(async () => {
      await result.current.fetchDocuments();
    });

    expect(result.current.documents.length).toBe(1);

    // failure response
    (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'fail' }),
    });

    await act(async () => {
      await result.current.fetchDocuments();
    });

    expect(result.current.error).toBeTruthy();
  });

  it('createManualKnowledge posts payload and refreshes documents', async () => {
    // POST create returns ok
    (global.fetch as unknown as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: 'new' } }) }) // create
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 'd1' }] }) }); // fetchDocuments called inside

    const { useNormaAI } = await import('@/hooks/useNormaAI');
    const { result } = renderHook(() => useNormaAI());

    await act(async () => {
      const res = await result.current.createManualKnowledge({
        title: 'T',
        content: 'C',
        category: 'cat',
        tags: [],
        condominioId: 'c1',
        userId: 'u1',
      });
      expect(res).toBeDefined();
    });
  });

  it('fetchMetrics and submitFeedback behave as expected', async () => {
    (global.fetch as unknown as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { totalDocuments: 1 } }) }) // metrics
      .mockResolvedValueOnce({ ok: true }); // feedback

    const { useNormaAI } = await import('@/hooks/useNormaAI');
    const { result } = renderHook(() => useNormaAI());

    await act(async () => {
      await result.current.fetchMetrics();
    });
    expect(result.current.metrics).toBeDefined();

    await act(async () => {
      const ok = await result.current.submitFeedback({ userId: 'u1', rating: 5 });
      expect(ok).toBe(true);
    });
  });
});
