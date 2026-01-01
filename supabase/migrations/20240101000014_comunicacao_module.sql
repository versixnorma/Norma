-- ============================================================
-- VERSIX NORMA - SPRINT 7: COMUNICAÇÃO MULTICANAL
-- Migration 014: Tabelas e ENUMs do Módulo de Comunicação
-- ============================================================
-- Notificações em todos os canais (Push, Email, WhatsApp, SMS, Voz)
-- Fila unificada com prioridades e cascata
-- Rastreabilidade completa de entregas
-- ============================================================

-- ============================================
-- ENUMS
-- ============================================

-- Canais de comunicação
CREATE TYPE canal_notificacao AS ENUM (
  'push',      -- Firebase FCM
  'email',     -- Resend
  'whatsapp',  -- Twilio/360dialog
  'sms',       -- Zenvia
  'voz',       -- Twilio TTS
  'in_app',    -- Notificação no sistema
  'mural'      -- PDF para impressão
);
-- Prioridade do comunicado
CREATE TYPE prioridade_comunicado AS ENUM (
  'baixa',     -- Informativo geral
  'normal',    -- Comunicado padrão
  'alta',      -- Urgente (vencimento, manutenção)
  'critica'    -- Emergência (incêndio, gás, segurança)
);
-- Status de entrega
CREATE TYPE status_entrega AS ENUM (
  'pendente',    -- Aguardando envio
  'agendado',    -- Agendado para envio futuro
  'enviando',    -- Em processo de envio
  'enviado',     -- Enviado ao provider
  'entregue',    -- Provider confirmou entrega
  'lido',        -- Usuário confirmou leitura
  'falhou',      -- Erro no envio
  'cancelado'    -- Cancelado antes do envio
);
-- Tipo de notificação
CREATE TYPE tipo_notificacao AS ENUM (
  'comunicado',       -- Comunicado geral
  'aviso',            -- Aviso importante
  'alerta',           -- Alerta de sistema
  'emergencia',       -- Emergência crítica
  'lembrete',         -- Lembrete automático
  'cobranca',         -- Cobrança/boleto
  'assembleia',       -- Convocação/lembrete assembleia
  'ocorrencia',       -- Atualização de ocorrência
  'chamado',          -- Atualização de chamado
  'sistema'           -- Notificação do sistema
);
-- ============================================
-- TABELA: notificacoes_config
-- Configuração global de notificações por condomínio
-- ============================================
CREATE TABLE public.notificacoes_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  
  -- Canais habilitados
  push_habilitado BOOLEAN NOT NULL DEFAULT true,
  email_habilitado BOOLEAN NOT NULL DEFAULT true,
  in_app_habilitado BOOLEAN NOT NULL DEFAULT true,
  whatsapp_habilitado BOOLEAN NOT NULL DEFAULT false, -- Requer configuração
  sms_habilitado BOOLEAN NOT NULL DEFAULT false,      -- Requer créditos
  voz_habilitado BOOLEAN NOT NULL DEFAULT false,      -- Requer créditos
  mural_habilitado BOOLEAN NOT NULL DEFAULT true,
  
  -- Configurações de cascata (minutos)
  cascata_habilitada BOOLEAN NOT NULL DEFAULT true,
  tempo_push_para_email INTEGER NOT NULL DEFAULT 60,        -- 1 hora
  tempo_email_para_whatsapp INTEGER NOT NULL DEFAULT 1440,  -- 24 horas
  tempo_whatsapp_para_sms INTEGER NOT NULL DEFAULT 2880,    -- 48 horas
  
  -- Horários permitidos (respeitar sono)
  horario_inicio TIME NOT NULL DEFAULT '07:00',
  horario_fim TIME NOT NULL DEFAULT '22:00',
  respeitar_horario BOOLEAN NOT NULL DEFAULT true,
  emergencia_ignora_horario BOOLEAN NOT NULL DEFAULT true,
  
  -- Configurações WhatsApp Business
  whatsapp_phone_id VARCHAR(50),
  whatsapp_business_id VARCHAR(50),
  whatsapp_token_encrypted TEXT,
  
  -- Configurações Email
  email_remetente VARCHAR(255) DEFAULT 'noreply@versixnorma.com.br',
  email_nome_remetente VARCHAR(255),
  
  -- Créditos (para SMS/Voz pagos)
  creditos_sms INTEGER NOT NULL DEFAULT 0,
  creditos_voz_minutos INTEGER NOT NULL DEFAULT 0,
  creditos_whatsapp INTEGER NOT NULL DEFAULT 0,
  
  -- Limites mensais (0 = ilimitado)
  limite_email_mensal INTEGER NOT NULL DEFAULT 0,
  limite_push_mensal INTEGER NOT NULL DEFAULT 0,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(condominio_id)
);
-- Comentários
COMMENT ON TABLE public.notificacoes_config IS 'Configuração de canais e limites por condomínio';
COMMENT ON COLUMN public.notificacoes_config.cascata_habilitada IS 'Se true, escala automaticamente para próximo canal se não houver leitura';
-- ============================================
-- TABELA: usuarios_canais_preferencias
-- Preferências de canal por usuário (opt-in/out)
-- ============================================
CREATE TABLE public.usuarios_canais_preferencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  
  -- Opt-in por canal
  push_habilitado BOOLEAN NOT NULL DEFAULT true,
  email_habilitado BOOLEAN NOT NULL DEFAULT true,
  in_app_habilitado BOOLEAN NOT NULL DEFAULT true,
  whatsapp_habilitado BOOLEAN NOT NULL DEFAULT true,
  sms_habilitado BOOLEAN NOT NULL DEFAULT true,
  voz_habilitado BOOLEAN NOT NULL DEFAULT true,
  
  -- Opt-in por tipo de notificação
  receber_comunicados BOOLEAN NOT NULL DEFAULT true,
  receber_avisos BOOLEAN NOT NULL DEFAULT true,
  receber_alertas BOOLEAN NOT NULL DEFAULT true,
  receber_emergencias BOOLEAN NOT NULL DEFAULT true, -- Não pode desabilitar emergência
  receber_lembretes BOOLEAN NOT NULL DEFAULT true,
  receber_cobrancas BOOLEAN NOT NULL DEFAULT true,
  receber_assembleias BOOLEAN NOT NULL DEFAULT true,
  receber_ocorrencias BOOLEAN NOT NULL DEFAULT true,
  receber_chamados BOOLEAN NOT NULL DEFAULT true,
  
  -- Horário preferido (se diferente do padrão)
  horario_inicio_preferido TIME,
  horario_fim_preferido TIME,
  
  -- Dispositivos para push
  push_tokens JSONB DEFAULT '[]'::JSONB, -- [{token, device_type, device_name, last_used}]
  
  -- Contatos
  whatsapp_numero VARCHAR(20),
  whatsapp_verificado BOOLEAN NOT NULL DEFAULT false,
  sms_numero VARCHAR(20),
  voz_numero VARCHAR(20),
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(usuario_id)
);
-- Índices
CREATE INDEX idx_canais_pref_push_tokens ON public.usuarios_canais_preferencias USING GIN (push_tokens);
-- Comentários
COMMENT ON TABLE public.usuarios_canais_preferencias IS 'Preferências individuais de canais de notificação';
-- ============================================
-- TABELA: templates_notificacao
-- Templates de mensagens por tipo e canal
-- ============================================
CREATE TABLE public.templates_notificacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES public.condominios(id) ON DELETE CASCADE, -- NULL = template global
  
  -- Identificação
  codigo VARCHAR(100) NOT NULL, -- 'comunicado_novo', 'boleto_vencendo', etc
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  
  -- Tipo e canal
  tipo public.tipo_notificacao NOT NULL,
  canal public.canal_notificacao NOT NULL,
  
  -- Conteúdo
  assunto VARCHAR(255), -- Para email
  corpo TEXT NOT NULL,  -- Suporta variáveis {{nome}}, {{unidade}}, etc
  corpo_html TEXT,      -- Para email HTML
  
  -- Para WhatsApp (templates pré-aprovados)
  whatsapp_template_id VARCHAR(100),
  whatsapp_namespace VARCHAR(100),
  
  -- Variáveis disponíveis
  variaveis_disponiveis JSONB DEFAULT '[]'::JSONB, -- ['nome', 'unidade', 'valor', ...]
  
  -- Status
  ativo BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Template único por tipo+canal+condomínio
  UNIQUE(condominio_id, codigo, canal)
);
-- Índices
CREATE INDEX idx_templates_tipo_canal ON public.templates_notificacao(tipo, canal);
CREATE INDEX idx_templates_codigo ON public.templates_notificacao(codigo);
-- Comentários
COMMENT ON TABLE public.templates_notificacao IS 'Templates de mensagens para cada tipo e canal';
-- ============================================
-- TABELA: notificacoes
-- Registro central de cada notificação
-- ============================================
CREATE TABLE public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  
  -- Tipo e prioridade
  tipo public.tipo_notificacao NOT NULL,
  prioridade public.prioridade_comunicado NOT NULL DEFAULT 'normal',
  
  -- Conteúdo
  titulo VARCHAR(255) NOT NULL,
  corpo TEXT NOT NULL,
  corpo_resumo VARCHAR(200), -- Para push notification
  corpo_html TEXT,           -- Para email
  
  -- Anexos
  anexos JSONB DEFAULT '[]'::JSONB, -- [{nome, url, tipo_mime, tamanho}]
  
  -- Destinatários
  destinatarios_tipo VARCHAR(50) NOT NULL DEFAULT 'todos', -- 'todos', 'bloco', 'unidades', 'roles', 'lista'
  destinatarios_filtro JSONB, -- {bloco: 'A'}, {unidades: ['101', '102']}, {roles: ['sindico']}
  total_destinatarios INTEGER DEFAULT 0,
  
  -- Referência a entidade
  referencia_tipo VARCHAR(50), -- 'comunicado', 'assembleia', 'ocorrencia', 'chamado', 'boleto'
  referencia_id UUID,
  
  -- Deep link
  acao_url VARCHAR(500),      -- URL para abrir ao clicar
  acao_texto VARCHAR(100),    -- Texto do botão de ação
  
  -- Agendamento
  agendada_para TIMESTAMPTZ,
  
  -- Mural físico
  gerar_mural BOOLEAN NOT NULL DEFAULT false,
  mural_pdf_path VARCHAR(500),
  mural_qr_code VARCHAR(500),
  
  -- Controle
  status public.status_entrega NOT NULL DEFAULT 'pendente',
  enviada_em TIMESTAMPTZ,
  cancelada_em TIMESTAMPTZ,
  criado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  
  -- Estatísticas (cache para performance)
  stats_enviados INTEGER DEFAULT 0,
  stats_entregues INTEGER DEFAULT 0,
  stats_lidos INTEGER DEFAULT 0,
  stats_falhas INTEGER DEFAULT 0,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Índices
