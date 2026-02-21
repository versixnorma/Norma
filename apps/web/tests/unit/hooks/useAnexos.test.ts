import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockRemove = vi.fn();
const mockStorageFrom = vi.fn(() => ({
  upload: mockUpload,
  getPublicUrl: mockGetPublicUrl,
  remove: mockRemove,
}));

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({ storage: { from: mockStorageFrom } }),
}));

describe('useAnexos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpload.mockResolvedValue({
      data: { path: 'cond-1/chamados/123_test.jpg' },
      error: null,
    });
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/test.jpg' },
    });
    mockRemove.mockResolvedValue({ error: null });
  });

  it('validateFile aceita JPEG válido', async () => {
    const { useAnexos } = await import('@/hooks/useAnexos');
    const { result } = renderHook(() => useAnexos());
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    expect(result.current.validateFile(file)).toBeNull();
  });

  it('validateFile rejeita tipo não permitido', async () => {
    const { useAnexos } = await import('@/hooks/useAnexos');
    const { result } = renderHook(() => useAnexos());
    const file = new File(['content'], 'test.exe', { type: 'application/octet-stream' });

    expect(result.current.validateFile(file)).toMatch(/não permitido/i);
  });

  it('validateFile rejeita arquivo maior que 10MB', async () => {
    const { useAnexos } = await import('@/hooks/useAnexos');
    const { result } = renderHook(() => useAnexos());
    const file = new File(['x'], 'big.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 });

    expect(result.current.validateFile(file)).toMatch(/grande/i);
  });

  it('uploadAnexo faz upload e retorna Anexo', async () => {
    const { useAnexos } = await import('@/hooks/useAnexos');
    const { result } = renderHook(() => useAnexos());
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    let anexo: any;
    await act(async () => {
      anexo = await result.current.uploadAnexo('cond-1', 'chamados', file);
    });

    expect(anexo).not.toBeNull();
    expect(anexo.url).toBe('https://example.com/test.jpg');
    expect(anexo.nome).toBe('test.jpg');
    expect(result.current.uploading).toBe(false);
    expect(result.current.progress).toBe(100);
  });

  it('uploadAnexo retorna null e seta error quando tipo inválido', async () => {
    const { useAnexos } = await import('@/hooks/useAnexos');
    const { result } = renderHook(() => useAnexos());
    const file = new File(['x'], 'virus.exe', { type: 'application/octet-stream' });

    let anexo: any;
    await act(async () => {
      anexo = await result.current.uploadAnexo('cond-1', 'chamados', file);
    });

    expect(anexo).toBeNull();
    expect(result.current.error).toBeTruthy();
  });

  it('uploadAnexo trata erro do storage', async () => {
    mockUpload.mockResolvedValue({ data: null, error: new Error('Storage falhou') });
    const { useAnexos } = await import('@/hooks/useAnexos');
    const { result } = renderHook(() => useAnexos());
    const file = new File(['content'], 'test.png', { type: 'image/png' });

    let anexo: any;
    await act(async () => {
      anexo = await result.current.uploadAnexo('cond-1', 'chamados', file);
    });

    expect(anexo).toBeNull();
    expect(result.current.error).toBe('Storage falhou');
  });

  it('uploadMultiple faz upload de múltiplos arquivos', async () => {
    const { useAnexos } = await import('@/hooks/useAnexos');
    const { result } = renderHook(() => useAnexos());
    const files = [
      new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
      new File(['b'], 'b.png', { type: 'image/png' }),
    ];

    let anexos: any[];
    await act(async () => {
      anexos = await result.current.uploadMultiple('cond-1', 'chamados', files);
    });

    expect(anexos!).toHaveLength(2);
  });

  it('deleteAnexo remove arquivo via storage', async () => {
    const { useAnexos } = await import('@/hooks/useAnexos');
    const { result } = renderHook(() => useAnexos());

    let ok: boolean;
    await act(async () => {
      ok = await result.current.deleteAnexo(
        'https://supabase.co/storage/v1/object/public/anexos/cond-1/chamados/file.jpg'
      );
    });

    expect(ok!).toBe(true);
    expect(mockRemove).toHaveBeenCalled();
  });

  it('deleteAnexo retorna false para URL inválida', async () => {
    const { useAnexos } = await import('@/hooks/useAnexos');
    const { result } = renderHook(() => useAnexos());

    let ok: boolean;
    await act(async () => {
      ok = await result.current.deleteAnexo('https://example.com/sem-path-correto');
    });

    expect(ok!).toBe(false);
    expect(result.current.error).toBeTruthy();
  });
});
