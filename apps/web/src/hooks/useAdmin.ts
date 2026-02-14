'use client';

import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { sanitizeSearchQuery } from '@/lib/sanitize';
import { getSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/database'; // Ensure Database is imported from here or shared
// import { Database } from '@versix/shared'; // This was used but let's stick to one. Actually shared exports Database too.
// Let's use local import if possible or shared. The file used '@/types/database' for StatusType which failed.
// Let's use the local Database type import which is known to be good.

type RoleType = Database['public']['Enums']['user_role'];
type StatusType = Database['public']['Enums']['user_status'];

import { useCallback, useState } from 'react';

// ============================================
// TIPOS
// ============================================
type UserStatus = Database['public']['Enums']['user_status'];
type UserRole = Database['public']['Enums']['user_role'];

interface FetchUsersFilters {
  status?: UserStatus;
  role?: UserRole;
  condominio_id?: string;
}

export interface AdminUser {
  id: string;
  auth_id: string;
  nome: string;
  email: string;
  telefone: string | null;
  avatar_url: string | null;
  status: StatusType;
  created_at: string;
  updated_at: string;
  condominios: Array<{
    condominio_id: string;
    condominio_nome: string;
    role: RoleType;
    unidade_id: string | null;
    unidade_identificador: string | null;
  }>;
}

export interface AdminCondominio {
  id: string;
  nome: string;
  slug: string;
  endereco: string;
  status: StatusType;
  created_at: string;
  total_usuarios: number;
  total_unidades: number;
  sindico_nome: string | null;
}

export interface AdminStats {
  total_condominios: number;
  total_usuarios: number;
  usuarios_ativos: number;
  usuarios_pendentes: number;
  total_unidades: number;
}

export function useAdmin() {
  const supabase = getSupabaseClient();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [condominios, setCondominios] = useState<AdminCondominio[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // FETCH USERS - via API route (service role bypassa RLS/404)
  // ============================================
  const fetchUsers = useCallback(async (filters?: FetchUsersFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.condominio_id) params.set('condominio_id', filters.condominio_id);

      const res = await fetch(`/api/admin/usuarios?${params.toString()}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string })?.error || res.statusText);
      }

      const { data } = (await res.json()) as { data: AdminUser[] };
      setUsers(data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // FETCH CONDOMINIOS
  // ============================================
  const fetchCondominios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('condominios')
        .select(
          `
          id,
          nome,
          cnpj,
          endereco,
          created_at,
          blocos (
            unidades_habitacionais (id)
          ),
          usuarios!usuarios_condominio_id_fkey (
            id,
            nome,
            role
          )
        `
        )
        .order('nome');

      if (fetchError) throw fetchError;

      if (!data || !Array.isArray(data)) {
        logger.error('Invalid data format in fetchCondominios:', data);
        throw new Error('Failed to load condomínios');
      }

      type CondominioWithRelations = {
        id: string;
        nome: string;
        cnpj: string | null;
        endereco: string;
        created_at: string;
        blocos: Array<{ unidades_habitacionais: Array<{ id: string }> }> | null;
        usuarios: Array<{ id: string; nome: string; role: string }> | null;
      };

      const formattedCondominios: AdminCondominio[] = (data || []).map(
        (condo: CondominioWithRelations) => {
          const totalUnidades =
            condo.blocos?.reduce(
              (acc: number, bloco) => acc + (bloco.unidades_habitacionais?.length || 0),
              0
            ) || 0;

          const sindico = condo.usuarios?.find((u) => u.role === 'sindico');

          return {
            id: condo.id,
            nome: condo.nome,
            slug: condo.cnpj || condo.id,
            endereco: condo.endereco,
            status: 'ativo' as StatusType,
            created_at: condo.created_at,
            total_usuarios: condo.usuarios?.length || 0,
            total_unidades: totalUnidades,
            sindico_nome: sindico?.nome || null,
          };
        }
      );

      setCondominios(formattedCondominios);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // ============================================
  // FETCH STATS
  // ============================================
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        { count: totalCondominios },
        { count: totalUsuarios },
        { count: usuariosAtivos },
        { count: usuariosPendentes },
        { count: totalUnidades },
      ] = await Promise.all([
        supabase.from('condominios').select('*', { count: 'exact', head: true }),
        supabase.from('usuarios').select('*', { count: 'exact', head: true }),
        supabase
          .from('usuarios')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase
          .from('usuarios')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase.from('unidades_habitacionais').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        total_condominios: totalCondominios || 0,
        total_usuarios: totalUsuarios || 0,
        usuarios_ativos: usuariosAtivos || 0,
        usuarios_pendentes: usuariosPendentes || 0,
        total_unidades: totalUnidades || 0,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // ============================================
  // UPDATE USER STATUS
  // ============================================
  const updateUserStatus = useCallback(
    async (userId: string, status: StatusType): Promise<boolean> => {
      setLoading(true);
      try {
        // StatusType agora já está em inglês, não precisa mapear
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({ status: status as UserStatus, updated_at: new Date().toISOString() })
          .eq('id', userId);

        if (updateError) throw updateError;

        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status } : u)));
        return true;
      } catch (err) {
        setError(getErrorMessage(err));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // ============================================
  // UPDATE USER ROLE
  // ============================================
  const updateUserRole = useCallback(
    async (userId: string, condominioId: string, role: RoleType): Promise<boolean> => {
      setLoading(true);
      try {
        // Atualiza diretamente na tabela usuarios (relação 1:1)
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({ role: role as UserRole })
          .eq('id', userId)
          .eq('condominio_id', condominioId);

        if (updateError) throw updateError;

        setUsers((prev) =>
          prev.map((u) => {
            if (u.id === userId) {
              return {
                ...u,
                condominios: u.condominios.map((c) =>
                  c.condominio_id === condominioId ? { ...c, role } : c
                ),
              };
            }
            return u;
          })
        );

        return true;
      } catch (err) {
        setError(getErrorMessage(err));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // ============================================
  // SEARCH USERS - via API route
  // ============================================
  const searchUsers = useCallback(async (query: string): Promise<AdminUser[]> => {
    if (!query || query.length < 2) return [];
    try {
      const buscaSanitizada = sanitizeSearchQuery(query);
      const res = await fetch(`/api/admin/usuarios?search=${encodeURIComponent(buscaSanitizada)}`, {
        credentials: 'include',
      });
      if (!res.ok) return [];
      const { data } = (await res.json()) as { data: AdminUser[] };
      return data || [];
    } catch (err) {
      setError(getErrorMessage(err));
      return [];
    }
  }, []);

  return {
    users,
    condominios,
    stats,
    loading,
    error,
    fetchUsers,
    fetchCondominios,
    fetchStats,
    updateUserStatus,
    updateUserRole,
    searchUsers,
  };
}
