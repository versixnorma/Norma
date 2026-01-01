-- ============================================================
-- VERSIX NORMA - SPRINT 7: COMUNICAÇÃO MULTICANAL
-- Migration 015: Functions, Views e RLS
-- ============================================================

-- ============================================
-- VIEW: v_notificacao_stats
-- Estatísticas de notificação por canal
-- ============================================
CREATE OR REPLACE VIEW public.v_notificacao_stats AS
SELECT 
  n.id AS notificacao_id,
  n.condominio_id,
  n.tipo,
  n.prioridade,
  n.titulo,
  n.status,
  n.created_at,
  n.enviada_em,
  
  -- Total de destinatários
  n.total_destinatarios,
  
  -- Stats gerais
  n.stats_enviados,
  n.stats_entregues,
  n.stats_lidos,
  n.stats_falhas,
  
  -- Percentuais
  ROUND(
    CASE WHEN n.total_destinatarios > 0 
    THEN n.stats_lidos::DECIMAL / n.total_destinatarios * 100 
    ELSE 0 END, 1
  ) AS percentual_leitura,
  
  -- Breakdown por canal
  (SELECT COUNT(*) FROM public.notificacoes_entregas e 
   WHERE e.notificacao_id = n.id AND e.canal = 'push' AND e.status IN ('enviado', 'entregue', 'lido')) AS push_enviados,
  (SELECT COUNT(*) FROM public.notificacoes_entregas e 
   WHERE e.notificacao_id = n.id AND e.canal = 'email' AND e.status IN ('enviado', 'entregue', 'lido')) AS email_enviados,
  (SELECT COUNT(*) FROM public.notificacoes_entregas e 
   WHERE e.notificacao_id = n.id AND e.canal = 'whatsapp' AND e.status IN ('enviado', 'entregue', 'lido')) AS whatsapp_enviados,
  (SELECT COUNT(*) FROM public.notificacoes_entregas e 
   WHERE e.notificacao_id = n.id AND e.canal = 'sms' AND e.status IN ('enviado', 'entregue', 'lido')) AS sms_enviados,
  
  -- Lidos por canal
  (SELECT COUNT(*) FROM public.notificacoes_entregas e 
   WHERE e.notificacao_id = n.id AND e.canal = 'push' AND e.status = 'lido') AS push_lidos,
  (SELECT COUNT(*) FROM public.notificacoes_entregas e 
   WHERE e.notificacao_id = n.id AND e.canal = 'email' AND e.status = 'lido') AS email_lidos

FROM public.notificacoes n;
COMMENT ON VIEW public.v_notificacao_stats IS 'Estatísticas detalhadas de cada notificação';
-- ============================================
-- VIEW: v_usuario_notificacoes
-- Notificações do usuário com status de leitura
-- ============================================
CREATE OR REPLACE VIEW public.v_usuario_notificacoes AS
SELECT 
  n.id AS notificacao_id,
  n.condominio_id,
  n.tipo,
  n.prioridade,
  n.titulo,
  n.corpo_resumo,
  n.acao_url,
  n.referencia_tipo,
  n.referencia_id,
  n.created_at,
  
  e.usuario_id,
  e.canal,
  e.status,
  e.lida_em,
  
  -- Lida?
  (e.status = 'lido' OR l.id IS NOT NULL) AS lida

FROM public.notificacoes n
JOIN public.notificacoes_entregas e ON e.notificacao_id = n.id
LEFT JOIN public.notificacoes_leituras l ON l.notificacao_id = n.id AND l.usuario_id = e.usuario_id
WHERE n.status != 'cancelado';
COMMENT ON VIEW public.v_usuario_notificacoes IS 'Notificações de um usuário com status de leitura';
-- ============================================
-- VIEW: v_cotas_uso_mensal
-- Uso de cotas no mês atual
-- ============================================
CREATE OR REPLACE VIEW public.v_cotas_uso_mensal AS
SELECT 
  c.condominio_id,
  co.nome AS condominio_nome,
  c.mes_referencia,
  
  -- Uso
  c.uso_push,
  c.uso_email,
  c.uso_whatsapp,
  c.uso_sms,
  c.uso_voz_minutos,
  
  -- Limites (da config)
  cfg.limite_push_mensal,
  cfg.limite_email_mensal,
  cfg.creditos_whatsapp AS limite_whatsapp,
  cfg.creditos_sms AS limite_sms,
  cfg.creditos_voz_minutos AS limite_voz,
  
  -- Percentual de uso
  CASE WHEN cfg.limite_push_mensal > 0 
    THEN ROUND(c.uso_push::DECIMAL / cfg.limite_push_mensal * 100, 1) 
    ELSE 0 END AS pct_push,
  CASE WHEN cfg.limite_email_mensal > 0 
    THEN ROUND(c.uso_email::DECIMAL / cfg.limite_email_mensal * 100, 1) 
    ELSE 0 END AS pct_email,
  CASE WHEN cfg.creditos_whatsapp > 0 
    THEN ROUND(c.uso_whatsapp::DECIMAL / cfg.creditos_whatsapp * 100, 1) 
    ELSE 0 END AS pct_whatsapp,
  CASE WHEN cfg.creditos_sms > 0 
    THEN ROUND(c.uso_sms::DECIMAL / cfg.creditos_sms * 100, 1) 
    ELSE 0 END AS pct_sms,
  
  -- Custos
  c.custo_total_centavos,
  c.custo_whatsapp_centavos,
  c.custo_sms_centavos,
  c.custo_voz_centavos