CREATE INDEX idx_notificacoes_condominio ON public.notificacoes(condominio_id);
CREATE INDEX idx_notificacoes_tipo ON public.notificacoes(tipo);
CREATE INDEX idx_notificacoes_status ON public.notificacoes(status);
CREATE INDEX idx_notificacoes_prioridade ON public.notificacoes(prioridade);
CREATE INDEX idx_notificacoes_agendada ON public.notificacoes(agendada_para) WHERE agendada_para IS NOT NULL;
CREATE INDEX idx_notificacoes_referencia ON public.notificacoes(referencia_tipo, referencia_id) WHERE referencia_id IS NOT NULL;
CREATE INDEX idx_notificacoes_created ON public.notificacoes(created_at DESC);
-- Comentários
COMMENT ON TABLE public.notificacoes IS 'Registro central de todas as notificações enviadas';
-- ============================================
-- TABELA: notificacoes_entregas
-- Entrega individual por usuário/canal
-- ============================================
CREATE TABLE public.notificacoes_entregas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notificacao_id UUID NOT NULL REFERENCES public.notificacoes(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  
  -- Canal utilizado
  canal public.canal_notificacao NOT NULL,
  
  -- Status
  status public.status_entrega NOT NULL DEFAULT 'pendente',
  
  -- Tentativas
  tentativas INTEGER NOT NULL DEFAULT 0,
  max_tentativas INTEGER NOT NULL DEFAULT 3,
  proxima_tentativa TIMESTAMPTZ,
  
  -- Cascata
  canal_origem public.canal_notificacao,  -- Canal que gerou essa entrega via cascata
  cascata_nivel INTEGER NOT NULL DEFAULT 0, -- 0 = original, 1 = primeira cascata, etc
  
  -- Provider response
  provider_id VARCHAR(255),        -- ID da mensagem no provider
  provider_response JSONB,         -- Resposta completa do provider
  erro_codigo VARCHAR(50),
  erro_mensagem TEXT,
  
  -- Timestamps
  agendada_para TIMESTAMPTZ,
  enviada_em TIMESTAMPTZ,
  entregue_em TIMESTAMPTZ,
  lida_em TIMESTAMPTZ,
  falhou_em TIMESTAMPTZ,
  
  -- Custo (para canais pagos)
  custo_centavos INTEGER DEFAULT 0,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Uma entrega por notificação/usuário/canal
  UNIQUE(notificacao_id, usuario_id, canal)
);
-- Índices
CREATE INDEX idx_entregas_notificacao ON public.notificacoes_entregas(notificacao_id);
CREATE INDEX idx_entregas_usuario ON public.notificacoes_entregas(usuario_id);
CREATE INDEX idx_entregas_status ON public.notificacoes_entregas(status);
CREATE INDEX idx_entregas_canal ON public.notificacoes_entregas(canal);
CREATE INDEX idx_entregas_pendentes ON public.notificacoes_entregas(status, proxima_tentativa) 
  WHERE status IN ('pendente', 'agendado');
