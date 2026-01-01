-- ============================================
-- VERSIX NORMA - MIGRATION 006: MÓDULOS OPERACIONAIS
-- Sprint 3: Comunicados, Ocorrências, Chamados, FAQ
-- ============================================

-- ============================================
-- ENUMS ADICIONAIS
-- ============================================

-- Status de comunicados
CREATE TYPE public.comunicado_status AS ENUM (
  'rascunho',
  'publicado',
  'arquivado'
);
-- Status de ocorrências
CREATE TYPE public.ocorrencia_status AS ENUM (
  'aberta',
  'em_analise',
  'em_andamento',
  'resolvida',
  'arquivada'
);
-- Categorias de ocorrências
CREATE TYPE public.ocorrencia_categoria AS ENUM (
  'barulho',
  'vazamento',
  'iluminacao',
  'limpeza',
  'seguranca',
  'area_comum',
  'elevador',
  'portaria',
  'animais',
  'estacionamento',
  'outros'
);
-- Status de chamados
CREATE TYPE public.chamado_status AS ENUM (
  'novo',
  'em_atendimento',
  'aguardando_resposta',
  'resolvido',
  'fechado'
);
-- Categorias de chamados
CREATE TYPE public.chamado_categoria AS ENUM (
  'segunda_via_boleto',
  'atualizacao_cadastro',
  'reserva_espaco',
  'autorizacao_obra',
  'mudanca',
  'reclamacao',
  'sugestao',
  'duvida',
  'outros'
);
-- ============================================
-- TABELA: comunicados (melhorada)
-- ============================================
-- Nota: já existe tabela comunicados do Sprint 1
-- Vamos adicionar colunas faltantes

ALTER TABLE public.comunicados 
ADD COLUMN IF NOT EXISTS status public.comunicado_status DEFAULT 'rascunho',
ADD COLUMN IF NOT EXISTS resumo VARCHAR(500),
ADD COLUMN IF NOT EXISTS destaque BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
-- Renomear data_publicacao para publicar_em se existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'comunicados' AND column_name = 'data_publicacao') THEN
    ALTER TABLE public.comunicados RENAME COLUMN data_publicacao TO publicar_em;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'comunicados' AND column_name = 'data_expiracao') THEN
    ALTER TABLE public.comunicados RENAME COLUMN data_expiracao TO expirar_em;
  END IF;
