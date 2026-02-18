'use client';

import { getSupabaseClient } from '@/lib/supabase';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useAuthMethods } from './auth/useAuthMethods';
import { useAuthProfile } from './auth/useAuthProfile';
import { useAuthSession } from './auth/useAuthSession';
import type { UsuarioWithCondominios } from './auth/types';

export function useAuth() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const profileState = useAuthProfile({ supabase });

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | Error | null>(null);

  const setAuthState = useCallback(
    (payload: {
      user: User | null;
      profile: UsuarioWithCondominios | null;
      session: Session | null;
      loading?: boolean;
      error?: AuthError | Error | null;
    }) => {
      setUser(payload.user);
      profileState.setProfile(payload.profile);
      setSession(payload.session);
      if (payload.loading !== undefined) setLoading(payload.loading);
      if (payload.error !== undefined) setError(payload.error);
    },
    [profileState]
  );

  useAuthSession({
    supabase,
    fetchProfile: profileState.fetchProfile,
    setLoading,
    routerPush: router.push,
    onSignedIn: ({ user: nextUser, profile, session: nextSession }) =>
      setAuthState({ user: nextUser, profile, session: nextSession, loading: false, error: null }),
    onSignedOut: () => setAuthState({ user: null, profile: null, session: null, loading: false, error: null }),
    onSessionUpdated: (nextSession) => setSession(nextSession),
    onError: (nextError) =>
      setAuthState({ user: null, profile: null, session: null, loading: false, error: nextError }),
  });

  const methods = useAuthMethods({
    supabase,
    currentUser: user,
    currentProfile: profileState.profile,
    fetchProfile: profileState.fetchProfile,
    setAuthState,
    setLoading,
    setError,
    setProfile: profileState.setProfile,
    routerRefresh: router.refresh,
  });

  const isAuthenticated = !!user && !!session;
  const isSuperAdmin = profileState.profile?.role === 'superadmin' && profileState.profile?.status === 'active';
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