FROM public.cotas_comunicacao c
JOIN public.condominios co ON co.id = c.condominio_id
LEFT JOIN public.notificacoes_config cfg ON cfg.condominio_id = c.condominio_id
WHERE c.mes_referencia = DATE_TRUNC('month', CURRENT_DATE)::DATE;
COMMENT ON VIEW public.v_cotas_uso_mensal IS 'Uso de cotas no mês atual por condomínio';
-- ============================================
-- FUNCTION: enviar_notificacao
-- Cria notificação e entregas para destinatários
-- ============================================
CREATE OR REPLACE FUNCTION public.enviar_notificacao(
  p_condominio_id UUID,
  p_tipo public.tipo_notificacao,
  p_titulo VARCHAR(255),
  p_corpo TEXT,
  p_prioridade public.prioridade_comunicado DEFAULT 'normal',
  p_destinatarios_tipo VARCHAR(50) DEFAULT 'todos',
  p_destinatarios_filtro JSONB DEFAULT NULL,
  p_referencia_tipo VARCHAR(50) DEFAULT NULL,
  p_referencia_id UUID DEFAULT NULL,
  p_acao_url VARCHAR(500) DEFAULT NULL,
  p_gerar_mural BOOLEAN DEFAULT FALSE,
  p_agendada_para TIMESTAMPTZ DEFAULT NULL,
  p_criado_por UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_notificacao_id UUID;
  v_config public.notificacoes_config%ROWTYPE;
  v_destinatario RECORD;
  v_total INTEGER := 0;
  v_canais_enviar public.canal_notificacao[];
BEGIN
  -- Buscar config do condomínio
  SELECT * INTO v_config 
  FROM public.notificacoes_config 
  WHERE condominio_id = p_condominio_id;
  
  -- Se não existe config, criar uma padrão
  IF v_config.id IS NULL THEN
    INSERT INTO public.notificacoes_config (condominio_id)
    VALUES (p_condominio_id)
    RETURNING * INTO v_config;
  END IF;
  
  -- Criar notificação
  INSERT INTO public.notificacoes (
    condominio_id, tipo, titulo, corpo, 
    corpo_resumo, prioridade, destinatarios_tipo,
    destinatarios_filtro, referencia_tipo, referencia_id,
    acao_url, gerar_mural, agendada_para, criado_por,
    status
  ) VALUES (
    p_condominio_id, p_tipo, p_titulo, p_corpo,
    LEFT(p_corpo, 200), p_prioridade, p_destinatarios_tipo,
    p_destinatarios_filtro, p_referencia_tipo, p_referencia_id,
    p_acao_url, p_gerar_mural, p_agendada_para, p_criado_por,
    CASE WHEN p_agendada_para IS NOT NULL THEN 'agendado' ELSE 'pendente' END
  )
  RETURNING id INTO v_notificacao_id;
  
  -- Determinar canais a usar baseado na prioridade e config
  v_canais_enviar := ARRAY[]::public.canal_notificacao[];
  
  IF v_config.in_app_habilitado THEN
    v_canais_enviar := array_append(v_canais_enviar, 'in_app'::public.canal_notificacao);
  END IF;
  
  IF v_config.push_habilitado THEN
    v_canais_enviar := array_append(v_canais_enviar, 'push'::public.canal_notificacao);
  END IF;
  
  -- Email para prioridade normal+
  IF v_config.email_habilitado AND p_prioridade IN ('normal', 'alta', 'critica') THEN
    v_canais_enviar := array_append(v_canais_enviar, 'email'::public.canal_notificacao);
  END IF;
  
  -- WhatsApp/SMS/Voz para prioridade alta+
  IF p_prioridade IN ('alta', 'critica') THEN
    IF v_config.whatsapp_habilitado THEN
      v_canais_enviar := array_append(v_canais_enviar, 'whatsapp'::public.canal_notificacao);
    END IF;
  END IF;
  
  -- SMS e Voz apenas para emergência
  IF p_prioridade = 'critica' THEN
    IF v_config.sms_habilitado THEN
      v_canais_enviar := array_append(v_canais_enviar, 'sms'::public.canal_notificacao);
    END IF;
    IF v_config.voz_habilitado THEN
      v_canais_enviar := array_append(v_canais_enviar, 'voz'::public.canal_notificacao);
    END IF;
  END IF;
  
  -- Buscar e criar entregas para cada destinatário
  FOR v_destinatario IN
    SELECT u.id AS usuario_id
    FROM public.usuarios u
    WHERE u.condominio_id = p_condominio_id
      AND u.status = 'active'
      AND u.deleted_at IS NULL
      AND (
        p_destinatarios_tipo = 'todos'
        OR (p_destinatarios_tipo = 'bloco' AND EXISTS (
          SELECT 1 FROM public.unidades_habitacionais uh 
          WHERE uh.id = u.unidade_id 
            AND uh.bloco_id IN (
              SELECT b.id FROM public.blocos b 
              WHERE b.nome = (p_destinatarios_filtro->>'bloco')
            )
        ))
        OR (p_destinatarios_tipo = 'roles' AND u.role = ANY(
          SELECT jsonb_array_elements_text(p_destinatarios_filtro->'roles')::public.user_role
        ))
        OR (p_destinatarios_tipo = 'lista' AND u.id = ANY(
          SELECT (jsonb_array_elements_text(p_destinatarios_filtro->'usuarios'))::UUID
        ))
      )
  LOOP
    v_total := v_total + 1;
    
    -- Criar entrega para cada canal habilitado
    DECLARE
      v_canal public.canal_notificacao;
    BEGIN
      FOREACH v_canal IN ARRAY v_canais_enviar
      LOOP
        -- Verificar preferência do usuário
        IF EXISTS (
          SELECT 1 FROM public.usuarios_canais_preferencias pref
          WHERE pref.usuario_id = v_destinatario.usuario_id
            AND (
              (v_canal = 'push' AND pref.push_habilitado) OR
              (v_canal = 'email' AND pref.email_habilitado) OR
              (v_canal = 'in_app' AND pref.in_app_habilitado) OR
              (v_canal = 'whatsapp' AND pref.whatsapp_habilitado) OR
              (v_canal = 'sms' AND pref.sms_habilitado) OR
              (v_canal = 'voz' AND pref.voz_habilitado) OR
              p_prioridade = 'critica' -- Emergência ignora preferências
            )
        ) OR NOT EXISTS (
          SELECT 1 FROM public.usuarios_canais_preferencias WHERE usuario_id = v_destinatario.usuario_id
        ) THEN
          INSERT INTO public.notificacoes_entregas (
            notificacao_id, usuario_id, canal, status, agendada_para
          ) VALUES (
            v_notificacao_id, v_destinatario.usuario_id, v_canal, 
            CASE WHEN p_agendada_para IS NOT NULL THEN 'agendado' ELSE 'pendente' END,
            p_agendada_para
          )
          ON CONFLICT (notificacao_id, usuario_id, canal) DO NOTHING;
        END IF;
      END LOOP;
    END;
  END LOOP;
  
  -- Atualizar total de destinatários
  UPDATE public.notificacoes
  SET total_destinatarios = v_total
  WHERE id = v_notificacao_id;
  
  RETURN v_notificacao_id;
END;
$$;
COMMENT ON FUNCTION public.enviar_notificacao IS 'Cria notificação e entregas para os destinatários filtrados';
-- ============================================
-- FUNCTION: confirmar_leitura
-- Confirma leitura de uma notificação
-- ============================================
CREATE OR REPLACE FUNCTION public.confirmar_leitura(
  p_notificacao_id UUID,
  p_usuario_id UUID,
  p_canal public.canal_notificacao,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Registrar leitura
  INSERT INTO public.notificacoes_leituras (
    notificacao_id, usuario_id, canal, ip_address, user_agent
  ) VALUES (
    p_notificacao_id, p_usuario_id, p_canal, p_ip_address, p_user_agent
  )
  ON CONFLICT (notificacao_id, usuario_id) DO NOTHING;
  
  -- Atualizar entrega
  UPDATE public.notificacoes_entregas
  SET 
    status = 'lido',
    lida_em = NOW(),
    updated_at = NOW()
  WHERE notificacao_id = p_notificacao_id 
    AND usuario_id = p_usuario_id
    AND status != 'lido';
  
  RETURN TRUE;
END;
$$;
COMMENT ON FUNCTION public.confirmar_leitura IS 'Confirma leitura de uma notificação pelo usuário';
-- ============================================
-- FUNCTION: registrar_entrega
-- Registra resultado de envio (callback do provider)
-- ============================================
CREATE OR REPLACE FUNCTION public.registrar_entrega(
  p_entrega_id UUID,
  p_status public.status_entrega,
  p_provider_id VARCHAR(255) DEFAULT NULL,
  p_provider_response JSONB DEFAULT NULL,
  p_erro_codigo VARCHAR(50) DEFAULT NULL,
  p_erro_mensagem TEXT DEFAULT NULL,
  p_custo_centavos INTEGER DEFAULT 0
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_entrega public.notificacoes_entregas%ROWTYPE;
  v_notificacao public.notificacoes%ROWTYPE;
BEGIN
  -- Buscar entrega
  SELECT * INTO v_entrega FROM public.notificacoes_entregas WHERE id = p_entrega_id;
  IF v_entrega.id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Atualizar entrega
  UPDATE public.notificacoes_entregas
  SET 
    status = p_status,
    provider_id = COALESCE(p_provider_id, provider_id),
    provider_response = COALESCE(p_provider_response, provider_response),
    erro_codigo = p_erro_codigo,
    erro_mensagem = p_erro_mensagem,
    custo_centavos = p_custo_centavos,
    enviada_em = CASE WHEN p_status IN ('enviado', 'entregue') THEN COALESCE(enviada_em, NOW()) ELSE enviada_em END,
    entregue_em = CASE WHEN p_status = 'entregue' THEN NOW() ELSE entregue_em END,
    falhou_em = CASE WHEN p_status = 'falhou' THEN NOW() ELSE falhou_em END,
    tentativas = tentativas + 1,
    updated_at = NOW()
  WHERE id = p_entrega_id;
  
  -- Se falhou e tem mais tentativas, reagendar
  IF p_status = 'falhou' AND v_entrega.tentativas < v_entrega.max_tentativas THEN
    UPDATE public.notificacoes_entregas
    SET 
      status = 'pendente',
      proxima_tentativa = NOW() + INTERVAL '5 minutes' * POWER(2, v_entrega.tentativas) -- Backoff exponencial
    WHERE id = p_entrega_id;
  END IF;
  
  -- Registrar uso de cota
  IF p_status IN ('enviado', 'entregue') THEN
    SELECT * INTO v_notificacao 
    FROM public.notificacoes 
    WHERE id = v_entrega.notificacao_id;
    
    INSERT INTO public.cotas_comunicacao (condominio_id, mes_referencia)
    VALUES (v_notificacao.condominio_id, DATE_TRUNC('month', CURRENT_DATE)::DATE)
    ON CONFLICT (condominio_id, mes_referencia) DO UPDATE SET
      uso_push = cotas_comunicacao.uso_push + CASE WHEN v_entrega.canal = 'push' THEN 1 ELSE 0 END,
      uso_email = cotas_comunicacao.uso_email + CASE WHEN v_entrega.canal = 'email' THEN 1 ELSE 0 END,
      uso_in_app = cotas_comunicacao.uso_in_app + CASE WHEN v_entrega.canal = 'in_app' THEN 1 ELSE 0 END,
      uso_whatsapp = cotas_comunicacao.uso_whatsapp + CASE WHEN v_entrega.canal = 'whatsapp' THEN 1 ELSE 0 END,
      uso_sms = cotas_comunicacao.uso_sms + CASE WHEN v_entrega.canal = 'sms' THEN 1 ELSE 0 END,
      custo_whatsapp_centavos = cotas_comunicacao.custo_whatsapp_centavos + 
        CASE WHEN v_entrega.canal = 'whatsapp' THEN p_custo_centavos ELSE 0 END,
      custo_sms_centavos = cotas_comunicacao.custo_sms_centavos + 
        CASE WHEN v_entrega.canal = 'sms' THEN p_custo_centavos ELSE 0 END,
      custo_voz_centavos = cotas_comunicacao.custo_voz_centavos + 
        CASE WHEN v_entrega.canal = 'voz' THEN p_custo_centavos ELSE 0 END,
      custo_total_centavos = cotas_comunicacao.custo_total_centavos + p_custo_centavos,
      updated_at = NOW();
  END IF;
  
  RETURN TRUE;
END;
$$;
COMMENT ON FUNCTION public.registrar_entrega IS 'Registra resultado de envio e atualiza cotas';
-- ============================================
-- FUNCTION: disparar_emergencia
-- Dispara notificação de emergência para todos
-- ============================================
CREATE OR REPLACE FUNCTION public.disparar_emergencia(
  p_condominio_id UUID,
  p_tipo VARCHAR(100),
  p_titulo VARCHAR(255),
  p_corpo TEXT,
  p_disparado_por UUID
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_notificacao_id UUID;
  v_config public.notificacoes_config%ROWTYPE;
  v_start_time TIMESTAMPTZ;
  v_total_destinatarios INTEGER;
BEGIN
  v_start_time := clock_timestamp();
  
  -- Buscar config
  SELECT * INTO v_config 
  FROM public.notificacoes_config 
  WHERE condominio_id = p_condominio_id;
  
  -- Criar notificação de emergência
  v_notificacao_id := public.enviar_notificacao(
    p_condominio_id := p_condominio_id,
    p_tipo := 'emergencia',
    p_titulo := p_titulo,
    p_corpo := p_corpo,
    p_prioridade := 'critica',
    p_destinatarios_tipo := 'todos',
    p_criado_por := p_disparado_por
  );
  
  -- Contar destinatários
  SELECT total_destinatarios INTO v_total_destinatarios
  FROM public.notificacoes WHERE id = v_notificacao_id;
  
  -- Registrar log de emergência
  INSERT INTO public.emergencias_log (
    condominio_id, notificacao_id, tipo,
    disparado_por, disparado_por_nome,
    total_destinatarios,
    tempo_primeiro_envio_ms
  )
  SELECT 
    p_condominio_id, v_notificacao_id, p_tipo,
    p_disparado_por, u.nome,
    v_total_destinatarios,
    EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INTEGER
  FROM public.usuarios u
  WHERE u.id = p_disparado_por;
  
  RETURN v_notificacao_id;
END;
$$;
COMMENT ON FUNCTION public.disparar_emergencia IS 'Dispara notificação de emergência em todos os canais';
-- ============================================
-- FUNCTION: obter_notificacoes_usuario
-- Busca notificações de um usuário
-- ============================================
CREATE OR REPLACE FUNCTION public.obter_notificacoes_usuario(
  p_usuario_id UUID,
  p_limite INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_apenas_nao_lidas BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  notificacao_id UUID,
  tipo public.tipo_notificacao,
  prioridade public.prioridade_comunicado,
  titulo VARCHAR(255),
  corpo_resumo VARCHAR(200),
  acao_url VARCHAR(500),
  referencia_tipo VARCHAR(50),
  referencia_id UUID,
  lida BOOLEAN,
  lida_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id AS notificacao_id,
    n.tipo,
    n.prioridade,
    n.titulo,
    n.corpo_resumo,
    n.acao_url,
    n.referencia_tipo,
    n.referencia_id,
    (e.status = 'lido' OR l.id IS NOT NULL) AS lida,
    COALESCE(l.lida_em, e.lida_em) AS lida_em,
    n.created_at
  FROM public.notificacoes n
  JOIN public.notificacoes_entregas e ON e.notificacao_id = n.id AND e.usuario_id = p_usuario_id
  LEFT JOIN public.notificacoes_leituras l ON l.notificacao_id = n.id AND l.usuario_id = p_usuario_id
  WHERE n.status NOT IN ('cancelado', 'pendente')
    AND (NOT p_apenas_nao_lidas OR (e.status != 'lido' AND l.id IS NULL))
  ORDER BY n.created_at DESC
  LIMIT p_limite
  OFFSET p_offset;
END;
$$;
COMMENT ON FUNCTION public.obter_notificacoes_usuario IS 'Busca notificações de um usuário com paginação';
-- ============================================
-- FUNCTION: contar_nao_lidas
-- Conta notificações não lidas de um usuário
-- ============================================
CREATE OR REPLACE FUNCTION public.contar_nao_lidas(p_usuario_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.notificacoes n
  JOIN public.notificacoes_entregas e ON e.notificacao_id = n.id AND e.usuario_id = p_usuario_id
  LEFT JOIN public.notificacoes_leituras l ON l.notificacao_id = n.id AND l.usuario_id = p_usuario_id
  WHERE n.status NOT IN ('cancelado', 'pendente')
    AND e.status != 'lido'
    AND l.id IS NULL;
  
  RETURN v_count;
END;
$$;
COMMENT ON FUNCTION public.contar_nao_lidas IS 'Conta notificações não lidas de um usuário';
-- ============================================
-- FUNCTION: marcar_todas_lidas
-- Marca todas as notificações como lidas
-- ============================================
CREATE OR REPLACE FUNCTION public.marcar_todas_lidas(p_usuario_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Inserir leituras
  INSERT INTO public.notificacoes_leituras (notificacao_id, usuario_id, canal)
  SELECT e.notificacao_id, p_usuario_id, 'in_app'
  FROM public.notificacoes_entregas e
  LEFT JOIN public.notificacoes_leituras l ON l.notificacao_id = e.notificacao_id AND l.usuario_id = p_usuario_id
  WHERE e.usuario_id = p_usuario_id
    AND e.status != 'lido'
    AND l.id IS NULL
  ON CONFLICT (notificacao_id, usuario_id) DO NOTHING;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Atualizar entregas
  UPDATE public.notificacoes_entregas
  SET status = 'lido', lida_em = NOW(), updated_at = NOW()
  WHERE usuario_id = p_usuario_id AND status != 'lido';
  
  RETURN v_count;
END;
$$;
COMMENT ON FUNCTION public.marcar_todas_lidas IS 'Marca todas as notificações do usuário como lidas';
-- ============================================
-- FUNCTION: registrar_push_token
-- Registra token de push notification
-- ============================================
CREATE OR REPLACE FUNCTION public.registrar_push_token(
  p_usuario_id UUID,
  p_token VARCHAR(500),
  p_device_type VARCHAR(50) DEFAULT 'unknown',
  p_device_name VARCHAR(255) DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tokens JSONB;
  v_new_token JSONB;
BEGIN
  v_new_token := jsonb_build_object(
    'token', p_token,
    'device_type', p_device_type,
    'device_name', p_device_name,
    'created_at', NOW(),
    'last_used', NOW()
  );
  
  -- Buscar tokens existentes
  SELECT COALESCE(push_tokens, '[]'::JSONB) INTO v_tokens
  FROM public.usuarios_canais_preferencias
  WHERE usuario_id = p_usuario_id;
  
  -- Se não existe registro, criar
  IF v_tokens IS NULL THEN
    INSERT INTO public.usuarios_canais_preferencias (usuario_id, push_tokens)
    VALUES (p_usuario_id, jsonb_build_array(v_new_token))
    ON CONFLICT (usuario_id) DO UPDATE SET
      push_tokens = jsonb_build_array(v_new_token),
      updated_at = NOW();
  ELSE
    -- Remover token antigo se existir
    v_tokens := (
      SELECT COALESCE(jsonb_agg(t), '[]'::JSONB)
      FROM jsonb_array_elements(v_tokens) AS t
      WHERE t->>'token' != p_token
    );
    
    -- Adicionar novo token
    v_tokens := v_tokens || jsonb_build_array(v_new_token);
    
    -- Manter apenas os últimos 5 tokens
    IF jsonb_array_length(v_tokens) > 5 THEN
      v_tokens := (
        SELECT jsonb_agg(t)
        FROM (
          SELECT t FROM jsonb_array_elements(v_tokens) AS t
          ORDER BY (t->>'last_used')::TIMESTAMPTZ DESC
          LIMIT 5
        ) sub
      );
    END IF;
    
    UPDATE public.usuarios_canais_preferencias
    SET push_tokens = v_tokens, updated_at = NOW()
    WHERE usuario_id = p_usuario_id;
  END IF;
  
  RETURN TRUE;
END;
$$;
COMMENT ON FUNCTION public.registrar_push_token IS 'Registra token de push notification para um dispositivo';
-- ============================================
-- RLS: notificacoes_config
-- ============================================
ALTER TABLE public.notificacoes_config ENABLE ROW LEVEL SECURITY;
-- SuperAdmin: tudo
CREATE POLICY "superadmin_config_all" ON public.notificacoes_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'superadmin')
  );
-- Síndico: CRUD do próprio condomínio
CREATE POLICY "sindico_config_all" ON public.notificacoes_config
  FOR ALL USING (
    condominio_id IN (
      SELECT condominio_id FROM public.usuarios 
      WHERE id = auth.uid() AND role IN ('sindico', 'subsindico', 'admin_condo')
    )
  );
-- ============================================
-- RLS: usuarios_canais_preferencias
-- ============================================
ALTER TABLE public.usuarios_canais_preferencias ENABLE ROW LEVEL SECURITY;
-- SuperAdmin
CREATE POLICY "superadmin_preferencias_all" ON public.usuarios_canais_preferencias
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'superadmin')
  );
-- Próprio usuário
CREATE POLICY "usuario_preferencias_own" ON public.usuarios_canais_preferencias
  FOR ALL USING (usuario_id = auth.uid());
-- ============================================
-- RLS: templates_notificacao
-- ============================================
ALTER TABLE public.templates_notificacao ENABLE ROW LEVEL SECURITY;
-- SuperAdmin
CREATE POLICY "superadmin_templates_all" ON public.templates_notificacao
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'superadmin')
  );
-- Síndico: leitura de templates globais e próprios
CREATE POLICY "sindico_templates_read" ON public.templates_notificacao
  FOR SELECT USING (
    condominio_id IS NULL OR
    condominio_id IN (
      SELECT condominio_id FROM public.usuarios 
      WHERE id = auth.uid() AND role IN ('sindico', 'subsindico', 'admin_condo')
    )
  );
-- ============================================
-- RLS: notificacoes
-- ============================================
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
-- SuperAdmin
CREATE POLICY "superadmin_notificacoes_all" ON public.notificacoes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'superadmin')
  );
