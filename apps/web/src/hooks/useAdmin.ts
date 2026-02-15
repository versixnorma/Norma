'use client';

import { getErrorMessage } from '@/lib/errors';
import { sanitizeSearchQuery } from '@/lib/sanitize';
import type { Database } from '@/types/database';

type RoleType = Database['public']['Enums']['user_role'];
type StatusType = Database['public']['Enums']['user_status'];

import { useCallback, useState } from 'react';

// ============================================
// TIPOS
// ============================================
interface FetchUsersFilters {
  status?: StatusType;
  role?: RoleType;
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
  role: RoleType;
  unidade_id: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  notificacoes_email: boolean;
  notificacoes_push: boolean;
  notificacoes_whatsapp: boolean;
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
  // FETCH CONDOMINIOS - via API route (service role bypassa RLS)
  // ============================================
  const fetchCondominios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/condominios', {
        credentials: 'include',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string })?.error || res.statusText);
      }

      const { data } = (await res.json()) as { data: AdminCondominio[] };
      setCondominios(data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // FETCH STATS - via API route (service role bypassa RLS)
  // ============================================
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/stats', {
        credentials: 'include',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string })?.error || res.statusText);
      }

      const { data } = (await res.json()) as { data: AdminStats };
      setStats(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // UPDATE USER STATUS - via API route
  // ============================================
  const updateUserStatus = useCallback(
    async (userId: string, status: StatusType): Promise<boolean> => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/usuarios', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ id: userId, status }),
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || res.statusText);
        }

        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status } : u)));
        return true;
      } catch (err) {
        setError(getErrorMessage(err));
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ============================================
  // UPDATE USER ROLE - via API route
  // ============================================
  const updateUserRole = useCallback(
    async (userId: string, _condominioId: string, role: RoleType): Promise<boolean> => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/usuarios', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ id: userId, role }),
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || res.statusText);
        }

        setUsers((prev) =>
          prev.map((u) => {
            if (u.id === userId) {
              return {
                ...u,
                role,
                condominios: u.condominios.map((c) => ({ ...c, role })),
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
    []
  );

  // ============================================
  // CREATE USER - via API route
  // ============================================
  const createUser = useCallback(
    async (userData: {
      nome: string;
      email: string;
      telefone?: string;
      role?: string;
      status?: string;
      condominio_id?: string;
      unidade_id?: string;
      cpf?: string;
      data_nascimento?: string;
      notificacoes_email?: boolean;
      notificacoes_push?: boolean;
      notificacoes_whatsapp?: boolean;
      senha?: string;
    }): Promise<{ success: boolean; error?: string }> => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(userData),
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          return { success: false, error: body.error || res.statusText };
        }

        return { success: true };
      } catch (err) {
        return { success: false, error: getErrorMessage(err) };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ============================================
  // UPDATE USER - via API route
  // ============================================
  const updateUser = useCallback(
    async (userData: {
      id: string;
      nome?: string;
      email?: string;
      telefone?: string;
      role?: string;
      status?: string;
      condominio_id?: string;
      unidade_id?: string;
      cpf?: string;
      data_nascimento?: string;
      notificacoes_email?: boolean;
      notificacoes_push?: boolean;
      notificacoes_whatsapp?: boolean;
    }): Promise<{ success: boolean; error?: string }> => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/usuarios', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(userData),
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          return { success: false, error: body.error || res.statusText };
        }

        // Update local state
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id === userData.id) {
              return {
                ...u,
                ...(userData.nome !== undefined && { nome: userData.nome }),
                ...(userData.email !== undefined && { email: userData.email }),
                ...(userData.telefone !== undefined && { telefone: userData.telefone }),
                ...(userData.status !== undefined && { status: userData.status as StatusType }),
              };
            }
            return u;
          })
        );

        return { success: true };
      } catch (err) {
        return { success: false, error: getErrorMessage(err) };
      } finally {
        setLoading(false);
      }
    },
    []
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
    createUser,
    updateUser,
    searchUsers,
  };
}
