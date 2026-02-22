'use client';

import { logger } from '@/lib/logger';
import { useEffect } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { UsuarioWithCondominios } from './types';

type SessionDeps = {
  supabase: {
    auth: {
      getSession: () => Promise<any>;
      onAuthStateChange: (callback: (event: string, session: Session | null) => void) => any;
    };
  };
  onSignedIn: (payload: {
    user: User;
    session: Session;
    profile: UsuarioWithCondominios | null;
  }) => void;
  onSignedOut: () => void;
  onSessionUpdated: (session: Session) => void;
  onError: (error: Error) => void;
  fetchProfile: (userId: string) => Promise<UsuarioWithCondominios | null>;
  routerPush: (path: string) => void;
  setLoading: (value: boolean) => void;
};

export function useAuthSession({
  supabase,
  onSignedIn,
  onSignedOut,
  onSessionUpdated,
  onError,
  fetchProfile,
  routerPush,
  setLoading,
}: SessionDeps) {
  useEffect(() => {
    // Safety timeout: se getSession() ou fetchProfile() nunca resolverem
    // (ex.: token refresh request travado), liberar o loading após 8s para
    // que o AuthGuard redirecione ao login em vez de travar a tela infinitamente.
    const safetyTimer = setTimeout(() => {
      logger.warn('[Auth] Timeout na inicialização — forçando loading: false');
      setLoading(false);
    }, 8000);

    const initAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          if (!profile) {
            // No profile found for this authenticated user -> treat as signed out for app flows
            onSignedOut();
            // Redirect to login to avoid inconsistent state (routerPush provided by caller)
            try {
              routerPush('/login');
            } catch {
              // best-effort
            }
          } else {
            onSignedIn({ user: session.user, profile, session });
          }
        } else {
          onSignedOut();
        }
      } catch (error) {
        logger.error('Auth initialization error:', error);
        onError(error as Error);
      } finally {
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {
      logger.log('Auth event:', event);

      if (event === 'TOKEN_REFRESHED' && session?.user) {
        onSessionUpdated(session);
        return;
      }

      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await fetchProfile(session.user.id);
        onSignedIn({ user: session.user, profile, session });
      } else if (event === 'SIGNED_OUT') {
        onSignedOut();
        try {
          routerPush('/login');
        } catch {
          // ignore
        }
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [
    supabase,
    onSignedIn,
    onSignedOut,
    onSessionUpdated,
    onError,
    fetchProfile,
    routerPush,
    setLoading,
  ]);
}
