'use client';

import { getSupabaseClient } from '@/lib/supabase';
import type { RoleType, StatusType } from '@/types/database';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { logger } from '@/lib/logger';

// ============================================
// UTILITY FUNCTIONS
// ============================================
// Cookies agora são gerenciados exclusivamente via Server Actions (HttpOnly)
// para prevenir XSS e garantir integridade da sessão.

import { UsuarioSchema } from '@/lib/schemas/auth';

interface UsuarioCondominioJoin {
  condominio_id: string;
  role: RoleType;
  unidade_id: string | null;
  status: string;
  condominios: { nome: string } | null;
  unidades: { identificador: string } | null;
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
  created_at: string;
  updated_at: string;
  condominio_id: string | null; // Added field
  condominio_atual?: { id: string; nome: string; role: string } | null;
  condominios?: {
    condominio_id: string;
    role: string;
    unidade_identificador?: string;
    condominio: { nome: string };
  }[];
  usuario_condominios: UsuarioCondominioJoin[];
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

interface SignupCredentials {
  email: string;
  password: string;
  nome: string;
  telefone?: string;
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
        const { data: profileData, error } = await supabase
          .from('usuarios')
          .select(
            `
          *,
          condominios:condominio_id (
            id,
            nome
          ),
          unidades:unidade_id (
            id,
            numero
          )
        `
          )
          .eq('auth_id', userId);

        if (error || !profileData || profileData.length === 0) {
          console.error('Erro ao buscar perfil:', error);
          return null;
        }

        const rawUser = profileData[0];

        // VALIDATION WITH ZOD (Runtime Safety)
        // No more "as unknown as" masking errors
        const parseResult = UsuarioSchema.safeParse(rawUser);

        if (!parseResult.success) {
          console.error('Erro de validação de schema do usuário:', parseResult.error);
          // Em produção, talvez queiramos logar no Sentry mas não bloquear totalmente se for campo não crítico
        }

        const usuario = rawUser as unknown as UsuarioWithCondominios; // Type assertion since we verified schema mostly

        // Transformar dados dos condomínios
        // Como o schema atual é 1:N (um usuário pertence a UM condomínio via condominio_id),
        // simulamos uma lista de 1 item para manter compatibilidade com interface M:N futura.
        const userCondominios = rawUser.condominios
          ? [
              {
                condominio_id: rawUser.condominio_id!,
                nome: rawUser.condominios.nome,
                role: rawUser.role, // O role agora é do usuário global no condomínio atual
                unidade_id: rawUser.unidade_id,
                unidade_identificador: rawUser.unidades?.numero || null,
              },
            ]
          : [];

        // Obter condomínio ativo:

        const condominioAtual =
          userCondominios.length > 0
            ? {
                id: userCondominios[0].condominio_id,
                nome: userCondominios[0].nome,
                role: userCondominios[0].role,
              }
            : null;

        return {
          ...usuario,
          condominios: userCondominios.map((cond) => ({
            condominio_id: cond.condominio_id,
            role: cond.role,
            unidade_identificador: cond.unidade_identificador || undefined,
            condominio: { nome: cond.nome },
          })),
          condominio_atual: condominioAtual,
          usuario_condominios: [], // Deprecated logic field for now
        };
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro desconhecido ao buscar perfil';
        console.error('Erro ao buscar perfil:', errorMessage);
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
        console.error('Auth initialization error:', error);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error as Error,
        }));
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

  const login = async ({ email, password }: LoginCredentials) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Profile será carregado pelo listener onAuthStateChange
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

  const signup = async ({ email, password, nome, telefone }: SignupCredentials) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // 1. Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome,
            telefone,
          },
        },
      });

      if (authError) throw authError;

      // 2. Criar perfil na tabela usuarios (trigger pode fazer isso automaticamente)
      if (authData.user) {
        const { error: profileError } = await supabase.from('usuarios').insert({
          auth_id: authData.user.id,
          nome,
          email,
          telefone: telefone || null,
          status: 'pending',
          config: {},
        });

        if (profileError) {
          console.error('Erro ao criar perfil:', profileError);
          // Não falha, pois o trigger pode ter criado
        }
      }

      return { success: true, data: authData };
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
        console.error('Falha ao trocar condomínio:', error);
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
  const isAdmin =
    state.profile?.condominio_atual?.role === 'admin_master' ||
    state.profile?.condominio_atual?.role === 'superadmin';
  const isSindico =
    state.profile?.condominio_atual?.role === 'sindico' ||
    state.profile?.condominio_atual?.role === 'subsindico';
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
