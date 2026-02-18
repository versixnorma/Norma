import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
const mockGetSession = vi.fn();
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthStateChange = vi.fn(() => ({
  data: { subscription: { unsubscribe: vi.fn() } },
}));

const profileRow = {
  id: '1',
  auth_id: 'auth-1',
  nome: 'Test User',
  email: 'test@test.com',
  telefone: null,
  avatar_url: null,
  status: 'active',
  role: 'morador',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  unidade_id: null,
  usuario_condominios: [
    {
      condominio: { id: 'condo-1', nome: 'Condo Test' },
      role: 'morador',
      status: 'active',
    },
  ],
};

const mockFrom = vi.fn(() => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      data: [profileRow],
      error: null,
    })),
  })),
}));

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: mockGetSession,
      signInWithPassword: mockSignIn,
      signOut: mockSignOut,
      onAuthStateChange: mockOnAuthStateChange,
    },
    from: mockFrom,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/schemas/auth', () => ({
  UsuarioSchema: { safeParse: () => ({ success: true }) },
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  it('inicia com loading true e termina em false sem sessão', async () => {
    const { useAuth } = await import('@/hooks/useAuth');
    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('carrega perfil quando existe sessão ativa', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: { access_token: 'tok', user: { id: 'auth-1' } },
      },
      error: null,
    });

    const { useAuth } = await import('@/hooks/useAuth');
    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeTruthy();
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('limpa estado em caso de erro de rede no init', async () => {
    mockGetSession.mockRejectedValue(new Error('Network error'));

    const { useAuth } = await import('@/hooks/useAuth');
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.error).toBeTruthy();
  });

  it('expõe computed values corretos sem sessão', async () => {
    const { useAuth } = await import('@/hooks/useAuth');
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isSuperAdmin).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isSindico).toBe(false);
    expect(result.current.hasMultipleCondominios).toBe(false);
    expect(result.current.condominioAtual).toBeUndefined();
  });

  it('expõe todos os métodos esperados', async () => {
    const { useAuth } = await import('@/hooks/useAuth');
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(typeof result.current.login).toBe('function');
    expect(typeof result.current.signup).toBe('function');
    expect(typeof result.current.logout).toBe('function');
    expect(typeof result.current.resetPassword).toBe('function');
    expect(typeof result.current.updatePassword).toBe('function');
    expect(typeof result.current.switchCondominio).toBe('function');
    expect(typeof result.current.refreshProfile).toBe('function');
  });
});
