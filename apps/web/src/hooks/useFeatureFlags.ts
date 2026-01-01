'use client';

import { getSupabaseClient } from '@/lib/supabase';
import { useCallback, useEffect, useState } from 'react';

export interface FeatureFlag {
  id: string;
  key: string;
  nome: string;
  descricao: string | null;
  is_enabled: boolean;
  config: Record<string, any>;
  ambiente: 'all' | 'development' | 'staging' | 'production';
  condominio_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

export function useFeatureFlags() {
  const supabase = getSupabaseClient();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase.from('feature_flags').select('*').order('key');
      if (fetchError) throw fetchError;
      setFlags(data || []);
    } catch (err) {
      console.error('Erro ao buscar feature flags:', err);
      setError('Erro ao carregar feature flags');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  const isEnabled = useCallback((key: string, condominioId?: string): boolean => {
    const flag = flags.find(f => f.key === key);
    if (!flag || !flag.is_enabled) return false;
    const currentEnv = process.env.NODE_ENV || 'development';
    if (flag.ambiente !== 'all' && flag.ambiente !== currentEnv) return false;
    if (flag.condominio_ids && flag.condominio_ids.length > 0) {
      if (!condominioId || !flag.condominio_ids.includes(condominioId)) return false;
    }
    return true;
  }, [flags]);

  const updateFlag = useCallback(async (flagId: string, updates: Partial<FeatureFlag>): Promise<boolean> => {
    setLoading(true);
    try {
      const { error: updateError } = await supabase.from('feature_flags').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', flagId);
      if (updateError) throw updateError;
      setFlags(prev => prev.map(f => f.id === flagId ? { ...f, ...updates } : f));
      return true;
    } catch (err) {
      console.error('Erro ao atualizar flag:', err);
      setError('Erro ao atualizar feature flag');
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const createFlag = useCallback(async (flag: Omit<FeatureFlag, 'id' | 'created_at' | 'updated_at'>): Promise<FeatureFlag | null> => {
    setLoading(true);
    try {
      const { data, error: insertError } = await supabase.from('feature_flags').insert(flag).select().single();
      if (insertError) throw insertError;
      setFlags(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Erro ao criar flag:', err);
      setError('Erro ao criar feature flag');
      return null;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const deleteFlag = useCallback(async (flagId: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { error: deleteError } = await supabase.from('feature_flags').delete().eq('id', flagId);
      if (deleteError) throw deleteError;
      setFlags(prev => prev.filter(f => f.id !== flagId));
      return true;
    } catch (err) {
      console.error('Erro ao deletar flag:', err);
      setError('Erro ao deletar feature flag');
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  return { flags, loading, error, isEnabled, fetchFlags, updateFlag, createFlag, deleteFlag };
}

export const FEATURE_FLAGS = {
  NORMA_IA: 'norma_ia_enabled',
  ASSEMBLEIAS: 'assembleias_enabled',
  FINANCEIRO: 'financeiro_enabled',
  BIBLIOTECA: 'biblioteca_enabled',
  PUSH_NOTIFICATIONS: 'push_notifications_enabled',
  WHATSAPP_INTEGRATION: 'whatsapp_enabled',
  OFFLINE_MODE: 'offline_mode_enabled',
  BIOMETRIC_AUTH: 'biometric_auth_enabled',
  IMPERSONATE: 'impersonate_enabled',
  AUDIT_LOGS: 'audit_logs_enabled',
  BETA_FEATURES: 'beta_features_enabled',
} as const;
