'use client';

import { logger } from '@/lib/logger';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { useCallback } from 'react';
import type {
  LoginCredentials,
  LoginResponse,
  SignupCredentials,
  UsuarioWithCondominios,
} from './types';

type MethodsDeps = {
  supabase: {
    auth: {
      signInWithPassword: (credentials: { email: string; password: string }) => Promise<any>;
      signOut: () => Promise<any>;
      resetPasswordForEmail: (email: string, options: { redirectTo: string }) => Promise<any>;
      updateUser: (payload: { password: string }) => Promise<any>;
    };
  };
  currentUser: User | null;
  currentProfile: UsuarioWithCondominios | null;
  fetchProfile: (userId: string) => Promise<UsuarioWithCondominios | null>;
  setAuthState: (payload: {
    user: User | null;
    profile: UsuarioWithCondominios | null;
    session: Session | null;
    loading?: boolean;
    error?: AuthError | Error | null;
  }) => void;
  setLoading: (value: boolean) => void;
  setError: (error: AuthError | Error | null) => void;
  setProfile: (profile: UsuarioWithCondominios | null) => void;
  routerRefresh: () => void;
};

export function useAuthMethods({
  supabase,
  currentUser,
  currentProfile,
  fetchProfile,
  setAuthState,
  setLoading,
  setError,
  setProfile,
  routerRefresh,
}: MethodsDeps) {
  const login = useCallback(
    async ({ email, password }: LoginCredentials): Promise<LoginResponse> => {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const session = data.session as Session | null;
        const authUser = data.user as User | null;
        if (!session || !authUser) throw new Error('Sessão inválida após autenticação');

        const profile = await fetchProfile(authUser.id);
        if (!profile) {
          await supabase.auth.signOut();
          throw new Error('Perfil do usuário não encontrado. Contate o administrador.');
        }

        const isSuperAdmin = profile.role === 'superadmin';
        const hasActiveCondominio = (profile.condominios?.length || 0) > 0;
        const isAccessActive = profile.status === 'active' && (isSuperAdmin || hasActiveCondominio);

        setAuthState({ user: authUser, profile, session, loading: false, error: null });

        if (!isAccessActive) {
          return { success: true, data: session, nextRoute: '/aguardando-aprovacao' };
        }
        if (isSuperAdmin && !profile.condominio_atual) {
          return { success: true, data: session, nextRoute: '/admin/dashboard' };
        }
        return { success: true, data: session, nextRoute: '/home' };
      } catch (error) {
        setError(error as AuthError);
        setLoading(false);
        return { success: false, error };
      }
    },
    [supabase, fetchProfile, setAuthState, setError, setLoading]
  );

  const signup = useCallback(
    async ({
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
      setLoading(true);
      setError(null);

      try {
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
        if (!res.ok) throw { message: data.error || 'Erro ao criar conta', status: res.status };
        setLoading(false);
        return { success: true, data };
      } catch (error) {
        setError(error as AuthError);
        setLoading(false);
        return { success: false, error };
      }
    },
    [setError, setLoading]
  );

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      setError(error as AuthError);
      setLoading(false);
      return { success: false, error };
    }
  }, [supabase, setError, setLoading]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }, [supabase]);

  const updatePassword = useCallback(async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }, [supabase]);

  const switchCondominio = useCallback(
    async (condominioId: string) => {
      if (!currentProfile || !currentProfile.condominios) return;
      const novoCondominio = currentProfile.condominios.find((c) => c.condominio_id === condominioId);
      if (!novoCondominio) return;

      try {
        const { switchCondominioAction } = await import('@/app/actions/auth');
        await switchCondominioAction(condominioId);

        setProfile({
          ...currentProfile,
          condominio_id: condominioId,
          condominio_atual: {
            id: novoCondominio.condominio_id,
            nome: novoCondominio.condominio.nome,
            role: novoCondominio.role,
          },
        });

        routerRefresh();
      } catch (error) {
        logger.error('Falha ao trocar condomínio:', error);
      }
    },
    [currentProfile, setProfile, routerRefresh]
  );

  const refreshProfile = useCallback(async () => {
    if (!currentUser) return;
    const profile = await fetchProfile(currentUser.id);
    setProfile(profile);
  }, [currentUser, fetchProfile, setProfile]);

  return {
    login,
    signup,
    logout,
    resetPassword,
    updatePassword,
    switchCondominio,
    refreshProfile,
  };
}
