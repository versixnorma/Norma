-- ============================================================
-- VERSIX NORMA - SPRINT 6: ASSEMBLEIAS DIGITAIS
-- Migration 012: Tabelas e ENUMs do Módulo de Assembleias
-- ============================================================
-- Democracia digital com validade jurídica
-- Assembleias híbridas (presencial + online)
-- Votação auditável com fração ideal
-- ============================================================

-- ============================================
-- ENUMS
-- ============================================

-- Tipo de assembleia
CREATE TYPE assembleia_tipo AS ENUM (
  'AGO',        -- Assembleia Geral Ordinária (anual obrigatória)
  'AGE',        -- Assembleia Geral Extraordinária
  'permanente'  -- Votação assíncrona (sem reunião presencial)
);
-- Status da assembleia
CREATE TYPE assembleia_status AS ENUM (
  'rascunho',      -- Síndico preparando
  'convocada',     -- Convocação enviada, aguardando data
  'em_andamento',  -- Assembleia acontecendo (check-in aberto)
  'votacao',       -- Fase de votação aberta
  'encerrada',     -- Votação fechada, gerando ata
  'arquivada'      -- Ata assinada, registro imutável
);
-- Tipo de votação na pauta
CREATE TYPE pauta_tipo_votacao AS ENUM (
  'aprovacao',       -- Sim/Não/Abstenção
  'escolha_unica',   -- Múltiplas opções, escolhe 1
  'escolha_multipla',-- Múltiplas opções, escolhe N
  'eleicao',         -- Eleição de cargos
  'informativo'      -- Sem votação, apenas informação
);
-- Status da pauta
CREATE TYPE pauta_status AS ENUM (
  'pendente',    -- Aguardando votação
  'em_votacao',  -- Votação aberta
  'encerrada',   -- Votação fechada
  'aprovada',    -- Resultado: aprovado
  'rejeitada',   -- Resultado: rejeitado
  'sem_quorum'   -- Não atingiu quórum
);
-- Tipo de presença
CREATE TYPE presenca_tipo AS ENUM (
  'presencial',      -- Check-in via QR Code no local
  'online',          -- Conectado via vídeo/web
  'procuracao',      -- Representado por procuração
  'voto_antecipado'  -- Votou antes da assembleia (assíncrono)
);
-- Tipo de voto
CREATE TYPE voto_tipo AS ENUM (
  'sim',
  'nao',
  'abstencao',
  'opcao'  -- Votou em uma opção específica (eleição/escolha)
);
-- Quórum especial (baseado no Código Civil)
CREATE TYPE quorum_especial AS ENUM (
  'maioria_simples',      -- > 50% dos presentes
  'maioria_absoluta',     -- > 50% de todas as frações
  'dois_tercos',          -- ≥ 2/3 das frações (obras, convenção)
  'unanimidade'           -- 100% das frações (mudança destinação)
);
-- Status da procuração
CREATE TYPE procuracao_status AS ENUM (
  'pendente',    -- Aguardando aceite do representante
  'aceita',      -- Representante aceitou
  'recusada',    -- Representante recusou
  'revogada',    -- Outorgante cancelou
  'utilizada'    -- Já foi usada em assembleia
);
-- ============================================
-- TABELA: assembleias
-- Registro principal de cada assembleia
-- ============================================
CREATE TABLE public.assembleias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  
  -- Identificação
  tipo public.assembleia_tipo NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  numero_sequencial INTEGER, -- AGO 2024/1, AGE 2024/3
  ano_referencia INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  
  -- Datas
  data_primeira_convocacao TIMESTAMPTZ,
  data_segunda_convocacao TIMESTAMPTZ, -- 30 min após, se não houver quórum
  data_inicio TIMESTAMPTZ,
  data_fim TIMESTAMPTZ,
  
  -- Configurações de votação
  permite_voto_antecipado BOOLEAN NOT NULL DEFAULT false,
  data_limite_voto_antecipado TIMESTAMPTZ,
  permite_procuracao BOOLEAN NOT NULL DEFAULT true,
  max_procuracoes_por_pessoa INTEGER NOT NULL DEFAULT 2, -- Lei 4.591/64
  
  -- Quórum
  quorum_minimo_primeira DECIMAL(5,2) NOT NULL DEFAULT 50.00, -- % da fração ideal
  quorum_minimo_segunda DECIMAL(5,2) NOT NULL DEFAULT 0, -- Qualquer número
  quorum_atingido DECIMAL(5,2) DEFAULT 0, -- Calculado em tempo real
  
  -- Local (para híbrida)
  local_presencial VARCHAR(255),
  endereco_presencial TEXT,
  link_video VARCHAR(500), -- Jitsi, Google Meet, Zoom
  codigo_acesso_video VARCHAR(50),
  
  -- QR Code para check-in
  qr_token VARCHAR(64) UNIQUE, -- Token único para validar check-in
  
  -- Status
  status public.assembleia_status NOT NULL DEFAULT 'rascunho',
  
  -- Ata
  ata_texto TEXT,
  ata_pdf_path VARCHAR(500),
  ata_hash VARCHAR(64), -- SHA256 para integridade
  
  -- Observações
  observacoes_internas TEXT, -- Notas do síndico (não vai para ata)
  
  -- Controle
  criado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  convocada_em TIMESTAMPTZ,
  iniciada_em TIMESTAMPTZ,
  encerrada_em TIMESTAMPTZ,
  arquivada_em TIMESTAMPTZ,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Índices