END $$;
-- Adicionar colunas de agendamento se não existirem
ALTER TABLE public.comunicados 
ADD COLUMN IF NOT EXISTS publicar_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS expirar_em TIMESTAMPTZ;
-- ============================================
-- TABELA: comunicados_leitura
-- ============================================
CREATE TABLE IF NOT EXISTS public.comunicados_leitura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comunicado_id UUID NOT NULL REFERENCES public.comunicados(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  lido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(comunicado_id, usuario_id)
);
CREATE INDEX IF NOT EXISTS idx_leitura_comunicado ON public.comunicados_leitura(comunicado_id);
CREATE INDEX IF NOT EXISTS idx_leitura_usuario ON public.comunicados_leitura(usuario_id);
COMMENT ON TABLE public.comunicados_leitura IS 'Registro de leitura de comunicados por usuário';
-- ============================================
-- TABELA: ocorrencias
-- ============================================
CREATE TABLE public.ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  
  -- Quem reportou
  reportado_por UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  anonimo BOOLEAN NOT NULL DEFAULT false,
  
  -- Localização
  unidade_relacionada_id UUID REFERENCES public.unidades_habitacionais(id) ON DELETE SET NULL,
  local_descricao VARCHAR(200),
  
  -- Conteúdo
  titulo VARCHAR(200) NOT NULL,
  descricao TEXT NOT NULL,
  
  -- Categorização
  categoria public.ocorrencia_categoria NOT NULL DEFAULT 'outros',
  prioridade public.prioridade NOT NULL DEFAULT 'media',
  status public.ocorrencia_status NOT NULL DEFAULT 'aberta',
  
  -- Responsável pelo atendimento
  responsavel_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  
  -- Resolução
  resolucao TEXT,
  resolvido_em TIMESTAMPTZ,
  resolvido_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  
  -- Anexos (fotos do problema)
  anexos JSONB DEFAULT '[]'::JSONB,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT check_ocorrencia_titulo CHECK (char_length(titulo) >= 5),
  CONSTRAINT check_ocorrencia_descricao CHECK (char_length(descricao) >= 20)
);
-- Índices
CREATE INDEX idx_ocorrencias_condominio ON public.ocorrencias(condominio_id);
CREATE INDEX idx_ocorrencias_reportador ON public.ocorrencias(reportado_por);
CREATE INDEX idx_ocorrencias_status ON public.ocorrencias(status);
CREATE INDEX idx_ocorrencias_categoria ON public.ocorrencias(categoria);
CREATE INDEX idx_ocorrencias_prioridade ON public.ocorrencias(prioridade);
CREATE INDEX idx_ocorrencias_responsavel ON public.ocorrencias(responsavel_id);
CREATE INDEX idx_ocorrencias_created ON public.ocorrencias(created_at DESC);
CREATE INDEX idx_ocorrencias_deleted ON public.ocorrencias(deleted_at) WHERE deleted_at IS NULL;
COMMENT ON TABLE public.ocorrencias IS 'Ocorrências reportadas por moradores';
COMMENT ON COLUMN public.ocorrencias.anonimo IS 'Se true, nome do reportador é ocultado do síndico';
-- ============================================
-- TABELA: ocorrencias_historico
-- ============================================
CREATE TABLE public.ocorrencias_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ocorrencia_id UUID NOT NULL REFERENCES public.ocorrencias(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  
  -- Mudança
  status_anterior public.ocorrencia_status,
  status_novo public.ocorrencia_status NOT NULL,
  comentario TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_historico_ocorrencia ON public.ocorrencias_historico(ocorrencia_id);
CREATE INDEX idx_historico_created ON public.ocorrencias_historico(created_at DESC);
COMMENT ON TABLE public.ocorrencias_historico IS 'Histórico de mudanças de status das ocorrências';
-- ============================================
-- TABELA: chamados
-- ============================================
CREATE TABLE public.chamados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  
  -- Solicitante
  solicitante_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  
  -- Conteúdo
  titulo VARCHAR(200) NOT NULL,
  descricao TEXT NOT NULL,
  
  -- Categorização
  categoria public.chamado_categoria NOT NULL DEFAULT 'duvida',
  prioridade public.prioridade NOT NULL DEFAULT 'media',
  status public.chamado_status NOT NULL DEFAULT 'novo',
  
  -- Atendimento
  atendente_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  
  -- Resolução
  resposta_final TEXT,
  resolvido_em TIMESTAMPTZ,
  
  -- Avaliação
  avaliacao_nota INTEGER CHECK (avaliacao_nota BETWEEN 1 AND 5),
  avaliacao_comentario TEXT,
  avaliado_em TIMESTAMPTZ,
  
  -- Anexos
  anexos JSONB DEFAULT '[]'::JSONB,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT check_chamado_titulo CHECK (char_length(titulo) >= 5),
  CONSTRAINT check_chamado_descricao CHECK (char_length(descricao) >= 10)
);
-- Índices
CREATE INDEX idx_chamados_condominio ON public.chamados(condominio_id);
CREATE INDEX idx_chamados_solicitante ON public.chamados(solicitante_id);
CREATE INDEX idx_chamados_status ON public.chamados(status);
CREATE INDEX idx_chamados_categoria ON public.chamados(categoria);
CREATE INDEX idx_chamados_atendente ON public.chamados(atendente_id);
CREATE INDEX idx_chamados_created ON public.chamados(created_at DESC);
CREATE INDEX idx_chamados_deleted ON public.chamados(deleted_at) WHERE deleted_at IS NULL;
COMMENT ON TABLE public.chamados IS 'Chamados/tickets abertos por moradores';
-- ============================================
-- TABELA: chamados_mensagens
-- ============================================
CREATE TABLE public.chamados_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  
  mensagem TEXT NOT NULL,
  anexos JSONB DEFAULT '[]'::JSONB,
  
  -- Se é resposta interna (visível só para síndicos)
  interno BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_mensagens_chamado ON public.chamados_mensagens(chamado_id);
CREATE INDEX idx_mensagens_autor ON public.chamados_mensagens(autor_id);
CREATE INDEX idx_mensagens_created ON public.chamados_mensagens(created_at);
COMMENT ON TABLE public.chamados_mensagens IS 'Mensagens/conversação em chamados';
-- ============================================
-- TABELA: faq
-- ============================================
CREATE TABLE public.faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  
  -- Conteúdo
  pergunta VARCHAR(500) NOT NULL,
  resposta TEXT NOT NULL,
  categoria VARCHAR(100) DEFAULT 'geral',
  
  -- Ordenação
  ordem INTEGER NOT NULL DEFAULT 0,
  
  -- Estado
  ativo BOOLEAN NOT NULL DEFAULT true,
  destaque BOOLEAN NOT NULL DEFAULT false,
  
  -- Estatísticas
  visualizacoes INTEGER NOT NULL DEFAULT 0,
  votos_util INTEGER NOT NULL DEFAULT 0,
  votos_inutil INTEGER NOT NULL DEFAULT 0,
  
  -- Metadados
  criado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_faq_condominio ON public.faq(condominio_id);
