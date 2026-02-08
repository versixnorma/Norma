'use client';

import { getErrorMessage } from '@/lib/errors';
import { useCallback, useState } from 'react';

// ============================================
// TYPES
// ============================================
export interface NormaDocument {
  id: string;
  name: string;
  type: string;
  source_type: string;
  category: string | null;
  tags: string[] | null;
  status: string;
  file_url: string | null;
  chunk_count: number;
  created_by: string;
  created_at: string;
  processed_at: string | null;
}

export interface NormaConversation {
  id: string;
  condominio_id: string;
  condominio_nome: string;
  user_id: string;
  usuario_nome: string;
  message: string;
  response: string;
  sources: unknown;
  created_at: string;
}

export interface NormaAIMetrics {
  totalDocuments: number;
  totalChunks: number;
  documentsByType: Array<{ source_type: string; count: number }>;
  totalConversations: number;
  avgResponseTimeMs: number;
  satisfactionScore: number;
  activeUsers: number;
  dailyTrend: Array<{ date: string; queries: number; avg_response_ms: number }>;
}

interface CreateManualKnowledgePayload {
  title: string;
  content: string;
  category: string;
  tags: string[];
  condominioId: string;
  userId: string;
}

// ============================================
// HOOK
// ============================================
export function useNormaAI() {
  const [documents, setDocuments] = useState<NormaDocument[]>([]);
  const [conversations, setConversations] = useState<NormaConversation[]>([]);
  const [metrics, setMetrics] = useState<NormaAIMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // DOCUMENTS
  // ============================================
  const fetchDocuments = useCallback(
    async (filters?: { source_type?: string; category?: string; status?: string }) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filters?.source_type) params.set('source_type', filters.source_type);
        if (filters?.category) params.set('category', filters.category);
        if (filters?.status) params.set('status', filters.status);

        const res = await fetch(`/api/admin/norma-ai/documents?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Erro ao buscar documentos');
        setDocuments(json.data || []);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const createManualKnowledge = useCallback(
    async (payload: CreateManualKnowledgePayload) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/norma-ai/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Erro ao criar conhecimento');
        // Refresh list after creation
        await fetchDocuments();
        return json;
      } catch (err) {
        setError(getErrorMessage(err));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchDocuments]
  );

  const deleteDocument = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/norma-ai/documents/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao deletar documento');
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // CONVERSATIONS
  // ============================================
  const fetchConversations = useCallback(
    async (filters?: { condominio_id?: string; limit?: number }) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filters?.condominio_id) params.set('condominio_id', filters.condominio_id);
        if (filters?.limit) params.set('limit', String(filters.limit));

        const res = await fetch(`/api/admin/norma-ai/conversations?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Erro ao buscar conversas');
        setConversations(json.data || []);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ============================================
  // METRICS
  // ============================================
  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/norma-ai/metrics');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao buscar métricas');
      setMetrics(json.data || null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // FEEDBACK
  // ============================================
  const submitFeedback = useCallback(
    async (data: {
      conversationId?: string;
      userId: string;
      condominioId?: string;
      rating: number;
      feedbackText?: string;
    }) => {
      try {
        const res = await fetch('/api/admin/norma-ai/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    []
  );

  return {
    documents,
    conversations,
    metrics,
    loading,
    error,
    fetchDocuments,
    createManualKnowledge,
    deleteDocument,
    fetchConversations,
    fetchMetrics,
    submitFeedback,
  };
}
