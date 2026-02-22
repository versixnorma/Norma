'use client';

import { getSupabaseClient } from '@/lib/supabase';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useAuthMethods } from './auth/useAuthMethods';
import { useAuthProfile } from './auth/useAuthProfile';
import { useAuthSession } from './auth/useAuthSession';
import type { UsuarioWithCondominios } from './auth/types';

export interface UseAuthOptions {
  initialUser?: User | null;
  initialSession?: Session | null;
  initialProfile?: UsuarioWithCondominios | null;
}

export function useAuth({ initialUser, initialSession, initialProfile }: UseAuthOptions = {}) {
  const router = useRouter();
  const supabase = getSupabaseClient();
  // hasInitialData: true quando dados foram pre-loaded no servidor — evita fetchProfile async
  const hasInitialData = !!(initialUser && initialProfile);
  const profileState = useAuthProfile({ supabase, initialProfile });

  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [session, setSession] = useState<Session | null>(initialSession ?? null);
  // loading começa false quando temos dados iniciais — sem spinner no primeiro render do admin
  const [loading, setLoading] = useState(!hasInitialData);
  const [error, setError] = useState<AuthError | Error | null>(null);

  // Destructure stable references (useState setters and useCallback fns) from profileState
  // to avoid using the profileState object itself as a dependency (new ref every render).
  const { setProfile, fetchProfile } = profileState;

  const setAuthState = useCallback(
    (payload: {
      user: User | null;
      profile: UsuarioWithCondominios | null;
      session: Session | null;
      loading?: boolean;
      error?: AuthError | Error | null;
    }) => {
      setUser(payload.user);
      setProfile(payload.profile);
      setSession(payload.session);
      if (payload.loading !== undefined) setLoading(payload.loading);
      if (payload.error !== undefined) setError(payload.error);
    },
    [setProfile]
  );

  // Stable callbacks for useAuthSession — must be wrapped in useCallback so that
  // useAuthSession's useEffect dependency array stays stable across renders and
  // does not re-run initAuth() on every render (which causes the infinite
  // usuarios-table fetch loop seen in the network console).
  const onSignedIn = useCallback(
    ({
      user: nextUser,
      profile,
      session: nextSession,
    }: {
      user: User;
      profile: UsuarioWithCondominios | null;
      session: Session;
    }) =>
      setAuthState({ user: nextUser, profile, session: nextSession, loading: false, error: null }),
    [setAuthState]
  );

  const onSignedOut = useCallback(
    () => setAuthState({ user: null, profile: null, session: null, loading: false, error: null }),
    [setAuthState]
  );

  const onSessionUpdated = useCallback((nextSession: Session) => setSession(nextSession), []);

  const onError = useCallback(
    (nextError: AuthError | Error) =>
      setAuthState({ user: null, profile: null, session: null, loading: false, error: nextError }),
    [setAuthState]
  );

  useAuthSession({
    supabase,
    fetchProfile,
    setLoading,
    routerPush: router.push,
    onSignedIn,
    onSignedOut,
    onSessionUpdated,
    onError,
    hasInitialData,
  });

  const methods = useAuthMethods({
    supabase,
    currentUser: user,
    currentProfile: profileState.profile,
    fetchProfile,
    setAuthState,
    setLoading,
    setError,
    setProfile,
    routerRefresh: router.refresh,
  });

  const isAuthenticated = !!user && !!session;
  const isSuperAdmin =
    profileState.profile?.role === 'superadmin' && profileState.profile?.status === 'active';
  const isAdmin =
    isSuperAdmin ||
    (profileState.profile?.status === 'active' &&
      (profileState.profile?.condominio_atual?.role === 'admin_condo' ||
        profileState.profile?.condominio_atual?.role === 'superadmin'));
  const isSindico =
    profileState.profile?.status === 'active' &&
    (profileState.profile?.condominio_atual?.role === 'sindico' ||
      profileState.profile?.condominio_atual?.role === 'subsindico');

  return {
    user,
    profile: profileState.profile,
    session,
    loading,
    error,
    isAuthenticated,
    isSuperAdmin,
    isAdmin,
    isSindico,
    hasMultipleCondominios: (profileState.profile?.condominios?.length || 0) > 1,
    condominioAtual: profileState.profile?.condominio_atual,
    ...methods,
  };
}
