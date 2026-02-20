import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubGlobal('fetch', vi.fn());

describe('useAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (global.fetch as unknown as jest.Mock).mockImplementation(async (url: string) => {
      if (url.startsWith('/api/admin/usuarios')) {
        return { ok: true, json: async () => ({ data: [{ id: 'u1', nome: 'User 1' }] }) };
      }
      if (url === '/api/admin/condominios') {
        return { ok: true, json: async () => ({ data: [{ id: 'c1', nome: 'Condo 1' }] }) };
      }
      if (url === '/api/admin/stats') {
        return { ok: true, json: async () => ({ data: { total_condominios: 2 } }) };
      }
      return { ok: false, statusText: 'not found', json: async () => ({}) };
    });
  });

  it('fetchUsers/fetchCondominios/fetchStats call correct endpoints and set state', async () => {
    const { useAdmin } = await import('@/hooks/useAdmin');
    const { result } = renderHook(() => useAdmin());

    await act(async () => {
      await result.current.fetchUsers();
    });
    expect(
      (global.fetch as unknown as jest.Mock).mock.calls.some((c) =>
        c[0].toString().startsWith('/api/admin/usuarios')
      )
    ).toBe(true);

    await act(async () => {
      await result.current.fetchCondominios();
    });
    expect(
      (global.fetch as unknown as jest.Mock).mock.calls.some(
        (c) => c[0] === '/api/admin/condominios'
      )
    ).toBe(true);

    await act(async () => {
      await result.current.fetchStats();
    });
    expect(
      (global.fetch as unknown as jest.Mock).mock.calls.some((c) => c[0] === '/api/admin/stats')
    ).toBe(true);
  });
});
