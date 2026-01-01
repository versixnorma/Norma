-- ============================================================
-- VERSIX NORMA - SPRINT 8: INTEGRAÇÕES
-- Migration 016: Tabelas e ENUMs do Módulo de Integrações
-- ============================================================
-- API REST pública com OpenAPI 3.1
-- API Keys com scopes granulares e rate limiting
-- Webhooks com retry e idempotência
-- Conectores nativos (portaria, contabilidade, calendário)
-- ============================================================

-- ============================================
-- ENUMS
-- ============================================

-- Tipo de integração
CREATE TYPE integracao_tipo AS ENUM (
  'api_entrada',     -- Externo consulta Versix (API REST)
  'webhook_saida',   -- Versix envia para externo
  'conector_nativo', -- Integração bidirecional (portaria, etc)
  'oauth_app'        -- App OAuth terceiro
);
-- Eventos de webhook
CREATE TYPE webhook_evento AS ENUM (
  -- Assembleias
  'assembleia.criada',
  'assembleia.convocada',
  'assembleia.iniciada',
  'assembleia.encerrada',
  'assembleia.voto_registrado',
  
  -- Financeiro
  'cobranca.gerada',
  'cobranca.vencendo',
  'pagamento.confirmado',
  'pagamento.atrasado',
  'lancamento.criado',
  'lancamento.atualizado',
  'prestacao.publicada',
  
  -- Comunicação
  'comunicado.publicado',
  'notificacao.lida',
  
  -- Ocorrências e Chamados
  'ocorrencia.criada',
  'ocorrencia.atualizada',
  'ocorrencia.resolvida',
  'chamado.criado',
  'chamado.atualizado',
  'chamado.fechado',
  
  -- Usuários
  'morador.cadastrado',
  'morador.aprovado',
  'morador.removido',
  'morador.atualizado',
  
  -- Reservas
  'reserva.criada',
  'reserva.aprovada',
  'reserva.cancelada',
  
  -- Portaria
  'visitante.entrada',
  'visitante.saida',
  'encomenda.recebida',
  'encomenda.retirada'
);
-- Status da integração
CREATE TYPE integracao_status AS ENUM (
  'ativa',
  'pausada',
  'erro',
  'desativada',
  'pendente'  -- Aguardando configuração
);
-- Status de entrega de webhook
CREATE TYPE webhook_entrega_status AS ENUM (
  'pendente',
  'enviando',
  'sucesso',
  'falhou',
  'cancelado'
);
-- Ambiente (live vs test/sandbox)
CREATE TYPE integracao_ambiente AS ENUM (
  'live',
  'test'
);
-- Tipo de conector
CREATE TYPE conector_tipo AS ENUM (
  'portaria',       -- Controle de acesso
  'contabilidade',  -- Exportação contábil
  'calendario',     -- Google/Outlook Calendar
  'backup',         -- S3, GCP Storage
  'erp',            -- Sistemas ERP
  'crm'             -- CRM
);
-- ============================================
-- TABELA: integracoes
-- Configuração principal de cada integração
-- ============================================
CREATE TABLE public.integracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  
  -- Identificação
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  tipo public.integracao_tipo NOT NULL,
  ambiente public.integracao_ambiente NOT NULL DEFAULT 'live',
  
  -- API Key (para api_entrada)
  api_key VARCHAR(64) UNIQUE,
  api_key_hash VARCHAR(128),  -- SHA256 para validação
  api_key_prefix VARCHAR(20), -- Primeiros caracteres para identificação
  
  -- Secret Key (para assinatura HMAC de webhooks)
  secret_key VARCHAR(64),
  
  -- URL (para webhook_saida e conector)
  url_destino VARCHAR(500),
  headers_custom JSONB DEFAULT '{}'::JSONB,
  
  -- OAuth (para conectores OAuth)
  oauth_provider VARCHAR(50), -- 'google', 'microsoft', etc
  oauth_client_id VARCHAR(255),
  oauth_tokens JSONB,         -- {access_token, refresh_token, expires_at}
  
  -- Scopes/Permissões
  scopes TEXT[] NOT NULL DEFAULT '{}',
  
  -- Rate limiting
  rate_limit_requests INTEGER NOT NULL DEFAULT 100,
  rate_limit_periodo VARCHAR(20) NOT NULL DEFAULT 'hora', -- 'minuto', 'hora', 'dia'
  rate_limit_usado INTEGER NOT NULL DEFAULT 0,
  rate_limit_reset_em TIMESTAMPTZ,
  
  -- IP Whitelist (opcional, para segurança extra)
  ip_whitelist INET[],
  
  -- Status
  status public.integracao_status NOT NULL DEFAULT 'ativa',
  
  -- Estatísticas
  ultimo_uso TIMESTAMPTZ,
  total_requests INTEGER NOT NULL DEFAULT 0,
  total_sucesso INTEGER NOT NULL DEFAULT 0,
  total_erros INTEGER NOT NULL DEFAULT 0,
  
  -- Auditoria
  criado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Nome único por condomínio
  UNIQUE(condominio_id, nome)
);
-- Índices
CREATE INDEX idx_integracoes_condominio ON public.integracoes(condominio_id);
CREATE INDEX idx_integracoes_api_key ON public.integracoes(api_key) WHERE api_key IS NOT NULL;
CREATE INDEX idx_integracoes_status ON public.integracoes(status);
CREATE INDEX idx_integracoes_tipo ON public.integracoes(tipo);
CREATE INDEX idx_integracoes_ambiente ON public.integracoes(ambiente);
-- Comentários
COMMENT ON TABLE public.integracoes IS 'Configuração de integrações (API, Webhooks, Conectores)';
COMMENT ON COLUMN public.integracoes.api_key_prefix IS 'Primeiros 8 caracteres para identificação sem expor a chave';
-- ============================================
-- TABELA: webhooks_config
-- Configuração de webhooks de saída
-- ============================================
CREATE TABLE public.webhooks_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integracao_id UUID NOT NULL REFERENCES public.integracoes(id) ON DELETE CASCADE,
  
  -- Eventos assinados
  eventos public.webhook_evento[] NOT NULL,
  
  -- Configuração de entrega
  url_override VARCHAR(500), -- Sobrescreve URL da integração
  headers_override JSONB,    -- Headers adicionais
  
  -- Retry
  max_tentativas INTEGER NOT NULL DEFAULT 5,
  intervalo_retry_segundos INTEGER NOT NULL DEFAULT 60,
  backoff_multiplicador DECIMAL(3,1) NOT NULL DEFAULT 2.0, -- Exponencial
  timeout_segundos INTEGER NOT NULL DEFAULT 30,
  
  -- Filtros (opcional)
  filtro_blocos TEXT[],      -- Só eventos desses blocos
  filtro_categorias TEXT[],  -- Só eventos dessas categorias
  filtro_tipos TEXT[],       -- Filtro adicional por tipo
  
  -- Assinatura
  usar_assinatura BOOLEAN NOT NULL DEFAULT true,
  algoritmo_assinatura VARCHAR(20) NOT NULL DEFAULT 'hmac-sha256',
  
  -- Status
  ativo BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Índices