-- Síndico: CRUD do próprio condomínio
CREATE POLICY "sindico_notificacoes_all" ON public.notificacoes
  FOR ALL USING (
    condominio_id IN (
      SELECT condominio_id FROM public.usuarios 
      WHERE id = auth.uid() AND role IN ('sindico', 'subsindico', 'admin_condo')
    )
  );
-- Moradores: leitura das próprias notificações
CREATE POLICY "morador_notificacoes_read" ON public.notificacoes
  FOR SELECT USING (
    id IN (
      SELECT notificacao_id FROM public.notificacoes_entregas 
      WHERE usuario_id = auth.uid()
    )
  );
-- ============================================
-- RLS: notificacoes_entregas
-- ============================================
ALTER TABLE public.notificacoes_entregas ENABLE ROW LEVEL SECURITY;
-- SuperAdmin
CREATE POLICY "superadmin_entregas_all" ON public.notificacoes_entregas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'superadmin')
  );
-- Síndico: leitura do próprio condomínio
CREATE POLICY "sindico_entregas_read" ON public.notificacoes_entregas
  FOR SELECT USING (
    notificacao_id IN (
      SELECT n.id FROM public.notificacoes n
      JOIN public.usuarios u ON u.condominio_id = n.condominio_id
      WHERE u.id = auth.uid() AND u.role IN ('sindico', 'subsindico', 'admin_condo')
    )
  );
