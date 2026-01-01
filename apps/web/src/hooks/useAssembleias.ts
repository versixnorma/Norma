'use client';

import { getSupabaseClient } from '@/lib/supabase';
import type {
  AssembleiaComJoins,
  AssembleiaFilters,
  CreateAssembleiaInput,
  CreatePautaInput,
  QuorumInfo,
  UpdateAssembleiaInput,
} from '@versix/shared';
import { Database } from '@versix/shared';
import { useCallback, useState } from 'react';

type AssembleiaRow = Database['public']['Tables']['assembleias']['Row'];
type PautaRow = Database['public']['Tables']['assembleia_pautas']['Row'];
type PresencaRow = Database['public']['Tables']['assembleia_presencas']['Row'];

interface AssembleiaQueryResult extends AssembleiaRow {
  convocador?: { nome: string } | null;
  secretario?: { nome: string } | null;
  pautas?: PautaRow[];
  presencas?: PresencaRow[];
}

const toAssembleia = (data: AssembleiaQueryResult): AssembleiaComJoins => ({
  ...data,
  convocador: data.convocador,
  secretario: data.secretario,
  pautas: data.pautas || [],
  presencas: data.presencas || [],
});

/**
 * Hook para gerenciamento de assembleias condominiais
 * Permite buscar assembleias, pautas, presenças e atualizar informações.
 * @returns Métodos e estados de assembleias
 */
