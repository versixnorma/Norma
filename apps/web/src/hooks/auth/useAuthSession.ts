'use client';

import { logger } from '@/lib/logger';
import { useEffect } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { UsuarioWithCondominios } from './types';

type SessionDeps = {
  supabase: {
    auth: {
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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {
      logger.log('Auth event:', event);

      if (event === 'INITIAL_SESSION') {
        // Fires immediately from local storage/cookies — no network, no Web Lock.
        // Replaces the old getSession() call which could hang indefinitely when another
        // tab holds the refresh lock. Background token refresh (if needed) completes
        // asynchronously and fires TOKEN_REFRESHED or SIGNED_OUT when done.
        try {
          if (session?.user) {
            const profile = await fetchProfile(session.user.id);
            if (!profile) {
              onSignedOut();
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
          setLoading(false);
        }
        return;
      }

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
