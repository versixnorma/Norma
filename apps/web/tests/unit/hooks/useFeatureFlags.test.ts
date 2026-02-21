import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createBuilder = (data: any, error: any = null) => {
  const builder: any = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve({ data, error })),
    then: (resolve: any) => Promise.resolve(resolve({ data, error })),
  };
  return builder;
};

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock('@/lib/supabase', () => ({ getSupabaseClient: () => mockSupabase }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

const mockFlag = {
  id: 'flag-1',
  key: 'norma_ia_enabled',
  nome: 'Norma IA',
  descricao: null,
  is_enabled: true,
  config: {},
  ambiente: 'all' as const,
  condominio_ids: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

describe('useFeatureFlags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(createBuilder([mockFlag]));
  });

  it('fetchFlags carrega flags e atualiza estado', async () => {
    const { useFeatureFlags } = await import('@/hooks/useFeatureFlags');
    const { result } = renderHook(() => useFeatureFlags());

    await act(async () => {
      await result.current.fetchFlags();
    });

    expect(result.current.flags).toHaveLength(1);
    expect(result.current.loading).toBe(false);
  });

  it('isEnabled retorna true para flag ativa (ambiente: all)', async () => {
    const { useFeatureFlags } = await import('@/hooks/useFeatureFlags');
    const { result } = renderHook(() => useFeatureFlags());

    await act(async () => {
      await result.current.fetchFlags();
    });

    expect(result.current.isEnabled('norma_ia_enabled')).toBe(true);
  });

  it('isEnabled retorna false para flag inexistente', async () => {
    const { useFeatureFlags } = await import('@/hooks/useFeatureFlags');
    const { result } = renderHook(() => useFeatureFlags());

    await act(async () => {
      await result.current.fetchFlags();
    });

    expect(result.current.isEnabled('flag_inexistente')).toBe(false);
  });

  it('isEnabled retorna false quando is_enabled = false', async () => {
    mockFrom.mockReturnValue(createBuilder([{ ...mockFlag, is_enabled: false }]));
    const { useFeatureFlags } = await import('@/hooks/useFeatureFlags');
    const { result } = renderHook(() => useFeatureFlags());

    await act(async () => {
      await result.current.fetchFlags();
    });

    expect(result.current.isEnabled('norma_ia_enabled')).toBe(false);
  });

  it('isEnabled verifica condominio_ids corretamente', async () => {
    mockFrom.mockReturnValue(createBuilder([{ ...mockFlag, condominio_ids: ['cond-1'] }]));
    const { useFeatureFlags } = await import('@/hooks/useFeatureFlags');
    const { result } = renderHook(() => useFeatureFlags());

    await act(async () => {
      await result.current.fetchFlags();
    });

    expect(result.current.isEnabled('norma_ia_enabled', 'cond-1')).toBe(true);
    expect(result.current.isEnabled('norma_ia_enabled', 'cond-X')).toBe(false);
    expect(result.current.isEnabled('norma_ia_enabled')).toBe(false);
  });

  it('updateFlag atualiza flag e retorna true', async () => {
    const { useFeatureFlags } = await import('@/hooks/useFeatureFlags');
    const { result } = renderHook(() => useFeatureFlags());

    await act(async () => {
      await result.current.fetchFlags();
    });

    let ok: boolean;
    await act(async () => {
      ok = await result.current.updateFlag('flag-1', { is_enabled: false });
    });

    expect(ok!).toBe(true);
    expect(result.current.flags[0].is_enabled).toBe(false);
  });

  it('createFlag adiciona nova flag à lista', async () => {
    const novaFlag = { ...mockFlag, id: 'flag-2', key: 'nova_flag' };
    const { useFeatureFlags } = await import('@/hooks/useFeatureFlags');
    const { result } = renderHook(() => useFeatureFlags());

    await act(async () => {
      await result.current.fetchFlags();
    });

    mockFrom.mockReturnValue(createBuilder(novaFlag));

    let created: any;
    await act(async () => {
      created = await result.current.createFlag({
        key: 'nova_flag',
        nome: 'Nova',
        descricao: null,
        is_enabled: true,
        config: {},
        ambiente: 'all',
        condominio_ids: null,
      });
    });

    expect(created).not.toBeNull();
    expect(result.current.flags).toHaveLength(2);
  });

  it('deleteFlag remove flag da lista e retorna true', async () => {
    const { useFeatureFlags } = await import('@/hooks/useFeatureFlags');
    const { result } = renderHook(() => useFeatureFlags());

    await act(async () => {
      await result.current.fetchFlags();
    });

    mockFrom.mockReturnValue(createBuilder(null));

    let deleted: boolean;
    await act(async () => {
      deleted = await result.current.deleteFlag('flag-1');
    });

    expect(deleted!).toBe(true);
    expect(result.current.flags).toHaveLength(0);
  });

  it('fetchFlags define error quando query falha', async () => {
    mockFrom.mockReturnValue(createBuilder(null, { message: 'DB error' }));
    const { useFeatureFlags } = await import('@/hooks/useFeatureFlags');
    const { result } = renderHook(() => useFeatureFlags());

    await act(async () => {
      await result.current.fetchFlags();
    });

    expect(result.current.error).toBe('Erro ao carregar feature flags');
  });
});
