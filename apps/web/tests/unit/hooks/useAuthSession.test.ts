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

/**
 * Cria um mock de supabase.auth.onAuthStateChange que:
 * - Dispara INITIAL_SESSION imediatamente (como o SDK real faz a partir do storage)
 * - Opcionalmente captura o callback para disparar eventos subsequentes nos testes
 */
function makeSupabaseMock(initialSession: typeof mockSession | null = mockSession) {
  const subscription = { unsubscribe: vi.fn() };
  let capturedCb: ((event: string, session: any) => void) | null = null;

  const supabase = {
    auth: {
      onAuthStateChange: vi.fn().mockImplementation((cb: (event: string, session: any) => void) => {
        capturedCb = cb;
        // Simula o INITIAL_SESSION que o Supabase SDK dispara a partir do storage local
        Promise.resolve().then(() => cb('INITIAL_SESSION', initialSession));
        return { data: { subscription } };
      }),
    },
  };

  return { supabase, subscription, getCb: () => capturedCb };
}

function buildDeps(
  initialSession: typeof mockSession | null = mockSession,
  overrides: Record<string, unknown> = {}
) {
  const { supabase, subscription, getCb } = makeSupabaseMock(initialSession);
  return {
    supabase,
    fetchProfile: vi.fn().mockResolvedValue(mockProfile),
    onSignedIn: vi.fn(),
    onSignedOut: vi.fn(),
    onSessionUpdated: vi.fn(),
    onError: vi.fn(),
    routerPush: vi.fn(),
    setLoading: vi.fn(),
    _subscription: subscription,
    _getCb: getCb,
    ...overrides,
  };
}

describe('useAuthSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('chama onSignedIn quando INITIAL_SESSION tem sessão e perfil', async () => {
    const deps = buildDeps(mockSession);
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

  it('chama onSignedOut quando INITIAL_SESSION não tem sessão', async () => {
    const deps = buildDeps(null);
    const { useAuthSession } = await import('@/hooks/auth/useAuthSession');
    const { unmount } = renderHook(() => useAuthSession(deps));

    await new Promise((r) => setTimeout(r, 20));

    expect(deps.onSignedOut).toHaveBeenCalled();
    expect(deps.setLoading).toHaveBeenCalledWith(false);
    unmount();
  });

  it('redireciona para /login quando perfil não encontrado', async () => {
    const deps = buildDeps(mockSession, { fetchProfile: vi.fn().mockResolvedValue(null) });
    const { useAuthSession } = await import('@/hooks/auth/useAuthSession');
    const { unmount } = renderHook(() => useAuthSession(deps));

    await new Promise((r) => setTimeout(r, 20));

    expect(deps.onSignedOut).toHaveBeenCalled();
    expect(deps.routerPush).toHaveBeenCalledWith('/login');
    expect(deps.setLoading).toHaveBeenCalledWith(false);
    unmount();
  });

  it('chama onError quando fetchProfile lança exceção na inicialização', async () => {
    const fetchError = new Error('Profile fetch error');
    const deps = buildDeps(mockSession, { fetchProfile: vi.fn().mockRejectedValue(fetchError) });
    const { useAuthSession } = await import('@/hooks/auth/useAuthSession');
    const { unmount } = renderHook(() => useAuthSession(deps));

    await new Promise((r) => setTimeout(r, 20));

    expect(deps.onError).toHaveBeenCalledWith(fetchError);
    expect(deps.setLoading).toHaveBeenCalledWith(false);
    unmount();
  });

  it('processa TOKEN_REFRESHED chamando onSessionUpdated', async () => {
    const deps = buildDeps(mockSession);
    const { useAuthSession } = await import('@/hooks/auth/useAuthSession');
    const { unmount } = renderHook(() => useAuthSession(deps));

    // Aguarda o INITIAL_SESSION ser processado
    await new Promise((r) => setTimeout(r, 20));

    const cb = deps._getCb();
    if (cb) await cb('TOKEN_REFRESHED', mockSession);

    expect(deps.onSessionUpdated).toHaveBeenCalledWith(mockSession);
    unmount();
  });

  it('processa SIGNED_OUT e redireciona para /login', async () => {
    const deps = buildDeps(mockSession);
    const { useAuthSession } = await import('@/hooks/auth/useAuthSession');
    const { unmount } = renderHook(() => useAuthSession(deps));

    // Aguarda o INITIAL_SESSION ser processado
    await new Promise((r) => setTimeout(r, 20));

    const cb = deps._getCb();
    if (cb) await cb('SIGNED_OUT', null);

    expect(deps.onSignedOut).toHaveBeenCalled();
    expect(deps.routerPush).toHaveBeenCalledWith('/login');
    unmount();
  });
});