-- Usuário: próprias entregas
CREATE POLICY "usuario_entregas_own" ON public.notificacoes_entregas
  FOR SELECT USING (usuario_id = auth.uid());
-- ============================================
-- RLS: notificacoes_leituras
-- ============================================
ALTER TABLE public.notificacoes_leituras ENABLE ROW LEVEL SECURITY;
-- SuperAdmin
CREATE POLICY "superadmin_leituras_all" ON public.notificacoes_leituras
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'superadmin')
  );
-- Síndico: leitura do próprio condomínio
CREATE POLICY "sindico_leituras_read" ON public.notificacoes_leituras
  FOR SELECT USING (
    notificacao_id IN (
      SELECT n.id FROM public.notificacoes n
      JOIN public.usuarios u ON u.condominio_id = n.condominio_id
      WHERE u.id = auth.uid() AND u.role IN ('sindico', 'subsindico', 'admin_condo')
    )
  );
-- Usuário: inserir própria leitura
CREATE POLICY "usuario_leituras_insert" ON public.notificacoes_leituras
  FOR INSERT WITH CHECK (usuario_id = auth.uid());
-- ============================================
-- RLS: cotas_comunicacao
-- ============================================
ALTER TABLE public.cotas_comunicacao ENABLE ROW LEVEL SECURITY;
-- SuperAdmin
CREATE POLICY "superadmin_cotas_all" ON public.cotas_comunicacao
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'superadmin')
  );