CREATE INDEX idx_faq_categoria ON public.faq(categoria);
CREATE INDEX idx_faq_ordem ON public.faq(ordem);
CREATE INDEX idx_faq_ativo ON public.faq(ativo) WHERE ativo = true;
CREATE INDEX idx_faq_destaque ON public.faq(destaque) WHERE destaque = true;
COMMENT ON TABLE public.faq IS 'Perguntas frequentes do condomínio';
-- ============================================
-- TABELA: faq_votos
-- ============================================
CREATE TABLE public.faq_votos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faq_id UUID NOT NULL REFERENCES public.faq(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  util BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(faq_id, usuario_id)
);
CREATE INDEX idx_faq_votos_faq ON public.faq_votos(faq_id);
-- ============================================
-- TRIGGERS: updated_at
-- ============================================
CREATE TRIGGER tr_ocorrencias_updated
  BEFORE UPDATE ON public.ocorrencias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_chamados_updated
  BEFORE UPDATE ON public.chamados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_faq_updated
  BEFORE UPDATE ON public.faq
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
-- ============================================
-- TRIGGER: Histórico de ocorrências
-- ============================================
CREATE OR REPLACE FUNCTION public.log_ocorrencia_status()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.ocorrencias_historico (
      ocorrencia_id,
      usuario_id,
      status_anterior,
      status_novo
    ) VALUES (
      NEW.id,
      (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()),
      OLD.status,
      NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER tr_ocorrencia_status_change
  AFTER UPDATE ON public.ocorrencias
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.log_ocorrencia_status();
-- ============================================
-- TRIGGER: Atualizar contador de mensagens no chamado
-- ============================================
CREATE OR REPLACE FUNCTION public.update_chamado_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chamados
  SET 
    updated_at = NOW(),
    status = CASE 
      WHEN status = 'aguardando_resposta' AND NEW.autor_id = solicitante_id THEN 'em_atendimento'
      WHEN status = 'novo' THEN 'em_atendimento'
      ELSE status
    END
  WHERE id = NEW.chamado_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER tr_chamado_new_message
  AFTER INSERT ON public.chamados_mensagens
  FOR EACH ROW EXECUTE FUNCTION public.update_chamado_on_message();
-- ============================================
-- FUNCTION: Marcar comunicado como lido
-- ============================================
CREATE OR REPLACE FUNCTION public.mark_comunicado_read(p_comunicado_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_usuario_id UUID;
BEGIN
  SELECT id INTO v_usuario_id
  FROM public.usuarios
  WHERE auth_id = auth.uid();
  
  IF v_usuario_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  INSERT INTO public.comunicados_leitura (comunicado_id, usuario_id)
  VALUES (p_comunicado_id, v_usuario_id)
  ON CONFLICT (comunicado_id, usuario_id) DO NOTHING;
  
  -- Incrementar visualizações
  UPDATE public.comunicados
  SET visualizacoes = visualizacoes + 1
  WHERE id = p_comunicado_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- FUNCTION: Votar utilidade do FAQ
-- ============================================
CREATE OR REPLACE FUNCTION public.vote_faq_useful(p_faq_id UUID, p_util BOOLEAN)
RETURNS BOOLEAN AS $$
DECLARE
  v_usuario_id UUID;
  v_voto_anterior BOOLEAN;
BEGIN
  SELECT id INTO v_usuario_id
  FROM public.usuarios
  WHERE auth_id = auth.uid();
  
  IF v_usuario_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar voto anterior
  SELECT util INTO v_voto_anterior
  FROM public.faq_votos
  WHERE faq_id = p_faq_id AND usuario_id = v_usuario_id;
  
  IF v_voto_anterior IS NOT NULL THEN
    -- Já votou, atualizar
    IF v_voto_anterior = p_util THEN
      -- Mesmo voto, remover
      DELETE FROM public.faq_votos WHERE faq_id = p_faq_id AND usuario_id = v_usuario_id;
      
      UPDATE public.faq
      SET 
        votos_util = votos_util - CASE WHEN p_util THEN 1 ELSE 0 END,
        votos_inutil = votos_inutil - CASE WHEN NOT p_util THEN 1 ELSE 0 END
      WHERE id = p_faq_id;
    ELSE
      -- Voto diferente, trocar
      UPDATE public.faq_votos SET util = p_util WHERE faq_id = p_faq_id AND usuario_id = v_usuario_id;
      
      UPDATE public.faq
      SET 
        votos_util = votos_util + CASE WHEN p_util THEN 1 ELSE -1 END,
        votos_inutil = votos_inutil + CASE WHEN NOT p_util THEN 1 ELSE -1 END
      WHERE id = p_faq_id;
    END IF;
  ELSE
    -- Novo voto
    INSERT INTO public.faq_votos (faq_id, usuario_id, util)
    VALUES (p_faq_id, v_usuario_id, p_util);
    
    UPDATE public.faq
    SET 
      votos_util = votos_util + CASE WHEN p_util THEN 1 ELSE 0 END,
      votos_inutil = votos_inutil + CASE WHEN NOT p_util THEN 1 ELSE 0 END
    WHERE id = p_faq_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- TRIGGERS: Auditoria
-- ============================================
CREATE TRIGGER tr_audit_ocorrencias
  AFTER INSERT OR UPDATE OR DELETE ON public.ocorrencias
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER tr_audit_chamados
  AFTER INSERT OR UPDATE OR DELETE ON public.chamados
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER tr_audit_faq
  AFTER INSERT OR UPDATE OR DELETE ON public.faq
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();
