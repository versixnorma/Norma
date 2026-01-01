-- =====================================================
-- SPRINT 10: OBSERVABILIDADE
-- Métricas, Logs, Alertas, Health Checks
-- =====================================================

-- =====================================================
-- TABELA: metricas_uso
-- Métricas agregadas por período (dia/semana/mês)
-- =====================================================
CREATE TABLE IF NOT EXISTS metricas_uso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,

  -- Período
  periodo DATE NOT NULL,
  tipo_periodo VARCHAR(10) NOT NULL CHECK (tipo_periodo IN ('hora', 'dia', 'semana', 'mes')),

  -- Métricas de uso
  usuarios_ativos INTEGER DEFAULT 0,
  sessoes_totais INTEGER DEFAULT 0,
  tempo_medio_sessao_segundos INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,

  -- Métricas de features
  comunicados_criados INTEGER DEFAULT 0,
  comunicados_visualizados INTEGER DEFAULT 0,
  ocorrencias_criadas INTEGER DEFAULT 0,
  ocorrencias_resolvidas INTEGER DEFAULT 0,
  chamados_abertos INTEGER DEFAULT 0,
  chamados_fechados INTEGER DEFAULT 0,
  reservas_feitas INTEGER DEFAULT 0,
  votos_assembleias INTEGER DEFAULT 0,
  documentos_acessados INTEGER DEFAULT 0,

  -- Métricas de IA (Norma)
  norma_conversas INTEGER DEFAULT 0,
  norma_mensagens INTEGER DEFAULT 0,
  norma_tokens_entrada INTEGER DEFAULT 0,
  norma_tokens_saida INTEGER DEFAULT 0,
  norma_tempo_resposta_avg_ms INTEGER DEFAULT 0,
  norma_satisfacao_avg DECIMAL(3,2), -- 0.00 a 5.00

  -- Métricas de comunicação
  notificacoes_enviadas INTEGER DEFAULT 0,
  notificacoes_lidas INTEGER DEFAULT 0,
  emails_enviados INTEGER DEFAULT 0,
  emails_abertos INTEGER DEFAULT 0,
  sms_enviados INTEGER DEFAULT 0,
  push_enviados INTEGER DEFAULT 0,
  push_clicados INTEGER DEFAULT 0,

  -- Métricas de custo (em centavos)
  custo_ia_centavos INTEGER DEFAULT 0,
  custo_email_centavos INTEGER DEFAULT 0,
  custo_sms_centavos INTEGER DEFAULT 0,
  custo_storage_centavos INTEGER DEFAULT 0,
  custo_total_centavos INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(condominio_id, periodo, tipo_periodo)
);

CREATE INDEX idx_metricas_periodo ON metricas_uso(periodo, tipo_periodo);
CREATE INDEX idx_metricas_condominio ON metricas_uso(condominio_id, periodo DESC);
CREATE INDEX idx_metricas_tipo ON metricas_uso(tipo_periodo, periodo DESC);

-- =====================================================
-- TABELA: metricas_performance
-- Métricas técnicas de performance por endpoint
-- =====================================================
CREATE TABLE IF NOT EXISTS metricas_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  periodo TIMESTAMPTZ NOT NULL,
  endpoint VARCHAR(200) NOT NULL,
  metodo VARCHAR(10) NOT NULL DEFAULT 'GET',

  -- Contadores
  total_requests INTEGER DEFAULT 0,
  requests_sucesso INTEGER DEFAULT 0,
  requests_erro INTEGER DEFAULT 0,
  requests_timeout INTEGER DEFAULT 0,

  -- Latência (em ms)
  latencia_min INTEGER,
  latencia_p50 INTEGER,
  latencia_p90 INTEGER,
  latencia_p99 INTEGER,
  latencia_max INTEGER,
  latencia_avg INTEGER,

  -- Throughput
  rps_max DECIMAL(10,2),
  rps_avg DECIMAL(10,2),

  -- Tamanho de resposta (bytes)
  response_size_avg INTEGER,
  response_size_max INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_perf_periodo ON metricas_performance(periodo DESC);
CREATE INDEX idx_perf_endpoint ON metricas_performance(endpoint, periodo DESC);
CREATE INDEX idx_perf_periodo_endpoint ON metricas_performance(periodo, endpoint);

