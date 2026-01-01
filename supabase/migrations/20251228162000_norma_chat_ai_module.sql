-- ============================================
-- VERSIX NORMA - MIGRATION: NORMA CHAT & IA
-- ============================================
-- Tabelas e funções para o sistema de IA Norma Chat
-- ============================================

-- Habilitar extensão pgvector para embeddings
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA extensions;

-- ============================================
-- TABELA: norma_chat_logs
-- ============================================
CREATE TABLE public.norma_chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  sources JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_norma_chat_logs_condominio ON public.norma_chat_logs(condominio_id);
CREATE INDEX idx_norma_chat_logs_user ON public.norma_chat_logs(user_id);
CREATE INDEX idx_norma_chat_logs_created_at ON public.norma_chat_logs(created_at DESC);

-- ============================================
-- TABELA: document_chunks
-- ============================================
CREATE TABLE public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  document_id UUID NOT NULL, -- Reference to the original document
  document_type VARCHAR(50) NOT NULL, -- 'regimento', 'ata', 'convenção', etc.
  document_name VARCHAR(255) NOT NULL,
  page_number INTEGER,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_document_chunks_condominio ON public.document_chunks(condominio_id);
CREATE INDEX idx_document_chunks_document ON public.document_chunks(document_id);
CREATE INDEX idx_document_chunks_type ON public.document_chunks(document_type);
CREATE INDEX idx_document_chunks_embedding ON public.document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================
-- TABELA: documents
-- ============================================
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'regimento', 'ata', 'convenção', etc.
  file_path TEXT,
  file_url TEXT,
  file_size INTEGER,
  mime_type VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'processing', -- 'processing', 'completed', 'failed'
  processed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_documents_condominio ON public.documents(condominio_id);
CREATE INDEX idx_documents_type ON public.documents(type);
CREATE INDEX idx_documents_status ON public.documents(status);

-- ============================================
-- FUNÇÃO: search_document_chunks
-- ============================================
CREATE OR REPLACE FUNCTION public.search_document_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  condominio_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.content,
    jsonb_build_object(
      'document_type', dc.document_type,
      'document_name', dc.document_name,
      'page_number', dc.page_number,
      'chunk_index', dc.chunk_index
    ) as metadata,
    1 - (dc.embedding <=> query_embedding) as similarity
  FROM public.document_chunks dc
  WHERE (condominio_id IS NULL OR dc.condominio_id = search_document_chunks.condominio_id)
    AND (1 - (dc.embedding <=> query_embedding)) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Norma Chat Logs
ALTER TABLE public.norma_chat_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chat logs" ON public.norma_chat_logs
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.usuario_condominios uc
      WHERE uc.usuario_id = auth.uid()
        AND uc.condominio_id = norma_chat_logs.condominio_id
        AND uc.status = 'active'
    )
  );

CREATE POLICY "Users can insert their own chat logs" ON public.norma_chat_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Document Chunks
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view document chunks from their condominios" ON public.document_chunks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuario_condominios uc
      WHERE uc.usuario_id = auth.uid()
        AND uc.condominio_id = document_chunks.condominio_id
        AND uc.status = 'active'
    )
  );

-- Documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents from their condominios" ON public.documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuario_condominios uc
      WHERE uc.usuario_id = auth.uid()
        AND uc.condominio_id = documents.condominio_id
        AND uc.status = 'active'
    )
  );

CREATE POLICY "Users can insert documents in their condominios" ON public.documents
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.usuario_condominios uc
      WHERE uc.usuario_id = auth.uid()
        AND uc.condominio_id = documents.condominio_id
        AND uc.status = 'active'
        AND uc.role IN ('sindico', 'subsindico')
    )
  );

CREATE POLICY "Users can update documents they created" ON public.documents
  FOR UPDATE USING (created_by = auth.uid());

-- ============================================
-- TRIGGERS
-- ============================================

-- Updated at trigger for documents
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Updated at trigger for document_chunks
CREATE TRIGGER update_document_chunks_updated_at
  BEFORE UPDATE ON public.document_chunks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