export function useAssembleias() {
  const supabase = getSupabaseClient();
  const [assembleias, setAssembleias] = useState<AssembleiaComJoins[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssembleias = useCallback(
    async (condominioId: string, filters?: AssembleiaFilters): Promise<AssembleiaComJoins[]> => {
      setLoading(true);
      try {
        let query = supabase
          .from('assembleias')
          .select(
            '*, convocador:usuarios!assembleias_convocador_id_fkey(nome), secretario:usuarios!assembleias_secretario_id_fkey(nome), pautas:assembleia_pautas(*)'
          )
          .eq('condominio_id', condominioId)
          .order('data_primeira_convocacao', { ascending: false });
        if (filters?.tipo) query = query.eq('tipo', filters.tipo);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.ano_referencia) query = query.eq('ano_referencia', filters.ano_referencia);

        const { data, error: fetchError } = await query;
        if (fetchError) throw fetchError;
        const transformedData = (data || []).map((item: any) =>
          toAssembleia(item as AssembleiaQueryResult)
        );
        setAssembleias(transformedData);
        return transformedData;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const getAssembleia = useCallback(
    async (id: string): Promise<AssembleiaComJoins | null> => {
      try {
        const { data, error: fetchError } = await supabase
          .from('assembleias')
          .select(
            `*, convocador:usuarios!assembleias_convocador_id_fkey(nome), secretario:usuarios!assembleias_secretario_id_fkey(nome), pautas:assembleia_pautas(*, opcoes:assembleia_pauta_opcoes(*)), presencas:assembleia_presencas(*, usuario:usuarios!assembleia_presencas_usuario_id_fkey(nome, avatar_url), unidades_habitacionais:unidades_habitacionais!assembleia_presencas_unidade_id_fkey(identificador, bloco:blocos!unidades_habitacionais_bloco_id_fkey(nome)))`
          )
          .eq('id', id)
          .single();
        if (fetchError) throw fetchError;

        // Buscar quorum
        const { data: quorum } = await supabase
          .from('v_assembleia_quorum')
          .select('*')
          .eq('assembleia_id', id)
          .single();

        return {
          ...toAssembleia(data as AssembleiaQueryResult),
          quorum,
        } as unknown as AssembleiaComJoins;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        return null;
      }
    },
    [supabase]
  );

  const createAssembleia = useCallback(
    async (
      condominioId: string,
      criadoPor: string,
      input: CreateAssembleiaInput
    ): Promise<AssembleiaComJoins | null> => {
      setLoading(true);
      try {
        const { data, error: insertError } = await supabase
          .from('assembleias')
          .insert({ condominio_id: condominioId, criado_por: criadoPor, ...input })
          .select()
          .single();
        if (insertError) throw insertError;
        const assembleia = toAssembleia(data as AssembleiaQueryResult);
        setAssembleias((prev) => [assembleia, ...prev]);
        return assembleia;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const updateAssembleia = useCallback(
    async (input: UpdateAssembleiaInput): Promise<AssembleiaComJoins | null> => {
      setLoading(true);
      try {
        const { id, ...updates } = input;
        const { data, error: updateError } = await supabase
          .from('assembleias')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (updateError) throw updateError;
        const assembleia = toAssembleia(data as AssembleiaQueryResult);
        setAssembleias((prev) => prev.map((a) => (a.id === id ? assembleia : a)));
        return assembleia;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const deleteAssembleia = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await supabase.from('assembleias').delete().eq('id', id);
        if (deleteError) throw deleteError;
        setAssembleias((prev) => prev.filter((a) => a.id !== id));
        return true;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        return false;
      }
    },
    [supabase]
  );

  // Ações de workflow
  const convocarAssembleia = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { data, error: rpcError } = await supabase.rpc('convocar_assembleia' as any, {
          p_assembleia_id: id,
        });
        if (rpcError) throw rpcError;
        const status: Database['public']['Enums']['assembleia_status'] = 'convocada';
        setAssembleias((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
        return Boolean(data);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        return false;
      }
    },
    [supabase]
  );

  const iniciarAssembleia = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { data, error: rpcError } = await supabase.rpc('iniciar_assembleia' as any, {
          p_assembleia_id: id,
        });
        if (rpcError) throw rpcError;
        const status: Database['public']['Enums']['assembleia_status'] = 'em_andamento';
        setAssembleias((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
        return Boolean(data);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        return false;
      }
    },
    [supabase]
  );

  const encerrarAssembleia = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { data, error: rpcError } = await supabase.rpc('encerrar_assembleia', {
          p_assembleia_id: id,
        });
        if (rpcError) throw rpcError;
        const status: Database['public']['Enums']['assembleia_status'] = 'encerrada';
        setAssembleias((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
        return data;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        return false;
      }
    },
    [supabase]
  );

  // Pautas
  const addPauta = useCallback(
    async (assembleiaId: string, input: CreatePautaInput): Promise<PautaRow | null> => {
      try {
        const { data, error: insertError } = await supabase
          .from('assembleia_pautas')
          .insert({ assembleia_id: assembleiaId, ...input })
          .select()
          .single();
        if (insertError) throw insertError;
        return data as PautaRow;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        return null;
      }
    },
    [supabase]
  );

  const removePauta = useCallback(
    async (pautaId: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await supabase
          .from('assembleia_pautas')
          .delete()
          .eq('id', pautaId);
        if (deleteError) throw deleteError;
        return true;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        return false;
      }
    },
    [supabase]
  );

  // Realtime quorum
  const subscribeToQuorum = useCallback(
    (assembleiaId: string, onUpdate: (quorum: QuorumInfo) => void) => {
      const channel = supabase
        .channel(`quorum-${assembleiaId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'assembleia_presencas',
            filter: `assembleia_id=eq.${assembleiaId}`,
          },
          async () => {
            const { data } = await supabase
              .from('v_assembleia_quorum')
              .select('*')
              .eq('assembleia_id', assembleiaId)
              .single();
            if (data) onUpdate(data as unknown as QuorumInfo);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    },
    [supabase]
  );

  return {
    assembleias,
    loading,
    error,
    fetchAssembleias,
    getAssembleia,
    createAssembleia,
    updateAssembleia,
    deleteAssembleia,
    convocarAssembleia,
    iniciarAssembleia,
    encerrarAssembleia,
    addPauta,
    removePauta,
    subscribeToQuorum,
  };
}

export type {
  AssembleiaFilters,
  CreateAssembleiaInput,
  CreatePautaInput,
  QuorumInfo,
  UpdateAssembleiaInput,
};
