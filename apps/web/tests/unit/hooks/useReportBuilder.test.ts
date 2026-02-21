import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

URL.createObjectURL = vi.fn(() => 'blob:mock-url');
URL.revokeObjectURL = vi.fn();

const mockJsonResponse = (data: any, ok = true) => ({
  ok,
  json: vi.fn().mockResolvedValue(data),
  blob: vi.fn().mockResolvedValue(new Blob()),
  headers: { get: vi.fn().mockReturnValue(null) },
});

describe('useReportBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue(mockJsonResponse({ data: [] }));
  });

  it('inicia com estado correto apos fetch inicial', async () => {
    const { useReportBuilder } = await import('@/hooks/useReportBuilder');
    const { result } = renderHook(() => useReportBuilder());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.configs).toEqual([]);
    expect(result.current.history).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.generating).toBe(false);
  });

  it('fetchConfigs carrega lista de configuracoes', async () => {
    const mockConfigs = [
      { id: 'c1', name: 'Relatorio Mensal', report_type: 'financial', format: 'pdf' },
      { id: 'c2', name: 'Relatorio Anual', report_type: 'summary', format: 'excel' },
    ];
    mockFetch.mockResolvedValue(mockJsonResponse({ data: mockConfigs }));
    const { useReportBuilder } = await import('@/hooks/useReportBuilder');
    const { result } = renderHook(() => useReportBuilder());

    await act(async () => {
      await result.current.fetchConfigs();
    });

    expect(result.current.configs).toHaveLength(2);
  });

  it('fetchConfigs trata erro de rede', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    const { useReportBuilder } = await import('@/hooks/useReportBuilder');
    const { result } = renderHook(() => useReportBuilder());

    await act(async () => {
      await result.current.fetchConfigs();
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.loading).toBe(false);
  });

  it('createConfig chama API POST', async () => {
    const { useReportBuilder } = await import('@/hooks/useReportBuilder');
    const { result } = renderHook(() => useReportBuilder());

    await act(async () => {
      await result.current.createConfig({ name: 'Novo', reportType: 'financial', format: 'pdf' });
    });

    const postCalls = (mockFetch as any).mock.calls.filter((c: any[]) => c[1]?.method === 'POST');
    expect(postCalls.length).toBeGreaterThan(0);
  });

  it('deleteConfig chama DELETE com id correto', async () => {
    const { useReportBuilder } = await import('@/hooks/useReportBuilder');
    const { result } = renderHook(() => useReportBuilder());

    await act(async () => {
      await result.current.deleteConfig('c1');
    });

    const deleteCalls = (mockFetch as any).mock.calls.filter(
      (c: any[]) => c[1]?.method === 'DELETE'
    );
    expect(deleteCalls.length).toBeGreaterThan(0);
    expect(deleteCalls[0][0]).toContain('id=c1');
  });

  it('generateReport faz POST e define generating=false ao concluir', async () => {
    const mockBlob = new Blob(['data'], { type: 'application/pdf' });
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse({ data: [] }))
      .mockResolvedValueOnce(mockJsonResponse({ data: [] }))
      .mockResolvedValueOnce({
        ok: true,
        blob: vi.fn().mockResolvedValue(mockBlob),
        headers: { get: vi.fn().mockReturnValue('attachment; filename="relatorio.pdf"') },
      })
      .mockResolvedValueOnce(mockJsonResponse({ data: [] }));
    const { useReportBuilder } = await import('@/hooks/useReportBuilder');
    const { result } = renderHook(() => useReportBuilder());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    await act(async () => {
      await result.current.generateReport({ reportType: 'financial', format: 'pdf' });
    });

    expect(result.current.generating).toBe(false);
    expect(result.current.error).toBeNull();
    const postCalls = (mockFetch as any).mock.calls.filter(
      (c: any[]) => c[0]?.includes('/generate') && c[1]?.method === 'POST'
    );
    expect(postCalls.length).toBeGreaterThan(0);
  });
});