-- Síndico: leitura do próprio condomínio
CREATE POLICY "sindico_cotas_read" ON public.cotas_comunicacao
  FOR SELECT USING (
    condominio_id IN (
      SELECT condominio_id FROM public.usuarios 
      WHERE id = auth.uid() AND role IN ('sindico', 'subsindico', 'admin_condo')
    )
  );
-- ============================================
-- RLS: webhooks_notificacao
-- ============================================
ALTER TABLE public.webhooks_notificacao ENABLE ROW LEVEL SECURITY;
-- SuperAdmin
CREATE POLICY "superadmin_webhooks_all" ON public.webhooks_notificacao
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'superadmin')
  );
-- Síndico: CRUD do próprio condomínio
CREATE POLICY "sindico_webhooks_all" ON public.webhooks_notificacao
  FOR ALL USING (
    condominio_id IN (
      SELECT condominio_id FROM public.usuarios 
      WHERE id = auth.uid() AND role IN ('sindico', 'subsindico', 'admin_condo')
    )
  );
-- ============================================
-- RLS: notificacoes_fila
-- ============================================
ALTER TABLE public.notificacoes_fila ENABLE ROW LEVEL SECURITY;
-- Apenas SuperAdmin (sistema interno)
CREATE POLICY "superadmin_fila_all" ON public.notificacoes_fila
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'superadmin')
  );
