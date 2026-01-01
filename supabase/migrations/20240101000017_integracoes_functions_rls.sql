-- ============================================================
-- VERSIX NORMA - SPRINT 8: INTEGRAÇÕES
-- Migration 017: Functions, Views e RLS
-- ============================================================

-- ============================================
-- FUNCTION: gerar_api_key
-- Gera uma nova API Key com prefixo de ambiente
-- ============================================
CREATE OR REPLACE FUNCTION public.gerar_api_key(
  p_ambiente public.integracao_ambiente DEFAULT 'live'
)
RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE
  v_key TEXT;
  v_prefix VARCHAR(10);
  v_random_bytes BYTEA;
BEGIN
  -- Prefixo indica ambiente
  v_prefix := CASE p_ambiente
    WHEN 'test' THEN 'vn_test_'
    ELSE 'vn_live_'
  END;
  
  -- Gerar bytes aleatórios e converter para base64
  v_random_bytes := gen_random_bytes(24);
  v_key := v_prefix || encode(v_random_bytes, 'base64');
  
  -- Remover caracteres problemáticos
  v_key := replace(replace(replace(v_key, '+', 'x'), '/', 'y'), '=', '');
  
  RETURN LEFT(v_key, 44);
END;
$$;
COMMENT ON FUNCTION public.gerar_api_key IS 'Gera API Key com prefixo indicando ambiente (live/test)';
-- ============================================
-- FUNCTION: criar_integracao_api
-- Cria uma integração do tipo API com chave gerada
-- ============================================
CREATE OR REPLACE FUNCTION public.criar_integracao_api(
  p_condominio_id UUID,
  p_nome VARCHAR(100),
  p_descricao TEXT DEFAULT NULL,
  p_scopes TEXT[] DEFAULT '{}',
  p_ambiente public.integracao_ambiente DEFAULT 'live',
  p_rate_limit INTEGER DEFAULT 100,
  p_criado_por UUID DEFAULT NULL
)
RETURNS TABLE (
  integracao_id UUID,
  api_key TEXT,
  api_key_prefix VARCHAR(20)
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_api_key TEXT;
  v_api_key_hash VARCHAR(128);
  v_api_key_prefix VARCHAR(20);
  v_integracao_id UUID;
BEGIN
  -- Gerar API Key
  v_api_key := public.gerar_api_key(p_ambiente);
  v_api_key_hash := encode(sha256(v_api_key::BYTEA), 'hex');
  v_api_key_prefix := LEFT(v_api_key, 12) || '...';
  
  -- Inserir integração
  INSERT INTO public.integracoes (
    condominio_id, nome, descricao, tipo, ambiente,
    api_key, api_key_hash, api_key_prefix,
    scopes, rate_limit_requests, criado_por
  ) VALUES (
    p_condominio_id, p_nome, p_descricao, 'api_entrada', p_ambiente,
    v_api_key, v_api_key_hash, v_api_key_prefix,
    p_scopes, p_rate_limit, p_criado_por
  )
  RETURNING id INTO v_integracao_id;
  
  -- Retornar dados (API Key só é retornada uma vez!)
  RETURN QUERY SELECT v_integracao_id, v_api_key, v_api_key_prefix;
END;
$$;
COMMENT ON FUNCTION public.criar_integracao_api IS 'Cria integração API e retorna a chave (única vez visível)';
-- ============================================
-- FUNCTION: regenerar_api_key
-- Regenera a API Key de uma integração
-- ============================================
CREATE OR REPLACE FUNCTION public.regenerar_api_key(
  p_integracao_id UUID
)
RETURNS TABLE (
  api_key TEXT,
  api_key_prefix VARCHAR(20)
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_integracao public.integracoes%ROWTYPE;
  v_api_key TEXT;
  v_api_key_hash VARCHAR(128);
  v_api_key_prefix VARCHAR(20);
BEGIN
  -- Buscar integração
  SELECT * INTO v_integracao FROM public.integracoes WHERE id = p_integracao_id;
  
  IF v_integracao.id IS NULL THEN
    RAISE EXCEPTION 'Integração não encontrada';
  END IF;
  
  IF v_integracao.tipo != 'api_entrada' THEN
    RAISE EXCEPTION 'Apenas integrações do tipo API podem ter chave regenerada';
  END IF;
  
  -- Verificar permissão (via RLS ou aqui)
  
  -- Gerar nova API Key
  v_api_key := public.gerar_api_key(v_integracao.ambiente);
  v_api_key_hash := encode(sha256(v_api_key::BYTEA), 'hex');
  v_api_key_prefix := LEFT(v_api_key, 12) || '...';
  
  -- Atualizar
  UPDATE public.integracoes
  SET 
    api_key = v_api_key,
    api_key_hash = v_api_key_hash,
    api_key_prefix = v_api_key_prefix,
    rate_limit_usado = 0, -- Reset rate limit
    updated_at = NOW()
  WHERE id = p_integracao_id;
  
  RETURN QUERY SELECT v_api_key, v_api_key_prefix;
END;
$$;
COMMENT ON FUNCTION public.regenerar_api_key IS 'Regenera API Key (invalida a anterior)';
-- ============================================
-- FUNCTION: validar_api_key
-- Valida API Key e retorna informações da integração
-- ============================================
CREATE OR REPLACE FUNCTION public.validar_api_key(
  p_api_key TEXT
)
RETURNS TABLE (
  integracao_id UUID,
  condominio_id UUID,
  scopes TEXT[],
  rate_limit_restante INTEGER,
  ambiente public.integracao_ambiente
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_integracao public.integracoes%ROWTYPE;
  v_api_key_hash VARCHAR(128);
  v_rate_limit_restante INTEGER;
BEGIN
  -- Calcular hash da chave fornecida
  v_api_key_hash := encode(sha256(p_api_key::BYTEA), 'hex');
  
  -- Buscar integração pelo hash
  SELECT * INTO v_integracao 
  FROM public.integracoes 
  WHERE api_key_hash = v_api_key_hash
    AND tipo = 'api_entrada'
    AND status = 'ativa';
  
  IF v_integracao.id IS NULL THEN
    RETURN; -- Retorna vazio (chave inválida)
  END IF;
  
  -- Verificar e resetar rate limit se necessário
  IF v_integracao.rate_limit_reset_em IS NULL OR v_integracao.rate_limit_reset_em < NOW() THEN
    UPDATE public.integracoes
    SET 
      rate_limit_usado = 0,
      rate_limit_reset_em = CASE v_integracao.rate_limit_periodo
        WHEN 'minuto' THEN NOW() + INTERVAL '1 minute'
        WHEN 'hora' THEN NOW() + INTERVAL '1 hour'
        WHEN 'dia' THEN NOW() + INTERVAL '1 day'
        ELSE NOW() + INTERVAL '1 hour'
      END
    WHERE id = v_integracao.id
    RETURNING rate_limit_usado INTO v_integracao.rate_limit_usado;
  END IF;
  
  -- Calcular limite restante
  v_rate_limit_restante := v_integracao.rate_limit_requests - v_integracao.rate_limit_usado;
  
  -- Incrementar uso
  UPDATE public.integracoes
  SET 
    rate_limit_usado = rate_limit_usado + 1,
    ultimo_uso = NOW(),
    total_requests = total_requests + 1
  WHERE id = v_integracao.id;
  
  RETURN QUERY SELECT 
    v_integracao.id,
    v_integracao.condominio_id,
    v_integracao.scopes,
    v_rate_limit_restante,
    v_integracao.ambiente;
END;
$$;
COMMENT ON FUNCTION public.validar_api_key IS 'Valida API Key e retorna contexto da integração';
-- ============================================
-- FUNCTION: verificar_scope
-- Verifica se a integração tem o scope necessário
-- ============================================
CREATE OR REPLACE FUNCTION public.verificar_scope(
  p_scopes_integracao TEXT[],
  p_scope_necessario TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql AS $$
BEGIN
  -- Verificar scope exato
  IF p_scope_necessario = ANY(p_scopes_integracao) THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar wildcard (ex: 'read:*' cobre 'read:moradores')
  IF EXISTS (
    SELECT 1 FROM unnest(p_scopes_integracao) AS s
    WHERE s LIKE '%:*' AND split_part(s, ':', 1) = split_part(p_scope_necessario, ':', 1)
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar admin (admin:* cobre tudo)
  IF 'admin:*' = ANY(p_scopes_integracao) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;
COMMENT ON FUNCTION public.verificar_scope IS 'Verifica se integração tem scope necessário (com suporte a wildcard)';
-- ============================================
-- FUNCTION: criar_webhook
-- Cria uma integração de webhook
-- ============================================
CREATE OR REPLACE FUNCTION public.criar_webhook(
  p_condominio_id UUID,
  p_nome VARCHAR(100),
  p_url VARCHAR(500),
  p_eventos public.webhook_evento[],
  p_secret_key VARCHAR(64) DEFAULT NULL,
  p_criado_por UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_integracao_id UUID;
  v_webhook_config_id UUID;
  v_secret_key VARCHAR(64);
BEGIN
  -- Gerar secret key se não fornecida
  v_secret_key := COALESCE(p_secret_key, encode(gen_random_bytes(32), 'hex'));
  
  -- Criar integração
  INSERT INTO public.integracoes (
    condominio_id, nome, tipo, url_destino, secret_key, criado_por, status
  ) VALUES (
    p_condominio_id, p_nome, 'webhook_saida', p_url, v_secret_key, p_criado_por, 'ativa'
  )
  RETURNING id INTO v_integracao_id;
  
  -- Criar configuração de webhook
  INSERT INTO public.webhooks_config (
    integracao_id, eventos
  ) VALUES (
    v_integracao_id, p_eventos
  )
  RETURNING id INTO v_webhook_config_id;
  
  RETURN v_integracao_id;
END;
$$;
COMMENT ON FUNCTION public.criar_webhook IS 'Cria integração de webhook com configuração inicial';
-- ============================================
-- FUNCTION: disparar_webhook
-- Dispara evento para todos os webhooks inscritos
-- ============================================
CREATE OR REPLACE FUNCTION public.disparar_webhook(
  p_condominio_id UUID,
  p_evento public.webhook_evento,
  p_payload JSONB,
  p_recurso_tipo VARCHAR(50) DEFAULT NULL,
  p_recurso_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_webhook RECORD;
  v_event_id VARCHAR(64);
  v_count INTEGER := 0;
BEGIN
  -- Gerar Event ID único
  v_event_id := encode(gen_random_bytes(24), 'hex');
  
  -- Buscar webhooks inscritos para este evento
  FOR v_webhook IN
    SELECT wc.id AS config_id, i.id AS integracao_id, i.url_destino, i.secret_key
    FROM public.webhooks_config wc
    JOIN public.integracoes i ON i.id = wc.integracao_id
    WHERE i.condominio_id = p_condominio_id
      AND i.status = 'ativa'
      AND i.tipo = 'webhook_saida'
      AND wc.ativo = true
      AND p_evento = ANY(wc.eventos)
  LOOP
    -- Criar entrega pendente
    INSERT INTO public.webhooks_entregas (
      webhook_config_id, evento, event_id, payload,
      recurso_tipo, recurso_id, status, proxima_tentativa
    ) VALUES (
      v_webhook.config_id, p_evento, v_event_id || '_' || v_count, p_payload,
      p_recurso_tipo, p_recurso_id, 'pendente', NOW()
    );
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;
COMMENT ON FUNCTION public.disparar_webhook IS 'Cria entregas pendentes para todos os webhooks inscritos';
-- ============================================
-- FUNCTION: registrar_entrega_webhook
-- Registra resultado de tentativa de entrega
-- ============================================
CREATE OR REPLACE FUNCTION public.registrar_entrega_webhook(
  p_entrega_id UUID,
  p_status_code INTEGER,
  p_response_body TEXT DEFAULT NULL,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_erro_mensagem TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_entrega public.webhooks_entregas%ROWTYPE;
  v_novo_status public.webhook_entrega_status;
  v_proxima_tentativa TIMESTAMPTZ;
BEGIN
  -- Buscar entrega
  SELECT * INTO v_entrega FROM public.webhooks_entregas WHERE id = p_entrega_id;
  
  IF v_entrega.id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Determinar status baseado no código HTTP
  IF p_status_code >= 200 AND p_status_code < 300 THEN
    v_novo_status := 'sucesso';
    v_proxima_tentativa := NULL;
    
    -- Atualizar estatísticas de sucesso na integração
    UPDATE public.integracoes
    SET total_sucesso = total_sucesso + 1
    WHERE id = (
      SELECT integracao_id FROM public.webhooks_config WHERE id = v_entrega.webhook_config_id
    );
  ELSE
    -- Falhou, verificar se pode tentar novamente
    IF v_entrega.tentativa >= v_entrega.max_tentativas THEN
      v_novo_status := 'falhou';
      v_proxima_tentativa := NULL;
      
      -- Atualizar estatísticas de erro
      UPDATE public.integracoes
      SET total_erros = total_erros + 1
      WHERE id = (
        SELECT integracao_id FROM public.webhooks_config WHERE id = v_entrega.webhook_config_id
      );
    ELSE
      v_novo_status := 'pendente';
      -- Backoff exponencial (60s, 120s, 240s, 480s, 960s)
      v_proxima_tentativa := NOW() + (
        (60 * POWER(2, v_entrega.tentativa)) * INTERVAL '1 second'
      );
    END IF;
  END IF;
  
  -- Atualizar entrega
  UPDATE public.webhooks_entregas
  SET 
    tentativa = tentativa + 1,
    status = v_novo_status,
    status_code = p_status_code,
    response_body = LEFT(p_response_body, 10000), -- Limitar tamanho
    response_time_ms = p_response_time_ms,
    erro_mensagem = p_erro_mensagem,
    proxima_tentativa = v_proxima_tentativa,
    enviado_em = CASE WHEN v_novo_status = 'sucesso' THEN NOW() ELSE enviado_em END,
    entregue_em = CASE WHEN v_novo_status = 'sucesso' THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_entrega_id;
  
  RETURN TRUE;
END;
$$;
COMMENT ON FUNCTION public.registrar_entrega_webhook IS 'Registra resultado de tentativa de entrega de webhook';
-- ============================================
-- FUNCTION: gerar_assinatura_webhook
-- Gera assinatura HMAC-SHA256 para payload
-- ============================================
CREATE OR REPLACE FUNCTION public.gerar_assinatura_webhook(
  p_secret_key TEXT,
  p_payload TEXT,
  p_timestamp BIGINT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE
  v_timestamp BIGINT;
  v_message TEXT;
  v_signature TEXT;
BEGIN
  v_timestamp := COALESCE(p_timestamp, EXTRACT(EPOCH FROM NOW())::BIGINT);
  v_message := v_timestamp || '.' || p_payload;
  v_signature := encode(hmac(v_message::BYTEA, p_secret_key::BYTEA, 'sha256'), 'hex');
  
  RETURN 'v1=' || v_signature;
END;
$$;
COMMENT ON FUNCTION public.gerar_assinatura_webhook IS 'Gera assinatura HMAC-SHA256 para webhook';
-- ============================================
-- FUNCTION: log_api_request
-- Registra requisição à API
-- ============================================
CREATE OR REPLACE FUNCTION public.log_api_request(
  p_integracao_id UUID,
  p_metodo VARCHAR(10),
  p_path VARCHAR(500),
  p_status_code INTEGER,
  p_response_time_ms INTEGER,
  p_query_params JSONB DEFAULT NULL,
  p_erro_codigo VARCHAR(50) DEFAULT NULL,
  p_erro_mensagem TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.api_logs (
    integracao_id, metodo, path, query_params,
    status_code, response_time_ms,
    erro_codigo, erro_mensagem,
    ip_address, user_agent
  ) VALUES (
    p_integracao_id, p_metodo, p_path, p_query_params,
    p_status_code, p_response_time_ms,
    p_erro_codigo, p_erro_mensagem,
    p_ip_address, p_user_agent
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;
COMMENT ON FUNCTION public.log_api_request IS 'Registra requisição à API para auditoria';
-- ============================================
-- VIEW: v_integracoes_resumo
-- Resumo das integrações por condomínio
-- ============================================
CREATE OR REPLACE VIEW public.v_integracoes_resumo AS
SELECT 
  i.id,
  i.condominio_id,
  i.nome,
  i.tipo,
  i.ambiente,
  i.status,
  i.api_key_prefix,
  i.scopes,
  i.rate_limit_requests,
  i.rate_limit_usado,
  i.rate_limit_requests - i.rate_limit_usado AS rate_limit_restante,
  i.ultimo_uso,
  i.total_requests,
  i.total_sucesso,
  i.total_erros,
  CASE WHEN i.total_requests > 0 
    THEN ROUND((i.total_sucesso::DECIMAL / i.total_requests) * 100, 1)
    ELSE 100 
  END AS taxa_sucesso,
  i.created_at,
  
  -- Para webhooks
  (SELECT COUNT(*) FROM public.webhooks_config wc WHERE wc.integracao_id = i.id) AS total_webhooks,
  (SELECT array_agg(DISTINCT e) FROM public.webhooks_config wc, unnest(wc.eventos) e WHERE wc.integracao_id = i.id) AS eventos_webhook

FROM public.integracoes i;
COMMENT ON VIEW public.v_integracoes_resumo IS 'Resumo das integrações com estatísticas';
-- ============================================
-- VIEW: v_webhooks_pendentes
-- Webhooks pendentes para processamento
-- ============================================
CREATE OR REPLACE VIEW public.v_webhooks_pendentes AS
SELECT 
  we.id AS entrega_id,
  we.webhook_config_id,
  we.evento,
  we.event_id,
  we.payload,
  we.tentativa,
  we.max_tentativas,
  we.proxima_tentativa,
  i.url_destino,
  i.secret_key,
  wc.timeout_segundos,
  wc.headers_override

FROM public.webhooks_entregas we
JOIN public.webhooks_config wc ON wc.id = we.webhook_config_id
JOIN public.integracoes i ON i.id = wc.integracao_id
WHERE we.status = 'pendente'
  AND we.proxima_tentativa <= NOW()
  AND i.status = 'ativa'
  AND wc.ativo = true
ORDER BY we.proxima_tentativa ASC
LIMIT 100;
COMMENT ON VIEW public.v_webhooks_pendentes IS 'Webhooks prontos para processamento';
-- ============================================
-- VIEW: v_api_stats_diario
-- Estatísticas de API por dia
-- ============================================
CREATE OR REPLACE VIEW public.v_api_stats_diario AS
SELECT 
  i.condominio_id,
  i.id AS integracao_id,
  i.nome AS integracao_nome,
  DATE(al.created_at) AS data,
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE al.status_code >= 200 AND al.status_code < 300) AS sucesso,
  COUNT(*) FILTER (WHERE al.status_code >= 400) AS erros,
  ROUND(AVG(al.response_time_ms), 2) AS avg_response_time_ms,
  MAX(al.response_time_ms) AS max_response_time_ms

FROM public.api_logs al
JOIN public.integracoes i ON i.id = al.integracao_id
WHERE al.created_at >= NOW() - INTERVAL '30 days'
GROUP BY i.condominio_id, i.id, i.nome, DATE(al.created_at)
ORDER BY data DESC, total_requests DESC;
COMMENT ON VIEW public.v_api_stats_diario IS 'Estatísticas de uso da API por dia';
-- ============================================
-- RLS: integracoes
-- ============================================
ALTER TABLE public.integracoes ENABLE ROW LEVEL SECURITY;
-- SuperAdmin: tudo
CREATE POLICY "superadmin_integracoes_all" ON public.integracoes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'superadmin')
  );
-- Síndico: CRUD do próprio condomínio
CREATE POLICY "sindico_integracoes_all" ON public.integracoes
  FOR ALL USING (
    condominio_id IN (
      SELECT condominio_id FROM public.usuarios 
      WHERE id = auth.uid() AND role IN ('sindico', 'subsindico', 'admin_condo')
    )
  );
-- ============================================
-- RLS: webhooks_config
-- ============================================
ALTER TABLE public.webhooks_config ENABLE ROW LEVEL SECURITY;
-- SuperAdmin
CREATE POLICY "superadmin_webhooks_config_all" ON public.webhooks_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'superadmin')
  );
-- Síndico (via integração)
CREATE POLICY "sindico_webhooks_config_all" ON public.webhooks_config
  FOR ALL USING (
    integracao_id IN (
      SELECT i.id FROM public.integracoes i
      JOIN public.usuarios u ON u.condominio_id = i.condominio_id
      WHERE u.id = auth.uid() AND u.role IN ('sindico', 'subsindico', 'admin_condo')
    )
  );
-- ============================================
-- RLS: webhooks_entregas
-- ============================================
ALTER TABLE public.webhooks_entregas ENABLE ROW LEVEL SECURITY;
-- SuperAdmin
CREATE POLICY "superadmin_webhooks_entregas_all" ON public.webhooks_entregas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'superadmin')
  );
-- Síndico: leitura
CREATE POLICY "sindico_webhooks_entregas_read" ON public.webhooks_entregas
  FOR SELECT USING (
    webhook_config_id IN (
      SELECT wc.id FROM public.webhooks_config wc
      JOIN public.integracoes i ON i.id = wc.integracao_id
      JOIN public.usuarios u ON u.condominio_id = i.condominio_id
      WHERE u.id = auth.uid() AND u.role IN ('sindico', 'subsindico', 'admin_condo')
    )
  );
-- ============================================
-- RLS: conectores
-- ============================================
ALTER TABLE public.conectores ENABLE ROW LEVEL SECURITY;
-- SuperAdmin
CREATE POLICY "superadmin_conectores_all" ON public.conectores
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'superadmin')
  );
-- Síndico (via integração)
CREATE POLICY "sindico_conectores_all" ON public.conectores
  FOR ALL USING (
    integracao_id IN (
      SELECT i.id FROM public.integracoes i
      JOIN public.usuarios u ON u.condominio_id = i.condominio_id
      WHERE u.id = auth.uid() AND u.role IN ('sindico', 'subsindico', 'admin_condo')
    )
  );
-- ============================================
-- RLS: api_logs
-- ============================================
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;
-- SuperAdmin
CREATE POLICY "superadmin_api_logs_all" ON public.api_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'superadmin')
  );
