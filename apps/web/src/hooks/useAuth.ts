'use client';

import { getSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/database';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type RoleType = Database['public']['Enums']['user_role'];
type StatusType = Database['public']['Enums']['user_status'];

import { logger } from '@/lib/logger';

// ============================================
// UTILITY FUNCTIONS
// ============================================
// Cookies agora são gerenciados exclusivamente via Server Actions (HttpOnly)
// para prevenir XSS e garantir integridade da sessão.

import { UsuarioSchema } from '@/lib/schemas/auth';

interface UsuarioCondominioJoin {
  condominio: { id: string; nome: string };
  role: RoleType;
  status: string;
  // unidade_id: string | null; // Not fetched in current query from pivot
}

interface UsuarioWithCondominios {
  id: string;
  auth_id: string;
  nome: string;
  email: string;
  telefone: string | null;
  avatar_url: string | null;
  documento?: string | null;
  status: StatusType;
  role: RoleType; // Role direto do usuário (superadmin, etc.)
  created_at: string;
  updated_at: string;
  condominio_id?: string | null; // Made optional as it's deprecated/removed
  condominio_atual?: { id: string; nome: string; role: string } | null;
  condominios?: {
    condominio_id: string;
    role: string;
    unidade_identificador?: string;
    condominio: { nome: string };
  }[];
  usuario_condominios?: UsuarioCondominioJoin[];
}

interface AuthState {
  user: User | null;
  profile: UsuarioWithCondominios | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | Error | null;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  data?: Session;
  nextRoute?: '/home' | '/admin/dashboard' | '/aguardando-aprovacao';
  error?: unknown;
}

interface SignupCredentials {
  email: string;
  password: string;
  nome: string;
  telefone?: string;
  condominio_id?: string;
  unidade_id?: string;
  cpf?: string;
  data_nascimento?: string;
  notificacoes_email?: boolean;
  notificacoes_push?: boolean;
  notificacoes_whatsapp?: boolean;
}

// ============================================
// HOOK
// ============================================
/**
 * Hook de autenticação para gerenciar sessão do usuário
 * Fornece métodos de login, logout, registro e manipulação de sessão.
 * @returns Contexto e métodos de autenticação
 */
export function useAuth() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    error: null,
  });

  // Fetch user profile with condominios (secure & validated)
  const fetchProfile = useCallback(
    async (userId: string): Promise<UsuarioWithCondominios | null> => {
      try {
        // Tentar query com join de condominios
        const { data: profileData, error } = await supabase
          .from('usuarios')
          .select(
            `
          *,
          usuario_condominios (
            condominio:condominio_id (
              id,
              nome
            ),
            role,
            status
          )
        `
          )
          .eq('auth_id', userId);

        // Fallback: se join falhar (500/RLS), buscar apenas usuario
        if (error) {
          logger.warn('Erro no join de condominios, usando fallback:', error.message);
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('auth_id', userId);

          if (fallbackError || !fallbackData || fallbackData.length === 0) {
            logger.error('Erro ao buscar perfil (fallback):', fallbackError);
            return null;
          }

          const rawUser = fallbackData[0];
          return {
            ...rawUser,
            condominio_id: undefined,
            condominios: [],
            condominio_atual: null,
            usuario_condominios: [],
          } as unknown as UsuarioWithCondominios;
        }

        if (!profileData || profileData.length === 0) {
          logger.error('Perfil não encontrado para auth_id:', userId);
          return null;
        }

        const rawUser = profileData[0];

        // VALIDATION WITH ZOD
        const parseResult = UsuarioSchema.safeParse(rawUser);

        if (!parseResult.success) {
          // Log only, don't block
          logger.warn('Erro de validação de schema do usuário:', parseResult.error);
        }

        // Transformar dados dos condomínios usando a tabela pivot
        const userCondominios = (rawUser.usuario_condominios || [])
          .filter((uc: UsuarioCondominioJoin) => uc.status === 'active' || uc.status === 'ativo')
          .map((uc: UsuarioCondominioJoin) => ({
            condominio_id: uc.condominio.id,
            nome: uc.condominio.nome,
            role: uc.role,
            unidade_id: rawUser.unidade_id, // Legacy unit link from user
            unidade_identificador: undefined,
          }));

        // Obter condomínio ativo (primeiro da lista se existir)
        const condominioAtual =
          userCondominios.length > 0
            ? {
                id: userCondominios[0].condominio_id,
                nome: userCondominios[0].nome,
                role: userCondominios[0].role,
              }
            : null;

        const usuario: UsuarioWithCondominios = {
          ...rawUser,
          condominio_id: undefined, // Removed from table
          condominios: userCondominios.map((cond) => ({
            condominio_id: cond.condominio_id,
            role: cond.role,
            unidade_identificador: cond.unidade_identificador,
            condominio: { nome: cond.nome },
          })),
          condominio_atual: condominioAtual,
          usuario_condominios: [],
        } as unknown as UsuarioWithCondominios;

        return usuario;
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro desconhecido ao buscar perfil';
        logger.error('Erro ao buscar perfil:', errorMessage);
        return null;
      }
    },
    [supabase]
  );

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Obter sessão uma vez (removido loop para PWA)
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          setState({
            user: session.user,
            profile,
            session,
            loading: false,
            error: null,
          });
        } else {
          setState({
            user: null,
            profile: null,
            session: null,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        logger.error('Auth initialization error:', error);
        setState({
          user: null,
          profile: null,
          session: null,
          loading: false,
          error: error as Error,
        });
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {
      logger.log('Auth event:', event);

      // Evitar processamento desnecessário para eventos que não alteram o estado
      if (event === 'TOKEN_REFRESHED' && session && session.user) {
        // Apenas atualizar a sessão, manter o resto do estado
        setState((prev) => ({
          ...prev,
          session,
        }));
        return;
      }

      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({
          user: session.user,
          profile,
          session,
          loading: false,
          error: null,
        });
      } else if (event === 'SIGNED_OUT') {
        setState({
          user: null,
          profile: null,
          session: null,
          loading: false,
          error: null,
        });
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile, router]);

  // ============================================
  // AUTH METHODS
  // ============================================

  const login = async ({ email, password }: LoginCredentials): Promise<LoginResponse> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const session = data.session;
      const authUser = data.user;

      if (!session || !authUser) {
        throw new Error('Sessão inválida após autenticação');
      }

      const profile = await fetchProfile(authUser.id);
      if (!profile) {
        await supabase.auth.signOut();
        throw new Error('Perfil do usuário não encontrado. Contate o administrador.');
      }

      const isSuperAdmin = profile.role === 'superadmin';
      const hasActiveCondominio = (profile.condominios?.length || 0) > 0;
      const isAccessActive = profile.status === 'active' && (isSuperAdmin || hasActiveCondominio);

      setState({
        user: authUser,
        profile,
        session,
        loading: false,
        error: null,
      });

      if (!isAccessActive) {
        return { success: true, data: session, nextRoute: '/aguardando-aprovacao' };
      }

      if (isSuperAdmin && !profile.condominio_atual) {
        return { success: true, data: session, nextRoute: '/admin/dashboard' };
      }

      return { success: true, data: session, nextRoute: '/home' };
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error as AuthError,
      }));
      return { success: false, error };
    }
  };

  const signup = async ({
    email,
    password,
    nome,
    telefone,
    condominio_id,
    unidade_id,
    cpf,
    data_nascimento,
    notificacoes_email,
    notificacoes_push,
    notificacoes_whatsapp,
  }: SignupCredentials) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Usar API route server-side para signup (bypass RLS + melhor tratamento de erros)
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          email,
          password,
          telefone,
          condominio_id,
          unidade_id,
          cpf,
          data_nascimento,
          notificacoes_email,
          notificacoes_push,
          notificacoes_whatsapp,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw { message: data.error || 'Erro ao criar conta', status: res.status };
      }

      return { success: true, data };
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error as AuthError,
      }));
      return { success: false, error };
    }
  };

  const logout = async () => {
    setState((prev) => ({ ...prev, loading: true }));

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Limpar condomínio ativo de forma segura
      // Cookie de auth já é invalidado. O cookie de preferencia de condominio pode ficar ou ser limpo via server action.
      // Por enquanto, apenas removemos o call quebrado.

      return { success: true };
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error as AuthError,
      }));
      return { success: false, error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  const switchCondominio = async (condominioId: string) => {
    if (!state.profile || !state.profile.condominios) return;

    const novoCondominio = state.profile.condominios.find((c) => c.condominio_id === condominioId);

    if (novoCondominio) {
      try {
        // Chamar Server Action para persistir no DB e cookie HttpOnly
        const { switchCondominioAction } = await import('@/app/actions/auth');
        await switchCondominioAction(condominioId);

        // Atualizar estado local otimista
        setState((prev) => ({
          ...prev,
          profile: prev.profile
            ? {
                ...prev.profile,
                condominio_id: condominioId, // Atualiza também a ref no perfil
                condominio_atual: {
                  id: novoCondominio.condominio_id,
                  nome: novoCondominio.condominio.nome,
                  role: novoCondominio.role,
                },
              }
            : null,
        }));

        router.refresh(); // Opcional: recarregar Server Components se eles dependerem do cookie
      } catch (error) {
        logger.error('Falha ao trocar condomínio:', error);
        // Toast error here ideally
      }
    }
  };

  const refreshProfile = async () => {
    if (state.user) {
      const profile = await fetchProfile(state.user.id);
      setState((prev) => ({ ...prev, profile }));
    }
  };

  // ============================================
  // COMPUTED VALUES
  // ============================================
  const isAuthenticated = !!state.user && !!state.session;
  // SuperAdmin é verificado pelo role direto do usuário (não precisa de condomínio)
  const isSuperAdmin = state.profile?.role === 'superadmin' && state.profile?.status === 'active';
  const isAdmin =
    isSuperAdmin ||
    (state.profile?.status === 'active' &&
      (state.profile?.condominio_atual?.role === 'admin_condo' ||
        state.profile?.condominio_atual?.role === 'superadmin'));
  const isSindico =
    state.profile?.status === 'active' &&
    (state.profile?.condominio_atual?.role === 'sindico' ||
      state.profile?.condominio_atual?.role === 'subsindico');
  const hasMultipleCondominios = (state.profile?.condominios?.length || 0) > 1;

  return {
    // State
    user: state.user,
    profile: state.profile,
    session: state.session,
    loading: state.loading,
    error: state.error,

    // Computed
    isAuthenticated,
    isSuperAdmin,
    isAdmin,
    isSindico,
    hasMultipleCondominios,
    condominioAtual: state.profile?.condominio_atual,

    // Methods
    login,
    signup,
    logout,
    resetPassword,
    updatePassword,
    switchCondominio,
    refreshProfile,
  };
}