CREATE INDEX idx_webhooks_config_integracao ON public.webhooks_config(integracao_id);
CREATE INDEX idx_webhooks_config_eventos ON public.webhooks_config USING GIN (eventos);
-- Comentários
COMMENT ON TABLE public.webhooks_config IS 'Configuração de eventos e retry para webhooks';
-- ============================================
-- TABELA: webhooks_entregas
-- Log de entregas de webhooks
-- ============================================
CREATE TABLE public.webhooks_entregas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_config_id UUID NOT NULL REFERENCES public.webhooks_config(id) ON DELETE CASCADE,
  
  -- Evento
  evento public.webhook_evento NOT NULL,
  event_id VARCHAR(64) NOT NULL UNIQUE, -- Idempotência
  payload JSONB NOT NULL,
  
  -- Referência ao recurso
  recurso_tipo VARCHAR(50),
  recurso_id UUID,
  
  -- Entrega
  tentativa INTEGER NOT NULL DEFAULT 0,
  max_tentativas INTEGER NOT NULL DEFAULT 5,
  proxima_tentativa TIMESTAMPTZ,
  
  -- Resultado
  status public.webhook_entrega_status NOT NULL DEFAULT 'pendente',
  status_code INTEGER,
  response_body TEXT,
  response_time_ms INTEGER,
  erro_mensagem TEXT,
  
  -- Assinatura enviada
  assinatura VARCHAR(128),
  
  -- Timestamps
  enviado_em TIMESTAMPTZ,
  entregue_em TIMESTAMPTZ,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Índices