-- Síndico: leitura
CREATE POLICY "sindico_api_logs_read" ON public.api_logs
  FOR SELECT USING (
    integracao_id IN (
      SELECT i.id FROM public.integracoes i
      JOIN public.usuarios u ON u.condominio_id = i.condominio_id
      WHERE u.id = auth.uid() AND u.role IN ('sindico', 'subsindico', 'admin_condo')
    )
  );
-- ============================================
-- RLS: api_scopes
-- ============================================
ALTER TABLE public.api_scopes ENABLE ROW LEVEL SECURITY;
-- Todos podem ler (referência)
CREATE POLICY "public_api_scopes_read" ON public.api_scopes
  FOR SELECT USING (ativo = true);
-- SuperAdmin pode gerenciar
CREATE POLICY "superadmin_api_scopes_all" ON public.api_scopes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'superadmin')
  );
-- ============================================
-- RLS: sync_logs
-- ============================================
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
-- SuperAdmin
CREATE POLICY "superadmin_sync_logs_all" ON public.sync_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'superadmin')
  );
-- Síndico: leitura
CREATE POLICY "sindico_sync_logs_read" ON public.sync_logs
  FOR SELECT USING (
    conector_id IN (
      SELECT c.id FROM public.conectores c
      JOIN public.integracoes i ON i.id = c.integracao_id
      JOIN public.usuarios u ON u.condominio_id = i.condominio_id
      WHERE u.id = auth.uid() AND u.role IN ('sindico', 'subsindico', 'admin_condo')
    )
  );
