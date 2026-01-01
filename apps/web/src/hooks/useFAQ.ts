'use client';

import { sanitizeSearchQuery } from '@/lib/sanitize';
import { getSupabaseClient } from '@/lib/supabase';
import type {
  CreateFAQInput,
  FAQ,
  FAQFilters,
  PaginatedResponse,
  UpdateFAQInput,
} from '@versix/shared';
import { useCallback, useState } from 'react';

export function useFAQ() {
  const supabase = getSupabaseClient();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });

  const fetchFAQs = useCallback(
    async (condominioId: string, filters?: FAQFilters): Promise<PaginatedResponse<FAQ>> => {
      setLoading(true);
      setError(null);
      try {
        const page = filters?.page || 1;
        const pageSize = filters?.pageSize || 50;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
          .from('faq')
          .select('*', { count: 'exact' })
          .eq('condominio_id', condominioId)
          .is('deleted_at', null)
          .order('destaque', { ascending: false })
          .order('ordem')
          .range(from, to);

        if (filters?.categoria) query = query.eq('categoria', filters.categoria);
        if (filters?.destaque !== undefined) query = query.eq('destaque', filters.destaque);
        if (filters?.busca) {
          const buscaSanitizada = sanitizeSearchQuery(filters.busca);
          if (buscaSanitizada)
            query = query.or(
              `pergunta.ilike.%${buscaSanitizada}%,resposta.ilike.%${buscaSanitizada}%`
            );
        }
        if (filters?.tags && filters.tags.length > 0) query = query.overlaps('tags', filters.tags);

        const { data, error: fetchError, count } = await query;
        if (fetchError) throw fetchError;

        const total = count || 0;
        const result: PaginatedResponse<FAQ> = {
          data: data || [],
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
            hasMore: to < total - 1,
          },
        };
        setFaqs(result.data);
        setPagination(result.pagination);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar FAQs');
        return {
          data: [],
          pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0, hasMore: false },
        };
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const getFAQ = useCallback(
    async (id: string): Promise<FAQ | null> => {
      try {
        const { data, error: fetchError } = await supabase
          .from('faq')
          .select('*')
          .eq('id', id)
          .single();
        if (fetchError) throw fetchError;
        // Incrementar visualização
        await supabase
          .from('faq')
          .update({ visualizacoes: data.visualizacoes + 1 })
          .eq('id', id);
        return data;
      } catch (err) {
        console.error('Erro ao buscar FAQ:', err);
        return null;
      }
    },
    [supabase]
  );

  const createFAQ = useCallback(
    async (condominioId: string, criadoPor: string, input: CreateFAQInput): Promise<FAQ | null> => {
      setLoading(true);
      try {
        const { data, error: insertError } = await supabase
          .from('faq')
          .insert({ condominio_id: condominioId, criado_por: criadoPor, ...input })
          .select()
          .single();
        if (insertError) throw insertError;
        setFaqs((prev) => [data, ...prev]);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao criar FAQ');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const updateFAQ = useCallback(
    async (input: UpdateFAQInput): Promise<FAQ | null> => {
      setLoading(true);
      try {
        const { id, ...updates } = input;
        const { data, error: updateError } = await supabase
          .from('faq')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (updateError) throw updateError;
        setFaqs((prev) => prev.map((f: FAQ) => (f.id === id ? data : f)));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao atualizar FAQ');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const deleteFAQ = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      try {
        const { error: deleteError } = await supabase
          .from('faq')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id);
        if (deleteError) throw deleteError;
        setFaqs((prev) => prev.filter((f) => f.id !== id));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao excluir FAQ');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const voteUseful = useCallback(
    async (faqId: string, useful: boolean): Promise<boolean> => {
      try {
        await supabase.rpc('vote_faq_useful', { p_faq_id: faqId, p_util: useful });
        // Atualizar localmente
        setFaqs((prev) =>
          prev.map((f) => {
            if (f.id !== faqId) return f;
            const newSim = useful ? (f.votos_util ?? 0) + 1 : (f.votos_util ?? 0);
            const newNao = useful ? (f.votos_inutil ?? 0) : (f.votos_inutil ?? 0) + 1;
            return {
              ...f,
              votos_util: newSim,
              votos_inutil: newNao,
            };
          })
        );
        return true;
      } catch {
        return false;
      }
    },
    [supabase]
  );

  const reorderFAQs = useCallback(
    async (orderedIds: string[]): Promise<boolean> => {
      setLoading(true);
      try {
        const updates = orderedIds.map((id, index) =>
          supabase.from('faq').update({ ordem: index }).eq('id', id)
        );
        await Promise.all(updates);
        // Reordenar localmente
        setFaqs((prev) => {
          const ordered = [...prev];
          ordered.sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id));
          return ordered.map((f, i) => ({ ...f, ordem: i }));
        });
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao reordenar FAQs');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const getCategorias = useCallback(
    async (condominioId: string): Promise<string[]> => {
      try {
        const { data } = await supabase
          .from('faq')
          .select('categoria')
          .eq('condominio_id', condominioId)
          .is('deleted_at', null)
          .not('categoria', 'is', null);
        const categorias = Array.from(
          new Set(
            (data || []).map((f: { categoria: string | null }) => f.categoria).filter(Boolean)
          )
        ) as string[];
        return categorias.sort();
      } catch {
        return [];
      }
    },
    [supabase]
  );

  return {
    faqs,
    loading,
    error,
    pagination,
    fetchFAQs,
    getFAQ,
    createFAQ,
    updateFAQ,
    deleteFAQ,
    voteUseful,
    reorderFAQs,
    getCategorias,
  };
}

export type { CreateFAQInput, FAQ, FAQFilters, UpdateFAQInput };