CREATE INDEX idx_assembleias_condominio ON public.assembleias(condominio_id);
CREATE INDEX idx_assembleias_status ON public.assembleias(status);
CREATE INDEX idx_assembleias_data ON public.assembleias(data_primeira_convocacao DESC);
CREATE INDEX idx_assembleias_tipo_ano ON public.assembleias(condominio_id, tipo, ano_referencia);
CREATE INDEX idx_assembleias_qr ON public.assembleias(qr_token) WHERE qr_token IS NOT NULL;
-- Comentários
COMMENT ON TABLE public.assembleias IS 'Assembleias do condomínio (AGO, AGE, permanente)';
COMMENT ON COLUMN public.assembleias.quorum_atingido IS 'Percentual de fração ideal presente, calculado em tempo real';
COMMENT ON COLUMN public.assembleias.qr_token IS 'Token único para validar check-in presencial via QR Code';
-- ============================================
-- TABELA: assembleia_pautas
-- Itens da pauta com configuração de votação
-- ============================================
CREATE TABLE public.assembleia_pautas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembleia_id UUID NOT NULL REFERENCES public.assembleias(id) ON DELETE CASCADE,
  
  -- Conteúdo
  ordem INTEGER NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  
  -- Tipo de votação
  tipo_votacao public.pauta_tipo_votacao NOT NULL DEFAULT 'aprovacao',
  
  -- Configuração
  voto_secreto BOOLEAN NOT NULL DEFAULT false,
  quorum_especial public.quorum_especial DEFAULT 'maioria_simples',
  permite_abstencao BOOLEAN NOT NULL DEFAULT true,
  
  -- Para eleição
  cargo VARCHAR(100), -- 'sindico', 'subsindico', 'conselho_fiscal'
  max_eleitos INTEGER DEFAULT 1,
  
  -- Bloqueios
  bloqueia_inadimplentes BOOLEAN NOT NULL DEFAULT true,
  
  -- Status e resultado
  status public.pauta_status NOT NULL DEFAULT 'pendente',
  resultado JSONB, -- { aprovados: X, rejeitados: Y, abstencoes: Z, eleitos: [...], percentual: N }
  
  -- Timestamps
  votacao_iniciada_em TIMESTAMPTZ,
  votacao_encerrada_em TIMESTAMPTZ,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ordenação única
  UNIQUE(assembleia_id, ordem)
);
-- Índices
CREATE INDEX idx_pautas_assembleia ON public.assembleia_pautas(assembleia_id, ordem);
CREATE INDEX idx_pautas_status ON public.assembleia_pautas(status);
-- Comentários
COMMENT ON TABLE public.assembleia_pautas IS 'Itens da pauta de cada assembleia';
COMMENT ON COLUMN public.assembleia_pautas.quorum_especial IS 'Quórum exigido: maioria_simples (padrão), dois_tercos (obras), unanimidade (mudança destinação)';
-- ============================================
-- TABELA: assembleia_pauta_opcoes
-- Opções de voto para pautas de escolha/eleição
-- ============================================
CREATE TABLE public.assembleia_pauta_opcoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pauta_id UUID NOT NULL REFERENCES public.assembleia_pautas(id) ON DELETE CASCADE,
  
  -- Conteúdo
  ordem INTEGER NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  
  -- Para eleição de cargos
  candidato_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  candidato_nome VARCHAR(255), -- Snapshot do nome (caso usuário seja deletado)
  candidato_unidade VARCHAR(50), -- Snapshot da unidade
  
  -- Resultado (atualizado em tempo real ou ao encerrar)
  votos_count INTEGER NOT NULL DEFAULT 0,
  votos_fracao DECIMAL(10,6) NOT NULL DEFAULT 0, -- Soma das frações ideais
  
  -- Eleito?
  eleito BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ordenação única
  UNIQUE(pauta_id, ordem)
);
-- Índices
CREATE INDEX idx_opcoes_pauta ON public.assembleia_pauta_opcoes(pauta_id, ordem);
-- Comentários
COMMENT ON TABLE public.assembleia_pauta_opcoes IS 'Opções de voto para pautas de escolha múltipla ou eleição';
-- ============================================
-- TABELA: assembleia_presencas
-- Registro de presença (presencial ou online)
-- ============================================
CREATE TABLE public.assembleia_presencas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembleia_id UUID NOT NULL REFERENCES public.assembleias(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  unidade_id UUID NOT NULL REFERENCES public.unidades_habitacionais(id) ON DELETE CASCADE,
  
  -- Tipo de presença
  tipo public.presenca_tipo NOT NULL,
  
  -- Procuração (se aplicável)
  representante_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  procuracao_id UUID, -- Referência à tabela de procurações
  
  -- Fração ideal da unidade (snapshot no momento do check-in)
  fracao_ideal DECIMAL(10,6) NOT NULL,
  
  -- Controle de sessão
  check_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out_at TIMESTAMPTZ,
  
  -- Auditoria
  ip_address INET,
  user_agent TEXT,
  dispositivo VARCHAR(100), -- 'mobile', 'desktop', 'tablet'
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Uma presença por unidade por assembleia
  UNIQUE(assembleia_id, unidade_id)
);
-- Índices
CREATE INDEX idx_presencas_assembleia ON public.assembleia_presencas(assembleia_id);
CREATE INDEX idx_presencas_usuario ON public.assembleia_presencas(usuario_id);
CREATE INDEX idx_presencas_unidade ON public.assembleia_presencas(unidade_id);
-- Comentários
COMMENT ON TABLE public.assembleia_presencas IS 'Registro de presença em assembleias';
COMMENT ON COLUMN public.assembleia_presencas.fracao_ideal IS 'Snapshot da fração ideal no momento do check-in';
-- ============================================
-- TABELA: assembleia_votos
-- Registro de cada voto (auditável)
-- ============================================
CREATE TABLE public.assembleia_votos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pauta_id UUID NOT NULL REFERENCES public.assembleia_pautas(id) ON DELETE CASCADE,
  presenca_id UUID NOT NULL REFERENCES public.assembleia_presencas(id) ON DELETE CASCADE,
  
  -- Voto
  voto public.voto_tipo NOT NULL,
  opcao_id UUID REFERENCES public.assembleia_pauta_opcoes(id) ON DELETE SET NULL, -- Para escolha/eleição
  
  -- Peso do voto (fração ideal)
  fracao_ideal DECIMAL(10,6) NOT NULL,
  
  -- Identificação (NULL se voto secreto)
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  unidade_id UUID REFERENCES public.unidades_habitacionais(id) ON DELETE SET NULL,
  
  -- Hash para integridade e auditoria
  voto_hash VARCHAR(64) NOT NULL, -- SHA256
  voto_anterior_hash VARCHAR(64), -- Hash do voto anterior (blockchain simplificado)
  
  -- Controle
  votado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Um voto por presença por pauta
  UNIQUE(pauta_id, presenca_id)
);
-- Índices
CREATE INDEX idx_votos_pauta ON public.assembleia_votos(pauta_id);
CREATE INDEX idx_votos_presenca ON public.assembleia_votos(presenca_id);
CREATE INDEX idx_votos_opcao ON public.assembleia_votos(opcao_id) WHERE opcao_id IS NOT NULL;
-- Comentários
COMMENT ON TABLE public.assembleia_votos IS 'Registro de votos com auditoria e integridade';
COMMENT ON COLUMN public.assembleia_votos.voto_hash IS 'SHA256 do voto para verificação de integridade';
COMMENT ON COLUMN public.assembleia_votos.voto_anterior_hash IS 'Hash do voto anterior (cadeia de integridade)';
-- ============================================
-- TABELA: assembleia_procuracoes
-- Procurações digitais
-- ============================================
CREATE TABLE public.assembleia_procuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  
  -- Outorgante (quem dá a procuração)
  outorgante_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  outorgante_unidade_id UUID NOT NULL REFERENCES public.unidades_habitacionais(id) ON DELETE CASCADE,
  
  -- Outorgado (quem recebe a procuração)
  outorgado_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  
  -- Escopo
  assembleia_id UUID REFERENCES public.assembleias(id) ON DELETE CASCADE, -- NULL = válida para qualquer
  validade_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  validade_fim DATE, -- NULL = sem prazo
  
  -- Poderes
  pode_votar BOOLEAN NOT NULL DEFAULT true,
  pode_falar BOOLEAN NOT NULL DEFAULT false, -- Falar em nome do outorgante
  restricoes TEXT, -- Instruções específicas
  
  -- Status
  status public.procuracao_status NOT NULL DEFAULT 'pendente',
  
  -- Aceite
  aceite_em TIMESTAMPTZ,
  aceite_ip INET,
  
  -- Documento
  documento_path VARCHAR(500), -- PDF assinado
  documento_hash VARCHAR(64), -- SHA256
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Índices
CREATE INDEX idx_procuracoes_outorgante ON public.assembleia_procuracoes(outorgante_id);
CREATE INDEX idx_procuracoes_outorgado ON public.assembleia_procuracoes(outorgado_id);
CREATE INDEX idx_procuracoes_assembleia ON public.assembleia_procuracoes(assembleia_id) WHERE assembleia_id IS NOT NULL;
CREATE INDEX idx_procuracoes_status ON public.assembleia_procuracoes(status);
CREATE INDEX idx_procuracoes_validade ON public.assembleia_procuracoes(validade_inicio, validade_fim);
-- Comentários
COMMENT ON TABLE public.assembleia_procuracoes IS 'Procurações digitais para representação em assembleias';
-- ============================================
-- TABELA: assembleia_assinaturas
-- Assinaturas da ata
-- ============================================
CREATE TABLE public.assembleia_assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembleia_id UUID NOT NULL REFERENCES public.assembleias(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  
  -- Papel
  papel VARCHAR(50) NOT NULL, -- 'presidente', 'secretario', 'sindico', 'testemunha'
  
  -- Assinatura
  assinado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  
  -- Hash do documento no momento da assinatura
  documento_hash VARCHAR(64) NOT NULL,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Uma assinatura por papel por pessoa por assembleia
  UNIQUE(assembleia_id, usuario_id, papel)
);
-- Índices
CREATE INDEX idx_assinaturas_assembleia ON public.assembleia_assinaturas(assembleia_id);
-- Comentários
COMMENT ON TABLE public.assembleia_assinaturas IS 'Assinaturas digitais da ata de assembleia';
-- ============================================
-- TABELA: assembleia_logs
-- Log de ações (auditoria completa)
-- ============================================
CREATE TABLE public.assembleia_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembleia_id UUID NOT NULL REFERENCES public.assembleias(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  
  -- Ação
  acao VARCHAR(100) NOT NULL, -- 'presenca_registrada', 'voto_registrado', 'pauta_aberta', etc
  detalhes JSONB,
  
  -- Auditoria
  ip_address INET,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Índices
CREATE INDEX idx_logs_assembleia ON public.assembleia_logs(assembleia_id);
CREATE INDEX idx_logs_acao ON public.assembleia_logs(acao);
CREATE INDEX idx_logs_created ON public.assembleia_logs(created_at DESC);
-- Particionamento por data (performance)
-- Para produção, considerar particionar por mês/ano

-- Comentários
COMMENT ON TABLE public.assembleia_logs IS 'Log de auditoria de todas as ações em assembleias';
-- ============================================
-- TRIGGERS: updated_at automático
-- ============================================
CREATE TRIGGER set_updated_at_assembleias
  BEFORE UPDATE ON public.assembleias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_pautas
  BEFORE UPDATE ON public.assembleia_pautas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_procuracoes
  BEFORE UPDATE ON public.assembleia_procuracoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- ============================================
-- TRIGGER: Gerar número sequencial da assembleia
-- ============================================
CREATE OR REPLACE FUNCTION generate_assembleia_numero()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.numero_sequencial IS NULL THEN
    SELECT COALESCE(MAX(numero_sequencial), 0) + 1
    INTO NEW.numero_sequencial
    FROM public.assembleias
    WHERE condominio_id = NEW.condominio_id
      AND tipo = NEW.tipo
      AND ano_referencia = NEW.ano_referencia;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trigger_assembleia_numero
  BEFORE INSERT ON public.assembleias
  FOR EACH ROW EXECUTE FUNCTION generate_assembleia_numero();
-- ============================================
-- TRIGGER: Gerar QR Token único
-- ============================================
CREATE OR REPLACE FUNCTION generate_assembleia_qr_token()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.qr_token IS NULL AND NEW.status = 'convocada' THEN
    NEW.qr_token := encode(gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trigger_assembleia_qr_token
  BEFORE INSERT OR UPDATE ON public.assembleias
  FOR EACH ROW EXECUTE FUNCTION generate_assembleia_qr_token();
-- ============================================
-- TRIGGER: Log automático de mudanças de status
-- ============================================
CREATE OR REPLACE FUNCTION log_assembleia_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.assembleia_logs (assembleia_id, usuario_id, acao, detalhes)
    VALUES (
      NEW.id,
      auth.uid(),
      'status_alterado',
      jsonb_build_object(
        'status_anterior', OLD.status,
        'status_novo', NEW.status
      )
    );
    
    -- Atualizar timestamps específicos
    CASE NEW.status
      WHEN 'convocada' THEN NEW.convocada_em := NOW();
      WHEN 'em_andamento' THEN NEW.iniciada_em := NOW();
      WHEN 'encerrada' THEN NEW.encerrada_em := NOW();
      WHEN 'arquivada' THEN NEW.arquivada_em := NOW();
      ELSE NULL;
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$;
CREATE TRIGGER trigger_log_assembleia_status
  BEFORE UPDATE ON public.assembleias
  FOR EACH ROW EXECUTE FUNCTION log_assembleia_status_change();
-- ============================================
-- TRIGGER: Atualizar contagem de votos em opções
-- ============================================
CREATE OR REPLACE FUNCTION update_opcao_votos_count()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.opcao_id IS NOT NULL THEN
    UPDATE public.assembleia_pauta_opcoes
    SET 
      votos_count = votos_count + 1,
      votos_fracao = votos_fracao + NEW.fracao_ideal
    WHERE id = NEW.opcao_id;
  ELSIF TG_OP = 'DELETE' AND OLD.opcao_id IS NOT NULL THEN
    UPDATE public.assembleia_pauta_opcoes
    SET 
      votos_count = votos_count - 1,
      votos_fracao = votos_fracao - OLD.fracao_ideal
    WHERE id = OLD.opcao_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trigger_update_opcao_votos
  AFTER INSERT OR DELETE ON public.assembleia_votos
  FOR EACH ROW EXECUTE FUNCTION update_opcao_votos_count();
-- ============================================
-- TRIGGER: Atualizar quórum da assembleia
-- ============================================
CREATE OR REPLACE FUNCTION update_assembleia_quorum()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  v_total_fracao DECIMAL(10,6);
  v_quorum DECIMAL(5,2);
BEGIN
  -- Calcular soma das frações presentes
  SELECT COALESCE(SUM(fracao_ideal), 0)
  INTO v_total_fracao
  FROM public.assembleia_presencas
  WHERE assembleia_id = COALESCE(NEW.assembleia_id, OLD.assembleia_id);
  
  -- Converter para percentual (assumindo que soma total = 1.0 ou 100%)
  v_quorum := ROUND(v_total_fracao * 100, 2);
  
  -- Atualizar assembleia
  UPDATE public.assembleias
  SET quorum_atingido = v_quorum
  WHERE id = COALESCE(NEW.assembleia_id, OLD.assembleia_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trigger_update_quorum
  AFTER INSERT OR UPDATE OR DELETE ON public.assembleia_presencas
  FOR EACH ROW EXECUTE FUNCTION update_assembleia_quorum();
-- ============================================
-- COMENTÁRIOS FINAIS
-- ============================================
COMMENT ON SCHEMA public IS 'Versix Norma - Sprint 6: Assembleias Digitais adicionado';