-- =====================================================
-- TABELA: alertas_sistema
-- Registro de alertas disparados
-- =====================================================
CREATE TABLE IF NOT EXISTS alertas_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tipo e severidade
  tipo VARCHAR(50) NOT NULL,
  severidade VARCHAR(10) NOT NULL CHECK (severidade IN ('info', 'warning', 'error', 'critical')),

  -- Contexto
  condominio_id UUID REFERENCES condominios(id) ON DELETE SET NULL,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  endpoint VARCHAR(200),

  -- Detalhes
  titulo VARCHAR(200) NOT NULL,
  descricao TEXT,
  dados JSONB DEFAULT '{}',

  -- Stack trace (para erros)
  stack_trace TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'aberto' CHECK (status IN ('aberto', 'reconhecido', 'resolvido', 'ignorado')),
  resolvido_em TIMESTAMPTZ,
  resolvido_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  resolucao_notas TEXT,

  -- Notificações enviadas
  notificado_slack BOOLEAN DEFAULT false,
  notificado_email BOOLEAN DEFAULT false,
  notificado_pagerduty BOOLEAN DEFAULT false,

  -- Deduplicação
  fingerprint VARCHAR(64), -- Hash para agrupar alertas similares
  ocorrencias INTEGER DEFAULT 1,
  primeira_ocorrencia TIMESTAMPTZ DEFAULT NOW(),
  ultima_ocorrencia TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alertas_tipo ON alertas_sistema(tipo);
CREATE INDEX idx_alertas_severidade ON alertas_sistema(severidade);
CREATE INDEX idx_alertas_status ON alertas_sistema(status);
CREATE INDEX idx_alertas_condominio ON alertas_sistema(condominio_id);
CREATE INDEX idx_alertas_fingerprint ON alertas_sistema(fingerprint);
CREATE INDEX idx_alertas_abertos ON alertas_sistema(created_at DESC) WHERE status = 'aberto';

-- =====================================================
-- TABELA: uptime_checks
-- Histórico de verificações de disponibilidade
-- =====================================================
CREATE TABLE IF NOT EXISTS uptime_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Endpoint verificado
  endpoint_nome VARCHAR(100) NOT NULL,
  endpoint_url VARCHAR(500) NOT NULL,
  endpoint_critico BOOLEAN DEFAULT false,

  -- Resultado
  status VARCHAR(20) NOT NULL CHECK (status IN ('ok', 'degraded', 'error', 'timeout')),
  status_code INTEGER,
  latencia_ms INTEGER,

  -- Detalhes de erro
  erro_mensagem TEXT,
  erro_tipo VARCHAR(100),

  -- Timestamp
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_uptime_endpoint ON uptime_checks(endpoint_nome, checked_at DESC);
CREATE INDEX idx_uptime_status ON uptime_checks(status, checked_at DESC);
CREATE INDEX idx_uptime_checked ON uptime_checks(checked_at DESC);

-- Particionar por tempo (manter 30 dias)
-- Em produção, considerar particionamento por range

-- =====================================================
-- TABELA: api_request_logs
-- Log de requisições à API
-- =====================================================
CREATE TABLE IF NOT EXISTS api_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request
  request_id VARCHAR(50) NOT NULL,
  metodo VARCHAR(10) NOT NULL,
  path VARCHAR(500) NOT NULL,
  query_params JSONB,
  headers_selecionados JSONB, -- Apenas headers relevantes

  -- Response
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,
  response_size_bytes INTEGER,

  -- Contexto
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  condominio_id UUID REFERENCES condominios(id) ON DELETE SET NULL,

  -- Cliente
  ip_address INET,
  user_agent TEXT,
  referer TEXT,

  -- Erro (se houver)
  erro BOOLEAN DEFAULT false,
  erro_tipo VARCHAR(100),
  erro_mensagem TEXT,

  -- Edge Function específico
  edge_function VARCHAR(100),
  edge_region VARCHAR(50),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_request_logs_path ON api_request_logs(path, created_at DESC);
CREATE INDEX idx_api_logs_usuario ON api_request_logs(usuario_id, created_at DESC);
CREATE INDEX idx_api_logs_condominio ON api_request_logs(condominio_id, created_at DESC);
CREATE INDEX idx_api_logs_erros ON api_request_logs(created_at DESC) WHERE erro = true;
CREATE INDEX idx_api_logs_request_id ON api_request_logs(request_id);

