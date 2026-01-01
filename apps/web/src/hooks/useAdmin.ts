'use client';

import { getErrorMessage } from '@/lib/errors';
import { sanitizeSearchQuery } from '@/lib/sanitize';
import { getSupabaseClient } from '@/lib/supabase';
import type { RoleType, StatusType } from '@/types/database';
import { Database } from '@versix/shared';
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
  // FETCH USERS - COM TIPAGEM CORRETA
  // ============================================
  const fetchUsers = useCallback(
    async (filters?: FetchUsersFilters) => {
      setLoading(true);
      setError(null);
      try {
        let query = supabase
          .from('usuarios')
          .select(
            `
          id,
          auth_id,
          nome,
          email,
          telefone,
          avatar_url,
          status,
          created_at,
          updated_at,
          role,
          condominio_id,
          unidade_id,
          condominios:condominio_id (nome),
          unidades_habitacionais:unidade_id (identificador)
        `
          )
          .order('created_at', { ascending: false });

        if (filters?.status) {
          query = query.eq('status', filters.status);
        }
        if (filters?.condominio_id) {
          query = query.eq('condominio_id', filters.condominio_id);
        }
        if (filters?.role) {
          query = query.eq('role', filters.role);
        }

        const { data, error: fetchError } = await query;
        if (fetchError) throw fetchError;

        type UsuarioWithRelations = {
          id: string;
          auth_id: string | null;
          nome: string;
          email: string;
          telefone: string | null;
          avatar_url: string | null;
          status: UserStatus;
          created_at: string;
          updated_at: string;
          role: UserRole;
          condominio_id: string | null;
          unidade_id: string | null;
          condominios: { nome: string } | null;
          unidades_habitacionais: { identificador: string } | null;
        };

        const formattedUsers: AdminUser[] = ((data || []) as UsuarioWithRelations[]).map(
          (user) => ({
            id: user.id,
            auth_id: user.auth_id || '',
            nome: user.nome,
            email: user.email,
            telefone: user.telefone,
            avatar_url: user.avatar_url,
            status: user.status as StatusType,
            created_at: user.created_at,
            updated_at: user.updated_at,
            condominios: user.condominio_id
              ? [
                  {
                    condominio_id: user.condominio_id,
                    condominio_nome: user.condominios?.nome || '',
                    role: user.role as RoleType,
                    unidade_id: user.unidade_id,
                    unidade_identificador: user.unidades_habitacionais?.identificador || null,
                  },
                ]
              : [],
          })
        );

        setUsers(formattedUsers);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

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
        console.error('Invalid data format in fetchCondominios:', data);
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
  // SEARCH USERS
  // ============================================
  const searchUsers = useCallback(
    async (query: string): Promise<AdminUser[]> => {
      if (!query || query.length < 2) return [];
      try {
        const buscaSanitizada = sanitizeSearchQuery(query);
        const { data } = await supabase
          .from('usuarios')
          .select(
            `
          id,
          auth_id,
          nome,
          email,
          telefone,
          avatar_url,
          status,
          created_at,
          updated_at,
          role,
          condominio_id
        `
          )
          .or(`nome.ilike.%${buscaSanitizada}%,email.ilike.%${buscaSanitizada}%`)
          .limit(20);

        return (data || []).map((user: any) => ({
          id: user.id,
          auth_id: user.auth_id || '',
          nome: user.nome,
          email: user.email,
          telefone: user.telefone,
          avatar_url: user.avatar_url,
          status: user.status as StatusType,
          created_at: user.created_at,
          updated_at: user.updated_at,
          condominios: [],
        }));
      } catch (err) {
        setError(getErrorMessage(err));
        return [];
      }
    },
    [supabase]
  );

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
