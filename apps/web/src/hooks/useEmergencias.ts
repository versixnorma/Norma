'use client';

import { getSupabaseClient } from '@/lib/supabase';
import type { DispararEmergenciaInput, EmergenciaLog, TipoEmergencia } from '@versix/shared/types/comunicacao';
import { useCallback, useState } from 'react';

export function useEmergencias() {
  const supabase = getSupabaseClient();
  const [emergencias, setEmergencias] = useState<EmergenciaLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar histórico de emergências
  const fetchEmergencias = useCallback(async (condominioId: string): Promise<EmergenciaLog[]> => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase.from('emergencias_log').select('*').eq('condominio_id', condominioId).order('disparado_em', { ascending: false }).limit(50);
      if (fetchError) throw fetchError;
      setEmergencias(data || []);
      return data || [];
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Disparar emergência
  const dispararEmergencia = useCallback(async (condominioId: string, input: DispararEmergenciaInput): Promise<string | null> => {
    setLoading(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      // Direct INSERT since registrar_emergencia RPC doesn't exist
      const { data, error: insertError } = await supabase
        .from('emergencias_log')
        .insert({
          condominio_id: condominioId,
          tipo: input.tipo,
          descricao: input.descricao,
          disparado_por: userId,
          status: 'ativo'
        })
        .select('id')
        .single();
      if (insertError) throw insertError;

      // Recarregar lista
      await fetchEmergencias(condominioId);

      return data?.id || null;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [supabase, fetchEmergencias]);

  // Buscar detalhes de uma emergência
  const getEmergencia = useCallback(async (id: string): Promise<EmergenciaLog | null> => {
    try {
      const { data, error: fetchError } = await supabase.from('emergencias_log').select('*').eq('id', id).single();
      if (fetchError) throw fetchError;
      return data;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      return null;
    }
  }, [supabase]);

  return {
    emergencias, loading, error,
    fetchEmergencias, dispararEmergencia, getEmergencia
  };
}

export type { DispararEmergenciaInput, EmergenciaLog, TipoEmergencia };