-- =====================================================
-- TABELA: anomalias_detectadas
-- Anomalias detectadas pelo sistema
-- =====================================================
CREATE TABLE IF NOT EXISTS anomalias_detectadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Métrica
  metrica VARCHAR(100) NOT NULL,
  condominio_id UUID REFERENCES condominios(id) ON DELETE SET NULL,

  -- Valores
  valor_atual DECIMAL(20,4) NOT NULL,
  baseline_media DECIMAL(20,4) NOT NULL,
  baseline_desvio DECIMAL(20,4) NOT NULL,
  z_score DECIMAL(10,4) NOT NULL,

  -- Classificação
  severidade VARCHAR(10) NOT NULL CHECK (severidade IN ('low', 'medium', 'high', 'critical')),
  direcao VARCHAR(10) NOT NULL CHECK (direcao IN ('acima', 'abaixo')),

  -- Status
  confirmada BOOLEAN,
  falso_positivo BOOLEAN DEFAULT false,
  investigada BOOLEAN DEFAULT false,

  detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_anomalias_metrica ON anomalias_detectadas(metrica, detected_at DESC);
CREATE INDEX idx_anomalias_severidade ON anomalias_detectadas(severidade, detected_at DESC);
CREATE INDEX idx_anomalias_condominio ON anomalias_detectadas(condominio_id, detected_at DESC);

-- =====================================================
-- TABELA: health_check_config
-- Configuração de endpoints para health check
-- =====================================================
CREATE TABLE IF NOT EXISTS health_check_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Endpoint
  nome VARCHAR(100) NOT NULL,
  url VARCHAR(500) NOT NULL,
  metodo VARCHAR(10) DEFAULT 'GET',
  headers JSONB DEFAULT '{}',
  body JSONB,

  -- Configuração
  ativo BOOLEAN DEFAULT true,
  critico BOOLEAN DEFAULT false,
  intervalo_segundos INTEGER DEFAULT 300, -- 5 minutos
  timeout_segundos INTEGER DEFAULT 30,

  -- Validação
  expect_status INTEGER DEFAULT 200,
  expect_body_contains TEXT,

  -- Alertas
  alertar_apos_falhas INTEGER DEFAULT 2,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: metricas_agregadas_globais
-- Métricas do sistema como um todo (não por condomínio)
-- =====================================================
CREATE TABLE IF NOT EXISTS metricas_globais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  periodo TIMESTAMPTZ NOT NULL,
  tipo_periodo VARCHAR(10) NOT NULL CHECK (tipo_periodo IN ('hora', 'dia')),

  -- Totais do sistema
  total_condominios_ativos INTEGER DEFAULT 0,
  total_usuarios_ativos INTEGER DEFAULT 0,
  total_requisicoes INTEGER DEFAULT 0,
  total_erros INTEGER DEFAULT 0,

  -- Custos totais (centavos)
  custo_infra_centavos INTEGER DEFAULT 0,
  custo_apis_centavos INTEGER DEFAULT 0,
  receita_estimada_centavos INTEGER DEFAULT 0,

  -- Performance global
  latencia_global_p50 INTEGER,
  latencia_global_p99 INTEGER,
  uptime_percentual DECIMAL(5,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(periodo, tipo_periodo)
);

CREATE INDEX idx_globais_periodo ON metricas_globais(periodo DESC, tipo_periodo);

-- =====================================================
-- VIEWS
-- =====================================================

-- View: Resumo de alertas ativos
CREATE OR REPLACE VIEW v_alertas_resumo AS
SELECT
  severidade,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'aberto') as abertos,
  COUNT(*) FILTER (WHERE status = 'reconhecido') as reconhecidos,
  MIN(created_at) FILTER (WHERE status = 'aberto') as mais_antigo
FROM alertas_sistema
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY severidade
ORDER BY
  CASE severidade
    WHEN 'critical' THEN 1
    WHEN 'error' THEN 2
    WHEN 'warning' THEN 3
    ELSE 4
  END;

