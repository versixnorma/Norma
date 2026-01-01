-- ============================================
-- VERSIX NORMA - MIGRATION: ENABLE PGVECTOR EXTENSION
-- ============================================
-- Habilitar extensão pgvector para suporte a embeddings vetoriais
-- ============================================

-- Habilitar extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector;