CREATE INDEX idx_webhooks_entregas_config ON public.webhooks_entregas(webhook_config_id);
CREATE INDEX idx_webhooks_entregas_status ON public.webhooks_entregas(status);
CREATE INDEX idx_webhooks_entregas_proxima ON public.webhooks_entregas(proxima_tentativa) 
  WHERE status = 'pendente';
CREATE INDEX idx_webhooks_entregas_evento ON public.webhooks_entregas(evento);
CREATE INDEX idx_webhooks_entregas_created ON public.webhooks_entregas(created_at DESC);
-- Comentários
COMMENT ON TABLE public.webhooks_entregas IS 'Log de entregas de webhooks com retry';
COMMENT ON COLUMN public.webhooks_entregas.event_id IS 'ID único do evento para garantir idempotência';
-- ============================================
-- TABELA: conectores
-- Configuração de conectores nativos
-- ============================================
CREATE TABLE public.conectores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integracao_id UUID NOT NULL REFERENCES public.integracoes(id) ON DELETE CASCADE,
  
  -- Tipo
  tipo public.conector_tipo NOT NULL,
  provider VARCHAR(100) NOT NULL, -- 'controlid', 'intelbras', 'google_calendar', etc
  
  -- Configuração específica do provider
  config JSONB NOT NULL DEFAULT '{}'::JSONB,
  
  -- Credenciais (criptografadas ou referência a secrets)
  credenciais_encrypted TEXT,
  
  -- Mapeamento de campos (dados externos ↔ Versix)
  mapeamento JSONB DEFAULT '{}'::JSONB,
  
  -- Sincronização
  sync_habilitado BOOLEAN NOT NULL DEFAULT true,
  sync_intervalo_minutos INTEGER DEFAULT 60,
  ultima_sync_em TIMESTAMPTZ,
  ultima_sync_status VARCHAR(50),
  ultima_sync_erro TEXT,
  proxima_sync_em TIMESTAMPTZ,
  
  -- Estatísticas
  total_syncs INTEGER NOT NULL DEFAULT 0,
  total_registros_importados INTEGER NOT NULL DEFAULT 0,
  total_registros_exportados INTEGER NOT NULL DEFAULT 0,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Índices
CREATE INDEX idx_conectores_integracao ON public.conectores(integracao_id);
CREATE INDEX idx_conectores_tipo ON public.conectores(tipo);
CREATE INDEX idx_conectores_proxima_sync ON public.conectores(proxima_sync_em) 
  WHERE sync_habilitado = true;
-- Comentários
COMMENT ON TABLE public.conectores IS 'Configuração de conectores nativos (portaria, contabilidade, etc)';
-- ============================================
-- TABELA: api_logs
-- Log de requisições à API
-- ============================================
CREATE TABLE public.api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integracao_id UUID REFERENCES public.integracoes(id) ON DELETE SET NULL,
  
  -- Request
  metodo VARCHAR(10) NOT NULL, -- GET, POST, PUT, DELETE
  path VARCHAR(500) NOT NULL,
  query_params JSONB,
  headers JSONB, -- Headers relevantes (sem Authorization)
  body_size INTEGER,
  
  -- Response
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,
  response_size INTEGER,
  
  -- Erro (se houver)
  erro_codigo VARCHAR(50),
  erro_mensagem TEXT,
  
  -- Contexto
  ip_address INET,
  user_agent TEXT,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Índices
CREATE INDEX idx_api_logs_integracao ON public.api_logs(integracao_id);
CREATE INDEX idx_api_logs_created ON public.api_logs(created_at DESC);
CREATE INDEX idx_api_logs_path ON public.api_logs(path);
CREATE INDEX idx_api_logs_status ON public.api_logs(status_code);
-- Particionamento por data (para alta escala)
-- Em produção, considerar particionar por mês