CREATE INDEX idx_entregas_provider ON public.notificacoes_entregas(provider_id) WHERE provider_id IS NOT NULL;
-- Comentários
COMMENT ON TABLE public.notificacoes_entregas IS 'Entrega individual de notificação por usuário e canal';
-- ============================================
-- TABELA: notificacoes_leituras
-- Confirmações de leitura (quando usuário abre)
-- ============================================
CREATE TABLE public.notificacoes_leituras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notificacao_id UUID NOT NULL REFERENCES public.notificacoes(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  
  -- Canal onde leu
  canal public.canal_notificacao NOT NULL,
  
  -- Timestamp
  lida_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Auditoria
  ip_address INET,
  user_agent TEXT,
  
  -- Uma leitura por usuário (primeira leitura conta)
  UNIQUE(notificacao_id, usuario_id)
);
-- Índices
CREATE INDEX idx_leituras_notificacao ON public.notificacoes_leituras(notificacao_id);
CREATE INDEX idx_leituras_usuario ON public.notificacoes_leituras(usuario_id);
-- Comentários
COMMENT ON TABLE public.notificacoes_leituras IS 'Registro de confirmação de leitura';
-- ============================================
-- TABELA: cotas_comunicacao
-- Controle de uso e custos por mês
-- ============================================
CREATE TABLE public.cotas_comunicacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  
  -- Período
  mes_referencia DATE NOT NULL, -- Primeiro dia do mês
  
  -- Uso por canal
  uso_push INTEGER NOT NULL DEFAULT 0,
  uso_email INTEGER NOT NULL DEFAULT 0,
  uso_in_app INTEGER NOT NULL DEFAULT 0,
  uso_whatsapp INTEGER NOT NULL DEFAULT 0,
  uso_sms INTEGER NOT NULL DEFAULT 0,
  uso_voz_minutos INTEGER NOT NULL DEFAULT 0,
  
  -- Custos por canal (centavos)
  custo_whatsapp_centavos INTEGER NOT NULL DEFAULT 0,
  custo_sms_centavos INTEGER NOT NULL DEFAULT 0,
  custo_voz_centavos INTEGER NOT NULL DEFAULT 0,
  custo_total_centavos INTEGER NOT NULL DEFAULT 0,
  
  -- Alertas disparados
  alerta_50_disparado BOOLEAN NOT NULL DEFAULT false,
  alerta_80_disparado BOOLEAN NOT NULL DEFAULT false,
  alerta_100_disparado BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(condominio_id, mes_referencia)
);
-- Índices
CREATE INDEX idx_cotas_mes ON public.cotas_comunicacao(mes_referencia);
-- Comentários
COMMENT ON TABLE public.cotas_comunicacao IS 'Controle de uso e custos mensais por canal';
-- ============================================
-- TABELA: webhooks_notificacao
-- Configuração de webhooks para eventos
-- ============================================
CREATE TABLE public.webhooks_notificacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES public.condominios(id) ON DELETE CASCADE, -- NULL = global
  
  -- Configuração
  nome VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  secret VARCHAR(255), -- Para assinatura HMAC
  
  -- Eventos
  eventos JSONB NOT NULL DEFAULT '["entrega", "leitura", "falha"]'::JSONB,
  
  -- Status
  ativo BOOLEAN NOT NULL DEFAULT true,
  
  -- Retry config
  max_tentativas INTEGER NOT NULL DEFAULT 3,
  timeout_segundos INTEGER NOT NULL DEFAULT 30,
  
  -- Estatísticas
  total_enviados INTEGER DEFAULT 0,
  total_sucesso INTEGER DEFAULT 0,
  total_falha INTEGER DEFAULT 0,
  ultimo_erro TEXT,
  ultimo_sucesso_em TIMESTAMPTZ,
  ultimo_erro_em TIMESTAMPTZ,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Comentários