-- ============================================
-- RLS: emergencias_log
-- ============================================
ALTER TABLE public.emergencias_log ENABLE ROW LEVEL SECURITY;
-- SuperAdmin
CREATE POLICY "superadmin_emergencias_all" ON public.emergencias_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'superadmin')
  );
-- Síndico: leitura do próprio condomínio
CREATE POLICY "sindico_emergencias_read" ON public.emergencias_log
  FOR SELECT USING (
    condominio_id IN (
      SELECT condominio_id FROM public.usuarios 
      WHERE id = auth.uid() AND role IN ('sindico', 'subsindico', 'admin_condo')
    )
  );
-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT ALL ON public.notificacoes_config TO authenticated;
GRANT ALL ON public.usuarios_canais_preferencias TO authenticated;
GRANT ALL ON public.templates_notificacao TO authenticated;
GRANT ALL ON public.notificacoes TO authenticated;
GRANT ALL ON public.notificacoes_entregas TO authenticated;
GRANT ALL ON public.notificacoes_leituras TO authenticated;
GRANT ALL ON public.cotas_comunicacao TO authenticated;
GRANT ALL ON public.webhooks_notificacao TO authenticated;
GRANT ALL ON public.notificacoes_fila TO authenticated;
GRANT ALL ON public.emergencias_log TO authenticated;
GRANT SELECT ON public.v_notificacao_stats TO authenticated;
GRANT SELECT ON public.v_usuario_notificacoes TO authenticated;
GRANT SELECT ON public.v_cotas_uso_mensal TO authenticated;
-- ============================================
-- INSERIR TEMPLATES PADRÃO
-- ============================================
INSERT INTO public.templates_notificacao (codigo, nome, tipo, canal, assunto, corpo) VALUES
-- Comunicado geral
('comunicado_novo', 'Novo Comunicado', 'comunicado', 'push', NULL, '{{titulo}}'),
('comunicado_novo', 'Novo Comunicado', 'comunicado', 'email', 'Novo comunicado: {{titulo}}', 
 '<h2>{{titulo}}</h2><p>{{corpo}}</p><p><a href="{{acao_url}}">Ver comunicado completo</a></p>'),
