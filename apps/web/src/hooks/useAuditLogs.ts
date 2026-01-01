'use client';

import { getErrorMessage } from '@/lib/errors';
import { getSupabaseClient } from '@/lib/supabase';
import { Database, Json } from '@versix/shared';
import { useCallback, useState } from 'react';

export interface AuditLog {
  id: string;
  usuario_id: string | null;
  usuario_nome?: string;
  usuario_email?: string;
  condominio_id: string | null;
  condominio_nome?: string;
  acao: string;
  tabela: string;
  registro_id: string | null;
  dados_antes: Json | null;
  dados_depois: Json | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogFilters {
  usuario_id?: string;
  condominio_id?: string;
  acao?: string;
  tabela?: string;
  data_inicio?: string;
  data_fim?: string;
}

export function useAuditLogs() {
  const supabase = getSupabaseClient();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = useCallback(async (filters?: AuditLogFilters, page = 1, pageSize = 50) => {
    setLoading(true);
    setError(null);
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      let query = supabase.from('audit_logs').select(`id, usuario_id, condominio_id, acao, tabela, registro_id, dados_antes, dados_depois, ip_address, user_agent, created_at, usuarios:usuario_id (nome, email), condominios:condominio_id (nome)`, { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);

      if (filters?.usuario_id) query = query.eq('usuario_id', filters.usuario_id);
      if (filters?.condominio_id) query = query.eq('condominio_id', filters.condominio_id);
      if (filters?.acao) query = query.eq('acao', filters.acao);
      if (filters?.tabela) query = query.eq('tabela', filters.tabela);
      if (filters?.data_inicio) query = query.gte('created_at', filters.data_inicio);
      if (filters?.data_fim) query = query.lte('created_at', filters.data_fim);

      const { data, error: fetchError, count } = await query;
      if (fetchError) throw fetchError;

      type AuditLogRow = Database['public']['Tables']['audit_logs']['Row'] & {
        usuarios: { nome: string; email: string } | null;
        condominios?: { nome: string } | null;
      };
      const formattedLogs: AuditLog[] = (data || []).map((log: AuditLogRow) => ({
        id: log.id, usuario_id: log.usuario_id, usuario_nome: log.usuarios?.nome, usuario_email: log.usuarios?.email,
        condominio_id: log.condominio_id, condominio_nome: log.condominios?.nome, acao: log.acao, tabela: log.tabela,
        registro_id: log.registro_id, dados_antes: log.dados_antes, dados_depois: log.dados_depois,
        ip_address: log.ip_address as string | null, user_agent: log.user_agent, created_at: log.created_at,
      }));
      setLogs(formattedLogs);
      setTotalCount(count || 0);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const getLogDetails = useCallback(async (logId: string): Promise<AuditLog | null> => {
    try {
      const { data, error: fetchError } = await supabase.from('audit_logs').select(`*, usuarios:usuario_id (nome, email), condominios:condominio_id (nome)`).eq('id', logId).single();
      if (fetchError) throw fetchError;
      return {
        ...data,
        usuario_nome: data.usuarios?.nome,
        usuario_email: data.usuarios?.email,
        condominio_nome: data.condominios?.nome,
        ip_address: data.ip_address as string | null,
      };
    } catch (err) {
      setError(getErrorMessage(err));
      return null;
    }
  }, [supabase]);

  const exportLogs = useCallback(async (filters?: AuditLogFilters): Promise<string> => {
    try {
      let query = supabase.from('audit_logs').select(`id, usuario_id, condominio_id, acao, tabela, registro_id, created_at, usuarios:usuario_id (nome, email)`).order('created_at', { ascending: false }).limit(10000);
      if (filters?.usuario_id) query = query.eq('usuario_id', filters.usuario_id);
      if (filters?.condominio_id) query = query.eq('condominio_id', filters.condominio_id);
      if (filters?.acao) query = query.eq('acao', filters.acao);
      if (filters?.data_inicio) query = query.gte('created_at', filters.data_inicio);
      if (filters?.data_fim) query = query.lte('created_at', filters.data_fim);

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      type ExportLog = Pick<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'usuario_id' | 'condominio_id' | 'acao' | 'tabela' | 'registro_id' | 'created_at'> & {
        usuarios: { nome: string; email: string } | null;
      };

      const headers = ['ID', 'Data/Hora', 'Usuário', 'Email', 'Ação', 'Tabela', 'Registro'];
      const rows = (data || []).map((log: ExportLog) => {
        const usuario = log.usuarios;
        return [
          log.id,
          new Date(log.created_at).toLocaleString('pt-BR'),
          usuario?.nome || log.usuario_id,
          usuario?.email || '',
          log.acao,
          log.tabela,
          log.registro_id || ''
        ];
      });
      return [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    } catch (err) {
      setError(getErrorMessage(err));
      throw new Error('Erro ao exportar logs');
    }
  }, [supabase]);

  return { logs, loading, error, totalCount, fetchLogs, getLogDetails, exportLogs };
}
