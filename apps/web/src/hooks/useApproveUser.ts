'use client';

import { getSupabaseClient } from '@/lib/supabase';
import { useCallback, useState } from 'react';

export interface PendingUser {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  status: string;
  created_at: string;
  unidade_id: string | null;
  unidade_numero?: string;
  bloco_nome?: string;
}

interface ApproveUserResponse {
  success: boolean;
  usuario: { id: string; nome: string; email: string; status: string; } | null;
  error: string | null;
}

export function useApproveUser() {
  const supabase = getSupabaseClient();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingUsers = useCallback(async (condominioId: string) => {
    setLoading(true);
    setError(null);
    try {
      // Query corrigida com nomes corretos das tabelas e colunas
      const { data, error: fetchError } = await supabase
        .from('usuarios')
        .select(`
          id,
          nome,
          email,
          telefone,
          status,
          created_at,
          unidade_id,
          unidades_habitacionais:unidade_id (
            numero,
            blocos:bloco_id (nome)
          )
        `)
        .eq('condominio_id', condominioId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Tipo para os dados retornados pela query
      type RawUser = {
        id: string;
        nome: string;
        email: string;
        telefone: string | null;
        status: string;
        created_at: string;
        unidade_id: string | null;
        unidades_habitacionais: {
          numero: string;
          blocos: { nome: string } | null;
        } | null;
      };

      const formattedUsers: PendingUser[] = (data || []).map((user: RawUser) => ({
        id: user.id,
        nome: user.nome,
        email: user.email,
        telefone: user.telefone,
        status: user.status,
        created_at: user.created_at,
        unidade_id: user.unidade_id,
        unidade_numero: user.unidades_habitacionais?.numero,
        bloco_nome: user.unidades_habitacionais?.blocos?.nome,
      }));
      setPendingUsers(formattedUsers);
    } catch (err) {
      console.error('Erro ao buscar usuários pendentes:', err);
      setError('Erro ao carregar usuários pendentes');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const approveUser = useCallback(async (userId: string, unidadeId?: string): Promise<ApproveUserResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await supabase.functions.invoke('approve-user', {
        body: { usuario_id: userId, acao: 'approve', unidade_id: unidadeId },
      });
      if (response.error) throw new Error(response.error.message);
      if (!response.data?.success) throw new Error(response.data?.error || 'Erro ao aprovar usuário');
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
      return response.data as ApproveUserResponse;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao aprovar usuário';
      setError(errorMessage);
      return { success: false, usuario: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const rejectUser = useCallback(async (userId: string, motivo: string): Promise<ApproveUserResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await supabase.functions.invoke('approve-user', {
        body: { usuario_id: userId, acao: 'reject', motivo_rejeicao: motivo },
      });
      if (response.error) throw new Error(response.error.message);
      if (!response.data?.success) throw new Error(response.data?.error || 'Erro ao rejeitar usuário');
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
      return response.data as ApproveUserResponse;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao rejeitar usuário';
      setError(errorMessage);
      return { success: false, usuario: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const approveInBatch = useCallback(async (userIds: string[], unidadeId?: string): Promise<ApproveUserResponse[]> => {
    setLoading(true);
    const results: ApproveUserResponse[] = [];
    for (const userId of userIds) {
      const result = await approveUser(userId, unidadeId);
      results.push(result);
    }
    setLoading(false);
    return results;
  }, [approveUser]);

  return { pendingUsers, loading, error, fetchPendingUsers, approveUser, rejectUser, approveInBatch };
}
