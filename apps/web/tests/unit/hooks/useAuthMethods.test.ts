import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/app/actions/auth', () => ({
  switchCondominioAction: vi.fn().mockResolvedValue(undefined),
}));

vi.stubGlobal('fetch', vi.fn());

const mockProfile = {
  id: 'user-1',
  email: 'test@test.com',
  nome: 'Test',
  role: 'morador' as const,
  status: 'active',
  condominios: [{ condominio_id: 'cond-1', role: 'morador', condominio: { nome: 'Cond A' } }],
  condominio_atual: { id: 'cond-1', nome: 'Cond A', role: 'morador' },
  condominio_id: 'cond-1',
};

const mockUser = { id: 'user-1', email: 'test@test.com' };
const mockSession = { access_token: 'token', user: mockUser };

function buildDeps(overrides: Record<string, any> = {}) {
  return {
    supabase: {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: mockUser, session: mockSession },
          error: null,
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
        updateUser: vi.fn().mockResolvedValue({ error: null }),
      },
    },
    currentUser: mockUser as any,
    currentProfile: mockProfile as any,
    fetchProfile: vi.fn().mockResolvedValue(mockProfile),
    setAuthState: vi.fn(),
    setLoading: vi.fn(),
    setError: vi.fn(),
    setProfile: vi.fn(),
    routerRefresh: vi.fn(),
    ...overrides,
  };
}

describe('useAuthMethods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { user: mockUser } }),
    });
  });

  it('login bem-sucedido retorna nextRoute /home para morador ativo', async () => {
    const deps = buildDeps();
    const { useAuthMethods } = await import('@/hooks/auth/useAuthMethods');
    const { result } = renderHook(() => useAuthMethods(deps));

    let response: any;
    await act(async () => {
      response = await result.current.login({ email: 'test@test.com', password: '123' });
    });

    expect(response.success).toBe(true);
    expect(response.nextRoute).toBe('/home');
    expect(deps.setAuthState).toHaveBeenCalledWith(
      expect.objectContaining({ user: mockUser, profile: mockProfile })
    );
  });

  it('login redireciona superadmin sem condo_atual para /admin/dashboard', async () => {
    const superProfile = {
      ...mockProfile,
      role: 'superadmin',
      condominio_atual: null,
    };
    const deps = buildDeps({ fetchProfile: vi.fn().mockResolvedValue(superProfile) });
    const { useAuthMethods } = await import('@/hooks/auth/useAuthMethods');
    const { result } = renderHook(() => useAuthMethods(deps));

    let response: any;
    await act(async () => {
      response = await result.current.login({ email: 'admin@test.com', password: '123' });
    });

    expect(response.nextRoute).toBe('/admin/dashboard');
  });

  it('login com perfil não encontrado faz signOut e retorna erro', async () => {
    const deps = buildDeps({ fetchProfile: vi.fn().mockResolvedValue(null) });
    const { useAuthMethods } = await import('@/hooks/auth/useAuthMethods');
    const { result } = renderHook(() => useAuthMethods(deps));

    let response: any;
    await act(async () => {
      response = await result.current.login({ email: 'x@x.com', password: '123' });
    });

    expect(response.success).toBe(false);
    expect(deps.supabase.auth.signOut).toHaveBeenCalled();
  });

  it('login retorna erro quando Supabase falha', async () => {
    const deps = buildDeps({
      supabase: {
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: { message: 'Invalid credentials' },
          }),
          signOut: vi.fn(),
        },
      },
    });
    const { useAuthMethods } = await import('@/hooks/auth/useAuthMethods');
    const { result } = renderHook(() => useAuthMethods(deps));

    let response: any;
    await act(async () => {
      response = await result.current.login({ email: 'x@x.com', password: 'wrong' });
    });

    expect(response.success).toBe(false);
    expect(deps.setError).toHaveBeenCalled();
  });

  it('signup chama /api/auth/signup e retorna success', async () => {
    const deps = buildDeps();
    const { useAuthMethods } = await import('@/hooks/auth/useAuthMethods');
    const { result } = renderHook(() => useAuthMethods(deps));

    let response: any;
    await act(async () => {
      response = await result.current.signup({
        email: 'novo@test.com',
        password: '123456',
        nome: 'Novo',
        condominio_id: 'cond-1',
      } as any);
    });

    expect(response.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/signup', expect.any(Object));
  });

  it('signup trata resposta com erro HTTP', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Email já cadastrado' }),
    });
    const deps = buildDeps();
    const { useAuthMethods } = await import('@/hooks/auth/useAuthMethods');
    const { result } = renderHook(() => useAuthMethods(deps));

    let response: any;
    await act(async () => {
      response = await result.current.signup({ email: 'dup@test.com', password: '123' } as any);
    });

    expect(response.success).toBe(false);
  });

  it('logout chama signOut e retorna success', async () => {
    const deps = buildDeps();
    const { useAuthMethods } = await import('@/hooks/auth/useAuthMethods');
    const { result } = renderHook(() => useAuthMethods(deps));

    let response: any;
    await act(async () => {
      response = await result.current.logout();
    });

    expect(response.success).toBe(true);
    expect(deps.supabase.auth.signOut).toHaveBeenCalled();
  });

  it('resetPassword chama resetPasswordForEmail', async () => {
    const deps = buildDeps();
    const { useAuthMethods } = await import('@/hooks/auth/useAuthMethods');
    const { result } = renderHook(() => useAuthMethods(deps));

    let response: any;
    await act(async () => {
      response = await result.current.resetPassword('user@test.com');
    });

    expect(response.success).toBe(true);
    expect(deps.supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'user@test.com',
      expect.any(Object)
    );
  });

  it('updatePassword chama updateUser', async () => {
    const deps = buildDeps();
    const { useAuthMethods } = await import('@/hooks/auth/useAuthMethods');
    const { result } = renderHook(() => useAuthMethods(deps));

    let response: any;
    await act(async () => {
      response = await result.current.updatePassword('nova-senha');
    });

    expect(response.success).toBe(true);
    expect(deps.supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'nova-senha' });
  });

  it('refreshProfile busca perfil do currentUser', async () => {
    const deps = buildDeps();
    const { useAuthMethods } = await import('@/hooks/auth/useAuthMethods');
    const { result } = renderHook(() => useAuthMethods(deps));

    await act(async () => {
      await result.current.refreshProfile();
    });

    expect(deps.fetchProfile).toHaveBeenCalledWith('user-1');
    expect(deps.setProfile).toHaveBeenCalled();
  });

  it('refreshProfile não faz nada se não há currentUser', async () => {
    const deps = buildDeps({ currentUser: null });
    const { useAuthMethods } = await import('@/hooks/auth/useAuthMethods');
    const { result } = renderHook(() => useAuthMethods(deps));

    await act(async () => {
      await result.current.refreshProfile();
    });

    expect(deps.fetchProfile).not.toHaveBeenCalled();
  });
});