-- Retenção automática (30 dias)
-- Implementar via pg_cron ou Edge Function

-- Comentários
COMMENT ON TABLE public.api_logs IS 'Log de requisições à API REST (retenção 30 dias)';
-- ============================================
-- TABELA: api_scopes
-- Definição de scopes disponíveis
-- ============================================
CREATE TABLE public.api_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  codigo VARCHAR(100) NOT NULL UNIQUE, -- 'read:moradores', 'write:comunicados'
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  
  -- Categoria
  categoria VARCHAR(50) NOT NULL, -- 'moradores', 'financeiro', 'comunicacao', etc
  
  -- Permissão
  tipo VARCHAR(20) NOT NULL, -- 'read', 'write', 'delete', 'admin'
  
  -- Recursos afetados
  recursos TEXT[] NOT NULL, -- ['usuarios', 'unidades']
  
  -- Nível de acesso necessário
  requer_role public.user_role[], -- Roles mínimos para usar este scope
  
  -- Status
  ativo BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Popular scopes padrão
INSERT INTO public.api_scopes (codigo, nome, descricao, categoria, tipo, recursos, requer_role) VALUES
-- Moradores
('read:moradores', 'Ler moradores', 'Consultar lista de moradores e seus dados', 'moradores', 'read', ARRAY['usuarios'], ARRAY['sindico', 'admin_condo']::public.user_role[]),
('read:unidades', 'Ler unidades', 'Consultar unidades habitacionais', 'moradores', 'read', ARRAY['unidades_habitacionais'], ARRAY['sindico', 'admin_condo']::public.user_role[]),
('write:moradores', 'Gerenciar moradores', 'Criar e atualizar cadastros', 'moradores', 'write', ARRAY['usuarios'], ARRAY['sindico', 'admin_condo']::public.user_role[]),

-- Comunicação
('read:comunicados', 'Ler comunicados', 'Consultar comunicados publicados', 'comunicacao', 'read', ARRAY['comunicados'], ARRAY['morador', 'sindico']::public.user_role[]),
('write:comunicados', 'Publicar comunicados', 'Criar e editar comunicados', 'comunicacao', 'write', ARRAY['comunicados'], ARRAY['sindico', 'admin_condo']::public.user_role[]),
('read:notificacoes', 'Ler notificações', 'Consultar histórico de notificações', 'comunicacao', 'read', ARRAY['notificacoes'], ARRAY['sindico']::public.user_role[]),

-- Ocorrências
('read:ocorrencias', 'Ler ocorrências', 'Consultar ocorrências', 'ocorrencias', 'read', ARRAY['ocorrencias'], ARRAY['sindico', 'admin_condo']::public.user_role[]),
('write:ocorrencias', 'Gerenciar ocorrências', 'Criar e atualizar ocorrências', 'ocorrencias', 'write', ARRAY['ocorrencias'], ARRAY['sindico', 'admin_condo']::public.user_role[]),

-- Chamados
('read:chamados', 'Ler chamados', 'Consultar chamados de manutenção', 'chamados', 'read', ARRAY['chamados'], ARRAY['sindico', 'admin_condo']::public.user_role[]),
('write:chamados', 'Gerenciar chamados', 'Criar e atualizar chamados', 'chamados', 'write', ARRAY['chamados'], ARRAY['sindico', 'admin_condo']::public.user_role[]),

-- Financeiro
('read:financeiro', 'Ler financeiro', 'Consultar lançamentos e cobranças', 'financeiro', 'read', ARRAY['lancamentos_financeiros', 'taxas_unidades'], ARRAY['sindico', 'admin_condo']::public.user_role[]),
('write:financeiro', 'Gerenciar financeiro', 'Criar lançamentos e cobranças', 'financeiro', 'write', ARRAY['lancamentos_financeiros', 'taxas_unidades'], ARRAY['sindico', 'admin_condo']::public.user_role[]),
('read:cobrancas', 'Ler cobranças', 'Consultar cobranças e boletos', 'financeiro', 'read', ARRAY['taxas_unidades'], ARRAY['morador', 'sindico']::public.user_role[]),