('comunicado_novo', 'Novo Comunicado', 'comunicado', 'in_app', NULL, '{{titulo}}'),

-- Assembleia
('assembleia_convocacao', 'Convocação de Assembleia', 'assembleia', 'push', NULL, 'Assembleia {{tipo}}: {{titulo}}'),
('assembleia_convocacao', 'Convocação de Assembleia', 'assembleia', 'email', 
 'CONVOCAÇÃO: {{tipo}} - {{titulo}}', 
 '<h2>Convocação de Assembleia</h2><p><strong>{{tipo}}</strong>: {{titulo}}</p><p>Data: {{data}}</p><p>{{corpo}}</p>'),

-- Ocorrência
('ocorrencia_status', 'Status de Ocorrência', 'ocorrencia', 'push', NULL, 'Ocorrência #{{numero}}: {{status}}'),
('ocorrencia_status', 'Status de Ocorrência', 'ocorrencia', 'email', 
 'Ocorrência #{{numero}} - {{status}}', 
 '<p>Sua ocorrência <strong>#{{numero}}</strong> foi atualizada para: <strong>{{status}}</strong></p><p>{{mensagem}}</p>'),

-- Chamado
('chamado_resposta', 'Resposta de Chamado', 'chamado', 'push', NULL, 'Chamado #{{numero}}: Nova resposta'),
('chamado_resposta', 'Resposta de Chamado', 'chamado', 'email', 
 'Chamado #{{numero}} - Nova resposta', 
 '<p>Seu chamado <strong>#{{numero}}</strong> recebeu uma nova resposta.</p><p>{{mensagem}}</p>'),

