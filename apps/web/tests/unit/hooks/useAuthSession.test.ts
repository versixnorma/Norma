import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), log: vi.fn() } }));

const mockProfile = {
  id: 'user-1',
  email: 'user@test.com',
  nome: 'Test User',
  role: 'morador',
  condominios: [],
  condominio_atual: null,
};

const mockSession = {
  access_token: 'token',
  user: { id: 'user-1', email: 'user@test.com' },
};

function buildDeps(
  overrides: Partial<
    Parameters<typeof import('@/hooks/auth/useAuthSession').useAuthSession>[0]
  > = {}
) {
  const subscription = { unsubscribe: vi.fn() };
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription } }),
      },
    },
    fetchProfile: vi.fn().mockResolvedValue(mockProfile),
    onSignedIn: vi.fn(),
    onSignedOut: vi.fn(),
    onSessionUpdated: vi.fn(),
    onError: vi.fn(),
    routerPush: vi.fn(),
    setLoading: vi.fn(),
    _subscription: subscription,
    ...overrides,
  };
}

describe('useAuthSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('chama onSignedIn quando sessão e perfil existem', async () => {
    const deps = buildDeps();
    const { useAuthSession } = await import('@/hooks/auth/useAuthSession');
    const { unmount } = renderHook(() => useAuthSession(deps));

    await new Promise((r) => setTimeout(r, 20));

    expect(deps.fetchProfile).toHaveBeenCalledWith('user-1');
    expect(deps.onSignedIn).toHaveBeenCalledWith(
      expect.objectContaining({ user: mockSession.user, profile: mockProfile })
    );
    expect(deps.setLoading).toHaveBeenCalledWith(false);
    unmount();
  });

  it('chama onSignedOut quando não há sessão', async () => {
    const deps = buildDeps({
      supabase: {
        auth: {
          getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
          onAuthStateChange: vi
            .fn()
            .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
        },
      },
    });
    const { useAuthSession } = await import('@/hooks/auth/useAuthSession');
    const { unmount } = renderHook(() => useAuthSession(deps));

    await new Promise((r) => setTimeout(r, 20));

    expect(deps.onSignedOut).toHaveBeenCalled();
    expect(deps.setLoading).toHaveBeenCalledWith(false);
    unmount();
  });

  it('redireciona para /login quando perfil não encontrado', async () => {
    const deps = buildDeps({ fetchProfile: vi.fn().mockResolvedValue(null) });
    const { useAuthSession } = await import('@/hooks/auth/useAuthSession');
    const { unmount } = renderHook(() => useAuthSession(deps));

    await new Promise((r) => setTimeout(r, 20));

    expect(deps.onSignedOut).toHaveBeenCalled();
    expect(deps.routerPush).toHaveBeenCalledWith('/login');
    unmount();
  });

  it('chama onError quando getSession falha', async () => {
    const sessionError = new Error('Session error');
    const deps = buildDeps({
      supabase: {
        auth: {
          getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: sessionError }),
          onAuthStateChange: vi
            .fn()
            .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
        },
      },
    });
    const { useAuthSession } = await import('@/hooks/auth/useAuthSession');
    const { unmount } = renderHook(() => useAuthSession(deps));

    await new Promise((r) => setTimeout(r, 20));

    expect(deps.onError).toHaveBeenCalled();
    unmount();
  });

  it('processa TOKEN_REFRESHED chamando onSessionUpdated', async () => {
    let authCb: ((event: string, session: any) => void) | null = null;
    const deps = buildDeps({
      supabase: {
        auth: {
          getSession: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
          onAuthStateChange: vi.fn().mockImplementation((cb) => {
            authCb = cb;
            return { data: { subscription: { unsubscribe: vi.fn() } } };
          }),
        },
      },
    });
    const { useAuthSession } = await import('@/hooks/auth/useAuthSession');
    const { unmount } = renderHook(() => useAuthSession(deps));

    await new Promise((r) => setTimeout(r, 20));
    if (authCb) await authCb('TOKEN_REFRESHED', mockSession);

    expect(deps.onSessionUpdated).toHaveBeenCalledWith(mockSession);
    unmount();
  });

  it('processa SIGNED_OUT e redireciona para /login', async () => {
    let authCb: ((event: string, session: any) => void) | null = null;
    const deps = buildDeps({
      supabase: {
        auth: {
          getSession: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
          onAuthStateChange: vi.fn().mockImplementation((cb) => {
            authCb = cb;
            return { data: { subscription: { unsubscribe: vi.fn() } } };
          }),
        },
      },
    });
    const { useAuthSession } = await import('@/hooks/auth/useAuthSession');
    const { unmount } = renderHook(() => useAuthSession(deps));

    await new Promise((r) => setTimeout(r, 20));
    if (authCb) await authCb('SIGNED_OUT', null);

    expect(deps.onSignedOut).toHaveBeenCalled();
    expect(deps.routerPush).toHaveBeenCalledWith('/login');
    unmount();
  });
});
