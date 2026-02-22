'use client';

import { logger } from '@/lib/logger';
import { UsuarioSchema } from '@/lib/schemas/auth';
import { useCallback, useState } from 'react';
import type { UsuarioCondominioJoin, UsuarioWithCondominios } from './types';

type ProfileDeps = {
  supabase: {
    from: (table: string) => any;
  };
  initialProfile?: UsuarioWithCondominios | null;
};

export function useAuthProfile({ supabase, initialProfile }: ProfileDeps) {
  const [profile, setProfile] = useState<UsuarioWithCondominios | null>(initialProfile ?? null);

  const fetchProfile = useCallback(
    async (userId: string): Promise<UsuarioWithCondominios | null> => {
      try {
        const { data: profileData, error } = await supabase
          .from('usuarios')
          .select(
            `
          *,
          usuario_condominios (
            condominio:condominio_id (
              id,
              nome
            ),
            role,
            status
          )
        `
          )
          .eq('auth_id', userId);

        if (error) {
          logger.warn('Erro no join de condominios, usando fallback:', error.message);
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('auth_id', userId);

          if (fallbackError || !fallbackData || fallbackData.length === 0) {
            logger.error('Erro ao buscar perfil (fallback):', fallbackError);
            return null;
          }

          const rawUser = fallbackData[0];
          return {
            ...rawUser,
            condominio_id: undefined,
            condominios: [],
            condominio_atual: null,
            usuario_condominios: [],
          } as unknown as UsuarioWithCondominios;
        }

        if (!profileData || profileData.length === 0) {
          logger.error('Perfil não encontrado para auth_id:', userId);
          return null;
        }

        const rawUser = profileData[0];
        const parseResult = UsuarioSchema.safeParse(rawUser);
        if (!parseResult.success) {
          logger.warn('Erro de validação de schema do usuário:', parseResult.error);
        }

        const userCondominios = (rawUser.usuario_condominios || [])
          .filter((uc: UsuarioCondominioJoin) => uc.status === 'active' || uc.status === 'ativo')
          .map((uc: UsuarioCondominioJoin) => ({
            condominio_id: uc.condominio.id,
            nome: uc.condominio.nome,
            role: uc.role,
            unidade_id: rawUser.unidade_id,
            unidade_identificador: undefined,
          }));

        const condominioAtual =
          userCondominios.length > 0
            ? {
                id: userCondominios[0].condominio_id,
                nome: userCondominios[0].nome,
                role: userCondominios[0].role,
              }
            : null;

        const usuario: UsuarioWithCondominios = {
          ...rawUser,
          condominio_id: undefined,
          condominios: userCondominios.map((cond) => ({
            condominio_id: cond.condominio_id,
            role: cond.role,
            unidade_identificador: cond.unidade_identificador,
            condominio: { nome: cond.nome },
          })),
          condominio_atual: condominioAtual,
          usuario_condominios: [],
        } as unknown as UsuarioWithCondominios;

        return usuario;
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro desconhecido ao buscar perfil';
        logger.error('Erro ao buscar perfil:', errorMessage);
        return null;
      }
    },
    [supabase]
  );

  const refreshProfile = useCallback(
    async (userId: string | null) => {
      if (!userId) return;
      const nextProfile = await fetchProfile(userId);
      setProfile(nextProfile);
    },
    [fetchProfile]
  );

  const clearProfile = useCallback(() => {
    setProfile(null);
  }, []);

  return {
    profile,
    setProfile,
    fetchProfile,
    refreshProfile,
    clearProfile,
  };
}
