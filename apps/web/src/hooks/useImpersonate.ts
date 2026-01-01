'use client';

import { getSupabaseClient } from '@/lib/supabase';
import { useCallback, useEffect, useState } from 'react';

export interface ImpersonateSession {
  id: string;
  superadmin_id: string;
  usuario_alvo_id: string;
  motivo: string;
  started_at: string;
  expires_at: string;
  revoked_at: string | null;
  alvo: { nome: string; email: string; role: string; };
}

interface ImpersonateResponse {
  success: boolean;
  session_id?: string;
  access_token?: string;
  expires_at?: string;
  usuario?: { id: string; nome: string; email: string; role: string; };
  error?: string;
}

const IMPERSONATE_KEY = 'versix_impersonate_session';
const ORIGINAL_TOKEN_KEY = 'versix_original_token';

export function useImpersonate() {
  const supabase = getSupabaseClient();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonateSession, setImpersonateSession] = useState<ImpersonateSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkImpersonateStatus = useCallback(async () => {
    try {
      const storedSession = localStorage.getItem(IMPERSONATE_KEY);
      if (storedSession) {
        const session = JSON.parse(storedSession) as ImpersonateSession;
        if (new Date(session.expires_at) > new Date() && !session.revoked_at) {
          setImpersonateSession(session);
          setIsImpersonating(true);
        } else {
          localStorage.removeItem(IMPERSONATE_KEY);
          setImpersonateSession(null);
          setIsImpersonating(false);
        }
      }
    } catch (err) {
      console.error('Erro ao verificar impersonate:', err);
    }
  }, []);

  useEffect(() => { checkImpersonateStatus(); }, [checkImpersonateStatus]);

  const startImpersonate = useCallback(async (userId: string, motivo: string): Promise<ImpersonateResponse> => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.access_token) {
        localStorage.setItem(ORIGINAL_TOKEN_KEY, sessionData.session.access_token);
      }
      // @ts-expect-error - Supabase function invoke typing
      const response = await supabase.functions.invoke<ImpersonateResponse>('impersonate', {
        body: { usuario_alvo_id: userId, motivo },
      });
      if (response.error) throw new Error(response.error.message);
      if (!response.data?.success) throw new Error(response.data?.error || 'Erro ao iniciar impersonate');

      const session: ImpersonateSession = {
        id: response.data.session_id!, superadmin_id: '', usuario_alvo_id: userId, motivo,
        started_at: new Date().toISOString(), expires_at: response.data.expires_at!, revoked_at: null,
        alvo: { nome: response.data.usuario?.nome || '', email: response.data.usuario?.email || '', role: response.data.usuario?.role || '' },
      };
      localStorage.setItem(IMPERSONATE_KEY, JSON.stringify(session));
      setImpersonateSession(session);
      setIsImpersonating(true);
      if (response.data.access_token) {
        await supabase.auth.setSession({ access_token: response.data.access_token, refresh_token: '' });
      }
      window.location.reload();
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao iniciar impersonate';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const stopImpersonate = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const originalToken = localStorage.getItem(ORIGINAL_TOKEN_KEY);
      localStorage.removeItem(IMPERSONATE_KEY);
      localStorage.removeItem(ORIGINAL_TOKEN_KEY);
      if (originalToken) {
        await supabase.auth.setSession({ access_token: originalToken, refresh_token: '' });
      } else {
        await supabase.auth.signOut();
      }
      setImpersonateSession(null);
      setIsImpersonating(false);
      window.location.reload();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao parar impersonate');
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  return { isImpersonating, impersonateSession, loading, error, startImpersonate, stopImpersonate, checkImpersonateStatus };
}