-- Assembleias
('read:assembleias', 'Ler assembleias', 'Consultar assembleias e pautas', 'assembleias', 'read', ARRAY['assembleias', 'assembleia_pautas'], ARRAY['morador', 'sindico']::public.user_role[]),
('write:assembleias', 'Gerenciar assembleias', 'Criar e gerenciar assembleias', 'assembleias', 'write', ARRAY['assembleias', 'assembleia_pautas'], ARRAY['sindico', 'admin_condo']::public.user_role[]),

-- Reservas
('read:reservas', 'Ler reservas', 'Consultar reservas de áreas comuns', 'reservas', 'read', ARRAY['reservas'], ARRAY['morador', 'sindico']::public.user_role[]),
('write:reservas', 'Fazer reservas', 'Criar e cancelar reservas', 'reservas', 'write', ARRAY['reservas'], ARRAY['morador', 'sindico']::public.user_role[]),

-- Portaria
('read:visitantes', 'Ler visitantes', 'Consultar registro de visitantes', 'portaria', 'read', ARRAY['visitantes'], ARRAY['porteiro', 'sindico']::public.user_role[]),
('write:visitantes', 'Registrar visitantes', 'Criar registros de entrada/saída', 'portaria', 'write', ARRAY['visitantes'], ARRAY['porteiro', 'sindico']::public.user_role[]),
('read:encomendas', 'Ler encomendas', 'Consultar encomendas recebidas', 'portaria', 'read', ARRAY['encomendas'], ARRAY['porteiro', 'sindico', 'morador']::public.user_role[]),
('write:encomendas', 'Registrar encomendas', 'Criar registros de encomendas', 'portaria', 'write', ARRAY['encomendas'], ARRAY['porteiro']::public.user_role[]),

-- Admin
('admin:webhooks', 'Administrar webhooks', 'Configurar e gerenciar webhooks', 'admin', 'admin', ARRAY['webhooks_config'], ARRAY['sindico', 'admin_condo']::public.user_role[]),
('admin:integracoes', 'Administrar integrações', 'Configurar integrações e conectores', 'admin', 'admin', ARRAY['integracoes', 'conectores'], ARRAY['sindico', 'admin_condo']::public.user_role[]);
-- Comentários
COMMENT ON TABLE public.api_scopes IS 'Definição de scopes disponíveis para API Keys';
-- ============================================
-- TABELA: sync_logs
-- Log de sincronizações de conectores
-- ============================================
CREATE TABLE public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conector_id UUID NOT NULL REFERENCES public.conectores(id) ON DELETE CASCADE,
  
  -- Tipo de sync
  direcao VARCHAR(20) NOT NULL, -- 'import', 'export', 'bidirecional'
  
  -- Resultado
  status VARCHAR(20) NOT NULL, -- 'sucesso', 'parcial', 'erro'
  
  -- Estatísticas
  registros_processados INTEGER NOT NULL DEFAULT 0,
  registros_criados INTEGER NOT NULL DEFAULT 0,
  registros_atualizados INTEGER NOT NULL DEFAULT 0,
  registros_ignorados INTEGER NOT NULL DEFAULT 0,
  registros_erro INTEGER NOT NULL DEFAULT 0,
  
  -- Erros detalhados
  erros JSONB, -- [{linha: X, erro: 'mensagem'}]
  
  -- Duração
  iniciado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalizado_em TIMESTAMPTZ,
  duracao_ms INTEGER,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Índices
CREATE INDEX idx_sync_logs_conector ON public.sync_logs(conector_id);
CREATE INDEX idx_sync_logs_created ON public.sync_logs(created_at DESC);
-- Comentários
COMMENT ON TABLE public.sync_logs IS 'Log de sincronizações de conectores';
-- ============================================
-- TRIGGERS: updated_at automático
-- ============================================
CREATE TRIGGER set_updated_at_integracoes
  BEFORE UPDATE ON public.integracoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_webhooks_config
  BEFORE UPDATE ON public.webhooks_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_webhooks_entregas
  BEFORE UPDATE ON public.webhooks_entregas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_conectores
  BEFORE UPDATE ON public.conectores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- ============================================
-- COMENTÁRIOS FINAIS
-- ============================================
COMMENT ON SCHEMA public IS 'Versix Norma - Sprint 8: Integrações adicionado';
