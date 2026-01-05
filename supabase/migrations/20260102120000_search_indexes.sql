-- ============================================
-- VERSIX NORMA - MIGRATION: SEARCH INDEXES
-- ============================================
-- Otimização de busca textual com pg_trgm
-- ============================================

-- 1. Habilitar extensão pg_trgm (Trigram Matching)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Índices para Busca de Moradores (Nome, Email)
CREATE INDEX IF NOT EXISTS idx_usuarios_nome_trgm ON public.usuarios USING GIN (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_usuarios_email_trgm ON public.usuarios USING GIN (email gin_trgm_ops);

-- 3. Índices para Ocorrências (Título, Descrição)
CREATE INDEX IF NOT EXISTS idx_ocorrencias_titulo_trgm ON public.ocorrencias USING GIN (titulo gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_descricao_trgm ON public.ocorrencias USING GIN (descricao gin_trgm_ops);

-- 4. Índices para Chamados (Título, Descrição)
CREATE INDEX IF NOT EXISTS idx_chamados_titulo_trgm ON public.chamados USING GIN (titulo gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_chamados_descricao_trgm ON public.chamados USING GIN (descricao gin_trgm_ops);

-- 5. Índices para Assembleias (Título)
CREATE INDEX IF NOT EXISTS idx_assembleias_titulo_trgm ON public.assembleias USING GIN (titulo gin_trgm_ops);

-- 6. Índices para Comunicados (Título, Conteúdo)
CREATE INDEX IF NOT EXISTS idx_comunicados_titulo_trgm ON public.comunicados USING GIN (titulo gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_comunicados_conteudo_trgm ON public.comunicados USING GIN (conteudo gin_trgm_ops);

-- Comentários
COMMENT ON EXTENSION pg_trgm IS 'Extensão para busca textual fuzzy (LIKE/ILIKE) performática';
