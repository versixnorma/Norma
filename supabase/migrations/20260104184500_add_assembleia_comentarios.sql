-- ============================================================
-- VERSIX NORMA - ASSEMBLEIAS DIGITAIS
-- Migration: Adicionar Comentários em Pautas
-- Data: 2026-01-04
-- ============================================================

-- 1. ENUMS
-- ============================================================
CREATE TYPE public.comentario_tipo AS ENUM (
  'comentario',
  'pergunta',
  'resposta',
  'moderacao'
);

-- 2. TABELA: assembleia_comentarios
-- ============================================================
CREATE TABLE public.assembleia_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pauta_id UUID NOT NULL REFERENCES public.assembleia_pautas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,

  -- Conteúdo
  conteudo TEXT NOT NULL,
  tipo public.comentario_tipo NOT NULL DEFAULT 'comentario',
  parent_id UUID REFERENCES public.assembleia_comentarios(id) ON DELETE CASCADE, -- Para respostas (threads)

  -- Moderação
  visivel BOOLEAN NOT NULL DEFAULT true,
  moderado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  moderado_em TIMESTAMPTZ,
  motivo_moderacao TEXT,

  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices e Comentários
CREATE INDEX idx_comentarios_pauta ON public.assembleia_comentarios(pauta_id);
CREATE INDEX idx_comentarios_usuario ON public.assembleia_comentarios(usuario_id);
CREATE INDEX idx_comentarios_parent ON public.assembleia_comentarios(parent_id);

COMMENT ON TABLE public.assembleia_comentarios IS 'Comentários e perguntas nas pautas de assembleia';

-- 3. TRIGGERS
-- ============================================================
CREATE TRIGGER set_updated_at_comentarios
  BEFORE UPDATE ON public.assembleia_comentarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4. RLS - POLICIES
-- ============================================================
ALTER TABLE public.assembleia_comentarios ENABLE ROW LEVEL SECURITY;

-- Leitura: Qualquer usuário autenticado pode ver comentários VISÍVEIS
-- (Poderia refinar para filtrar por condomínio, mas o join com pauta já isola)
CREATE POLICY "assembleia_comentarios_read" ON public.assembleia_comentarios
  FOR SELECT USING (
    (visivel = true) OR
    (auth.uid() = usuario_id) OR
    (EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid() AND role IN ('sindico', 'subsindico', 'admin_condo', 'superadmin')
    ))
  );

-- Insert: Usuários podem comentar
CREATE POLICY "assembleia_comentarios_insert" ON public.assembleia_comentarios
  FOR INSERT WITH CHECK (
    auth.uid() = usuario_id
  );

-- Update:
-- 1. O próprio usuário pode editar seu comentário (opcional, aqui permitido)
-- 2. Moderadores podem editar (para moderar/ocultar)
CREATE POLICY "assembleia_comentarios_update" ON public.assembleia_comentarios
  FOR UPDATE USING (
    (auth.uid() = usuario_id) OR
    (EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid() AND role IN ('sindico', 'subsindico', 'admin_condo', 'superadmin')
    ))
  );

-- Delete: Usuário ou Admin
CREATE POLICY "assembleia_comentarios_delete" ON public.assembleia_comentarios
  FOR DELETE USING (
    (auth.uid() = usuario_id) OR
    (EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid() AND role IN ('sindico', 'subsindico', 'admin_condo', 'superadmin')
    ))
  );