-- View: Status atual do sistema
CREATE OR REPLACE VIEW v_system_status AS
WITH recent_checks AS (
  SELECT DISTINCT ON (endpoint_nome)
    endpoint_nome,
    endpoint_critico,
    status,
    latencia_ms,
    checked_at
  FROM uptime_checks
  ORDER BY endpoint_nome, checked_at DESC
),
error_rate AS (
  SELECT
    COUNT(*) FILTER (WHERE erro) * 100.0 / NULLIF(COUNT(*), 0) as taxa_erro_1h
  FROM api_request_logs
  WHERE created_at > NOW() - INTERVAL '1 hour'
),
active_alerts AS (
  SELECT COUNT(*) as alertas_criticos
  FROM alertas_sistema
  WHERE status = 'aberto' AND severidade IN ('critical', 'error')
)
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM recent_checks WHERE status = 'error' AND endpoint_critico)
      THEN 'unhealthy'
    WHEN EXISTS (SELECT 1 FROM recent_checks WHERE status IN ('error', 'degraded'))
      THEN 'degraded'
    WHEN (SELECT taxa_erro_1h FROM error_rate) > 5
      THEN 'degraded'
    ELSE 'healthy'
  END as status_geral,
  (SELECT taxa_erro_1h FROM error_rate) as taxa_erro_1h,
  (SELECT alertas_criticos FROM active_alerts) as alertas_criticos,
  (SELECT json_agg(json_build_object(
    'nome', endpoint_nome,
    'status', status,
    'latencia', latencia_ms,
    'critico', endpoint_critico
  )) FROM recent_checks) as endpoints;

-- View: Métricas dos últimos 7 dias por condomínio
CREATE OR REPLACE VIEW v_metricas_7d AS
SELECT
  condominio_id,
  SUM(usuarios_ativos) as usuarios_ativos_total,
  SUM(comunicados_criados) as comunicados_total,
  SUM(ocorrencias_criadas) as ocorrencias_total,
  SUM(norma_conversas) as conversas_ia_total,
  SUM(custo_total_centavos) as custo_total,
  AVG(norma_tempo_resposta_avg_ms) as latencia_ia_media
FROM metricas_uso
WHERE periodo >= CURRENT_DATE - INTERVAL '7 days'
  AND tipo_periodo = 'dia'