COMMENT ON TABLE public.webhooks_notificacao IS 'Webhooks para eventos de notificação';
-- ============================================
-- TABELA: notificacoes_fila
-- Fila de processamento (para workers)
-- ============================================
CREATE TABLE public.notificacoes_fila (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id UUID NOT NULL REFERENCES public.notificacoes_entregas(id) ON DELETE CASCADE,
  
  -- Prioridade (maior = mais urgente)
  prioridade INTEGER NOT NULL DEFAULT 0,
  
  -- Processamento
  processando BOOLEAN NOT NULL DEFAULT false,
  processando_por VARCHAR(100), -- ID do worker
  processando_desde TIMESTAMPTZ,
  
  -- Agendamento
  processar_apos TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Só uma entrada por entrega
  UNIQUE(entrega_id)
);
-- Índices
CREATE INDEX idx_fila_processar ON public.notificacoes_fila(processar_apos, prioridade DESC) 
  WHERE processando = false;
CREATE INDEX idx_fila_processando ON public.notificacoes_fila(processando_por, processando_desde) 
  WHERE processando = true;
-- Comentários
COMMENT ON TABLE public.notificacoes_fila IS 'Fila de processamento para workers de notificação';
-- ============================================
-- TABELA: emergencias_log
-- Log de emergências (auditoria crítica)
-- ============================================
CREATE TABLE public.emergencias_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  notificacao_id UUID REFERENCES public.notificacoes(id) ON DELETE SET NULL,
  
  -- Tipo de emergência
  tipo VARCHAR(100) NOT NULL, -- 'incendio', 'gas', 'invasao', 'alagamento', etc
  
  -- Quem disparou
  disparado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  disparado_por_nome VARCHAR(255), -- Snapshot
  
  -- Estatísticas
  total_destinatarios INTEGER,
  total_push_enviados INTEGER,
  total_sms_enviados INTEGER,
  total_voz_enviados INTEGER,
  
  -- Tempos
  tempo_primeiro_envio_ms INTEGER, -- Latência até primeiro envio
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Índices
CREATE INDEX idx_emergencias_condominio ON public.emergencias_log(condominio_id);
CREATE INDEX idx_emergencias_created ON public.emergencias_log(created_at DESC);
-- Comentários
COMMENT ON TABLE public.emergencias_log IS 'Log de auditoria de emergências disparadas';
-- ============================================
-- TRIGGERS: updated_at automático
-- ============================================
CREATE TRIGGER set_updated_at_notificacoes_config
  BEFORE UPDATE ON public.notificacoes_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_usuarios_canais
  BEFORE UPDATE ON public.usuarios_canais_preferencias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_templates
  BEFORE UPDATE ON public.templates_notificacao
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_notificacoes
  BEFORE UPDATE ON public.notificacoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_entregas
  BEFORE UPDATE ON public.notificacoes_entregas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_cotas
  BEFORE UPDATE ON public.cotas_comunicacao
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_webhooks
  BEFORE UPDATE ON public.webhooks_notificacao
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- ============================================
-- TRIGGER: Criar preferências ao criar usuário
-- ============================================
CREATE OR REPLACE FUNCTION create_usuario_canais_preferencias()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.usuarios_canais_preferencias (usuario_id)
  VALUES (NEW.id)
  ON CONFLICT (usuario_id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trigger_create_canais_preferencias
  AFTER INSERT ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION create_usuario_canais_preferencias();
-- ============================================
-- TRIGGER: Atualizar estatísticas da notificação
-- ============================================
CREATE OR REPLACE FUNCTION update_notificacao_stats()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  -- Atualizar stats na notificação
  UPDATE public.notificacoes
  SET 
    stats_enviados = (
      SELECT COUNT(*) FROM public.notificacoes_entregas 
      WHERE notificacao_id = COALESCE(NEW.notificacao_id, OLD.notificacao_id) 
        AND status IN ('enviado', 'entregue', 'lido')
    ),
    stats_entregues = (
      SELECT COUNT(*) FROM public.notificacoes_entregas 
      WHERE notificacao_id = COALESCE(NEW.notificacao_id, OLD.notificacao_id) 
        AND status IN ('entregue', 'lido')
    ),
    stats_lidos = (
      SELECT COUNT(*) FROM public.notificacoes_entregas 
      WHERE notificacao_id = COALESCE(NEW.notificacao_id, OLD.notificacao_id) 
        AND status = 'lido'
    ),
    stats_falhas = (
      SELECT COUNT(*) FROM public.notificacoes_entregas 
      WHERE notificacao_id = COALESCE(NEW.notificacao_id, OLD.notificacao_id) 
        AND status = 'falhou'
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.notificacao_id, OLD.notificacao_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trigger_update_notificacao_stats
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.notificacoes_entregas
  FOR EACH ROW EXECUTE FUNCTION update_notificacao_stats();
-- ============================================
-- COMENTÁRIOS FINAIS
-- ============================================
COMMENT ON SCHEMA public IS 'Versix Norma - Sprint 7: Comunicação Multicanal adicionado';