-- Cobrança
('cobranca_vencimento', 'Lembrete de Vencimento', 'cobranca', 'push', NULL, 'Boleto vence em {{dias}} dias - R$ {{valor}}'),
('cobranca_vencimento', 'Lembrete de Vencimento', 'cobranca', 'email', 
 'Lembrete: Boleto vence em {{dias}} dias', 
 '<p>Seu boleto no valor de <strong>R$ {{valor}}</strong> vence em <strong>{{dias}} dias</strong>.</p><p><a href="{{boleto_url}}">Acessar boleto</a></p>'),

-- Emergência
('emergencia_geral', 'EMERGÊNCIA', 'emergencia', 'push', NULL, '🚨 EMERGÊNCIA: {{titulo}}'),
('emergencia_geral', 'EMERGÊNCIA', 'emergencia', 'email', 
 '🚨 EMERGÊNCIA: {{titulo}}', 
 '<h1 style="color:red">🚨 EMERGÊNCIA</h1><h2>{{titulo}}</h2><p>{{corpo}}</p>'),
('emergencia_geral', 'EMERGÊNCIA', 'emergencia', 'sms', NULL, 'EMERGÊNCIA {{condominio}}: {{titulo}} - {{corpo}}'),
('emergencia_geral', 'EMERGÊNCIA', 'emergencia', 'voz', NULL, 'Atenção! Emergência no {{condominio}}. {{titulo}}. {{corpo}}. Repito: {{titulo}}.')
ON CONFLICT (condominio_id, codigo, canal) DO NOTHING;
-- ============================================
-- COMENTÁRIOS FINAIS
-- ============================================
COMMENT ON SCHEMA public IS 'Versix Norma - Sprint 7: Functions e RLS de Comunicação adicionados';