GROUP BY condominio_id;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function: Criar alerta com deduplicação
CREATE OR REPLACE FUNCTION criar_alerta(
  p_tipo VARCHAR,
  p_severidade VARCHAR,
  p_titulo VARCHAR,
  p_descricao TEXT DEFAULT NULL,
  p_condominio_id UUID DEFAULT NULL,
  p_dados JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fingerprint VARCHAR(64);
  v_alerta_id UUID;
  v_existente UUID;
BEGIN
  -- Gerar fingerprint para deduplicação
  v_fingerprint := md5(p_tipo || COALESCE(p_condominio_id::text, '') || p_titulo);

  -- Verificar se já existe alerta similar não resolvido nas últimas 24h
  SELECT id INTO v_existente
  FROM alertas_sistema
  WHERE fingerprint = v_fingerprint
    AND status IN ('aberto', 'reconhecido')
    AND created_at > NOW() - INTERVAL '24 hours'
  LIMIT 1;

  IF v_existente IS NOT NULL THEN
    -- Incrementar ocorrências do alerta existente
    UPDATE alertas_sistema
    SET ocorrencias = ocorrencias + 1,
        ultima_ocorrencia = NOW()
    WHERE id = v_existente;

    RETURN v_existente;
  END IF;

  -- Criar novo alerta
  INSERT INTO alertas_sistema (
    tipo, severidade, titulo, descricao,
    condominio_id, dados, fingerprint
  ) VALUES (
    p_tipo, p_severidade, p_titulo, p_descricao,
    p_condominio_id, p_dados, v_fingerprint
  )
  RETURNING id INTO v_alerta_id;

  RETURN v_alerta_id;
END;
$$;

-- Function: Resolver alerta
CREATE OR REPLACE FUNCTION resolver_alerta(
  p_alerta_id UUID,
  p_resolvido_por UUID,
  p_notas TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE alertas_sistema
  SET status = 'resolvido',
      resolvido_em = NOW(),
      resolvido_por = p_resolvido_por,
      resolucao_notas = p_notas
  WHERE id = p_alerta_id
    AND status != 'resolvido';

  RETURN FOUND;
END;
$$;

-- Function: Agregar métricas diárias para semanais/mensais
CREATE OR REPLACE FUNCTION agregar_metricas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Agregar para semana (segunda-feira anterior)
  INSERT INTO metricas_uso (
    condominio_id, periodo, tipo_periodo,
    usuarios_ativos, sessoes_totais, comunicados_criados,
    ocorrencias_criadas, chamados_abertos, norma_conversas,
    norma_tokens_entrada, norma_tokens_saida,
    custo_ia_centavos, custo_total_centavos
  )
  SELECT
    condominio_id,
    date_trunc('week', periodo)::date as periodo,
    'semana' as tipo_periodo,
    SUM(usuarios_ativos),
    SUM(sessoes_totais),
    SUM(comunicados_criados),
    SUM(ocorrencias_criadas),
    SUM(chamados_abertos),
    SUM(norma_conversas),
    SUM(norma_tokens_entrada),
    SUM(norma_tokens_saida),
    SUM(custo_ia_centavos),
    SUM(custo_total_centavos)
  FROM metricas_uso
  WHERE tipo_periodo = 'dia'
    AND periodo >= date_trunc('week', CURRENT_DATE - INTERVAL '1 week')
    AND periodo < date_trunc('week', CURRENT_DATE)
  GROUP BY condominio_id, date_trunc('week', periodo)
  ON CONFLICT (condominio_id, periodo, tipo_periodo)
  DO UPDATE SET
    usuarios_ativos = EXCLUDED.usuarios_ativos,
    sessoes_totais = EXCLUDED.sessoes_totais,
    comunicados_criados = EXCLUDED.comunicados_criados,
    ocorrencias_criadas = EXCLUDED.ocorrencias_criadas,
    chamados_abertos = EXCLUDED.chamados_abertos,
    norma_conversas = EXCLUDED.norma_conversas,
    norma_tokens_entrada = EXCLUDED.norma_tokens_entrada,
    norma_tokens_saida = EXCLUDED.norma_tokens_saida,
    custo_ia_centavos = EXCLUDED.custo_ia_centavos,
    custo_total_centavos = EXCLUDED.custo_total_centavos,
    updated_at = NOW();
END;
$$;

-- Function: Limpar dados antigos
CREATE OR REPLACE FUNCTION limpar_dados_observabilidade()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Manter apenas 30 dias de uptime_checks
  DELETE FROM uptime_checks WHERE checked_at < NOW() - INTERVAL '30 days';

  -- Manter apenas 7 dias de api_request_logs
  DELETE FROM api_request_logs WHERE created_at < NOW() - INTERVAL '7 days';

  -- Manter apenas 90 dias de metricas_performance
  DELETE FROM metricas_performance WHERE periodo < NOW() - INTERVAL '90 days';

  -- Manter apenas 30 dias de anomalias_detectadas
  DELETE FROM anomalias_detectadas WHERE detected_at < NOW() - INTERVAL '30 days';

  -- Alertas resolvidos: manter 90 dias
  DELETE FROM alertas_sistema
  WHERE status = 'resolvido' AND resolvido_em < NOW() - INTERVAL '90 days';
END;
$$;

-- Trigger: Calcular custo total
CREATE OR REPLACE FUNCTION calcular_custo_total()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.custo_total_centavos := COALESCE(NEW.custo_ia_centavos, 0)
                            + COALESCE(NEW.custo_email_centavos, 0)
                            + COALESCE(NEW.custo_sms_centavos, 0)
                            + COALESCE(NEW.custo_storage_centavos, 0);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_calcular_custo_total
  BEFORE INSERT OR UPDATE ON metricas_uso
  FOR EACH ROW
  EXECUTE FUNCTION calcular_custo_total();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE metricas_uso ENABLE ROW LEVEL SECURITY;
ALTER TABLE metricas_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE uptime_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;

-- Métricas de uso: síndicos veem do próprio condomínio, superadmin vê tudo
CREATE POLICY "metricas_uso_select" ON metricas_uso FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
        AND (u.role = 'superadmin' OR u.condominio_id = metricas_uso.condominio_id)
    )
  );

-- Alertas: superadmin e admins
CREATE POLICY "alertas_select" ON alertas_sistema FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
        AND u.role IN ('superadmin', 'admin_condo')
    )
  );

CREATE POLICY "alertas_update" ON alertas_sistema FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
        AND u.role IN ('superadmin', 'admin_condo')
    )
  );

-- Performance e uptime: apenas superadmin
CREATE POLICY "perf_select_superadmin" ON metricas_performance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid() AND u.role = 'superadmin'
    )
  );

CREATE POLICY "uptime_select_superadmin" ON uptime_checks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid() AND u.role = 'superadmin'
    )
  );

-- API logs: superadmin apenas
CREATE POLICY "api_logs_select_superadmin" ON api_request_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid() AND u.role = 'superadmin'
    )
  );

-- =====================================================
-- SEED: Health Check Config padrão
-- =====================================================
INSERT INTO health_check_config (nome, url, critico, intervalo_segundos) VALUES
  ('Database', '/rest/v1/', true, 60),
  ('Auth', '/auth/v1/health', true, 60),
  ('Storage', '/storage/v1/bucket', false, 300),
  ('Edge Functions', '/functions/v1/health', true, 120)
ON CONFLICT DO NOTHING;