-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT ALL ON public.integracoes TO authenticated;
GRANT ALL ON public.webhooks_config TO authenticated;
GRANT ALL ON public.webhooks_entregas TO authenticated;
GRANT ALL ON public.conectores TO authenticated;
GRANT ALL ON public.api_logs TO authenticated;
GRANT ALL ON public.api_scopes TO authenticated;
GRANT ALL ON public.sync_logs TO authenticated;
GRANT SELECT ON public.v_integracoes_resumo TO authenticated;
GRANT SELECT ON public.v_webhooks_pendentes TO authenticated;
GRANT SELECT ON public.v_api_stats_diario TO authenticated;
-- ============================================
-- TRIGGERS: Auto-disparar webhooks
-- ============================================

-- Trigger para disparar webhook quando comunicado é publicado
CREATE OR REPLACE FUNCTION trigger_webhook_comunicado_publicado()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.publicado = true AND (OLD.publicado IS NULL OR OLD.publicado = false) THEN
    PERFORM public.disparar_webhook(
      NEW.condominio_id,
      'comunicado.publicado',
      jsonb_build_object(
        'id', NEW.id,
        'titulo', NEW.titulo,
        'tipo', NEW.tipo,
        'publicado_em', NOW()
      ),
      'comunicado',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;
-- Nota: Criar trigger similar para cada evento relevante
-- Exemplo: assembleia.criada, ocorrencia.criada, etc.


-- ============================================
-- FUNÇÃO: Limpar logs antigos (30 dias)
-- ============================================
CREATE OR REPLACE FUNCTION public.limpar_api_logs_antigos()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM public.api_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
COMMENT ON FUNCTION public.limpar_api_logs_antigos IS 'Remove logs de API com mais de 30 dias (executar via cron)';
-- ============================================
-- COMENTÁRIOS FINAIS
-- ============================================
COMMENT ON SCHEMA public IS 'Versix Norma - Sprint 8: Functions e RLS de Integrações adicionados';
