-- ============================================================
-- VERSIX NORMA - SPRINT 6: ASSEMBLEIAS DIGITAIS
-- Migration 013: Functions, Views e RLS
-- ============================================================

-- ============================================
-- VIEW: v_assembleia_quorum
-- Quórum em tempo real
-- ============================================
CREATE OR REPLACE VIEW public.v_assembleia_quorum AS
SELECT 
  a.id AS assembleia_id,
  a.condominio_id,
  a.status,
  a.quorum_minimo_primeira,
  a.quorum_minimo_segunda,
  
  -- Totais do condomínio
  (SELECT COUNT(*) FROM public.unidades_habitacionais 
   WHERE condominio_id = a.condominio_id AND ativo = true) AS total_unidades,
  (SELECT COALESCE(SUM(fracao_ideal), 0) FROM public.unidades_habitacionais 
   WHERE condominio_id = a.condominio_id AND ativo = true) AS total_fracao,
  
  -- Presentes
  COUNT(DISTINCT p.unidade_id) AS unidades_presentes,
  COALESCE(SUM(p.fracao_ideal), 0) AS fracao_presente,
  
  -- Percentuais
  ROUND(
    COALESCE(SUM(p.fracao_ideal), 0) * 100 / 
    NULLIF((SELECT COALESCE(SUM(fracao_ideal), 1) FROM public.unidades_habitacionais 
            WHERE condominio_id = a.condominio_id AND ativo = true), 0),
    2
  ) AS quorum_percentual,
  
  -- Status do quórum
  CASE
    WHEN COALESCE(SUM(p.fracao_ideal), 0) * 100 / 
         NULLIF((SELECT COALESCE(SUM(fracao_ideal), 1) FROM public.unidades_habitacionais 
                 WHERE condominio_id = a.condominio_id AND ativo = true), 0) >= a.quorum_minimo_primeira
    THEN 'primeira_convocacao'
    WHEN COALESCE(SUM(p.fracao_ideal), 0) * 100 / 
         NULLIF((SELECT COALESCE(SUM(fracao_ideal), 1) FROM public.unidades_habitacionais 
                 WHERE condominio_id = a.condominio_id AND ativo = true), 0) >= a.quorum_minimo_segunda
    THEN 'segunda_convocacao'
    ELSE 'sem_quorum'
  END AS status_quorum

FROM public.assembleias a
LEFT JOIN public.assembleia_presencas p ON p.assembleia_id = a.id
GROUP BY a.id;
COMMENT ON VIEW public.v_assembleia_quorum IS 'Quórum em tempo real de cada assembleia';
-- ============================================
-- VIEW: v_pauta_resultado
-- Resultado de votação por pauta
-- ============================================
CREATE OR REPLACE VIEW public.v_pauta_resultado AS
SELECT 
  p.id AS pauta_id,
  p.assembleia_id,
  p.titulo,
  p.tipo_votacao,
  p.voto_secreto,
  p.quorum_especial,
  p.status,
  
  -- Contagem de votos
  COUNT(v.id) AS total_votos,
  COUNT(v.id) FILTER (WHERE v.voto = 'sim') AS votos_sim,
  COUNT(v.id) FILTER (WHERE v.voto = 'nao') AS votos_nao,
  COUNT(v.id) FILTER (WHERE v.voto = 'abstencao') AS votos_abstencao,
  
  -- Por fração ideal
  COALESCE(SUM(v.fracao_ideal), 0) AS fracao_total_votou,
  COALESCE(SUM(v.fracao_ideal) FILTER (WHERE v.voto = 'sim'), 0) AS fracao_sim,
  COALESCE(SUM(v.fracao_ideal) FILTER (WHERE v.voto = 'nao'), 0) AS fracao_nao,
  COALESCE(SUM(v.fracao_ideal) FILTER (WHERE v.voto = 'abstencao'), 0) AS fracao_abstencao,
  
  -- Percentuais
  ROUND(
    COALESCE(SUM(v.fracao_ideal) FILTER (WHERE v.voto = 'sim'), 0) * 100 /
    NULLIF(COALESCE(SUM(v.fracao_ideal), 0), 0),
    2
  ) AS percentual_aprovacao

FROM public.assembleia_pautas p
LEFT JOIN public.assembleia_votos v ON v.pauta_id = p.id
GROUP BY p.id;
COMMENT ON VIEW public.v_pauta_resultado IS 'Resultado de votação por pauta';
-- ============================================
-- VIEW: v_assembleia_resumo
-- Resumo completo da assembleia
-- ============================================
CREATE OR REPLACE VIEW public.v_assembleia_resumo AS
SELECT 
  a.*,
  c.nome AS condominio_nome,
  
  -- Contagens
  (SELECT COUNT(*) FROM public.assembleia_pautas WHERE assembleia_id = a.id) AS total_pautas,
  (SELECT COUNT(*) FROM public.assembleia_presencas WHERE assembleia_id = a.id) AS total_presentes,
  (SELECT COUNT(*) FROM public.assembleia_assinaturas WHERE assembleia_id = a.id) AS total_assinaturas,
  
  -- Quórum
  q.quorum_percentual,
  q.status_quorum,
  q.unidades_presentes,
  q.total_unidades,
  
  -- Criador
  u.nome AS criado_por_nome

FROM public.assembleias a
JOIN public.condominios c ON c.id = a.condominio_id
LEFT JOIN public.v_assembleia_quorum q ON q.assembleia_id = a.id
LEFT JOIN public.usuarios u ON u.id = a.criado_por;
COMMENT ON VIEW public.v_assembleia_resumo IS 'Resumo completo da assembleia com quórum e contagens';
-- ============================================
-- FUNCTION: registrar_presenca
-- Registra presença com validações
-- ============================================
CREATE OR REPLACE FUNCTION public.registrar_presenca(
  p_assembleia_id UUID,
  p_usuario_id UUID,
  p_tipo public.presenca_tipo,
  p_representante_id UUID DEFAULT NULL,
  p_procuracao_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_dispositivo VARCHAR(100) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_assembleia public.assembleias%ROWTYPE;
  v_usuario public.usuarios%ROWTYPE;
  v_unidade public.unidades_habitacionais%ROWTYPE;
  v_presenca_id UUID;
  v_procuracoes_count INTEGER;
BEGIN
  -- Buscar assembleia
  SELECT * INTO v_assembleia FROM public.assembleias WHERE id = p_assembleia_id;
  IF v_assembleia.id IS NULL THEN
    RAISE EXCEPTION 'Assembleia não encontrada';
  END IF;
  
  IF v_assembleia.status NOT IN ('em_andamento', 'votacao') THEN
    RAISE EXCEPTION 'Assembleia não está em andamento. Status atual: %', v_assembleia.status;
  END IF;
  
  -- Buscar usuário
  SELECT * INTO v_usuario FROM public.usuarios WHERE id = p_usuario_id;
  IF v_usuario.id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;
  
  -- Buscar unidade do usuário
  SELECT * INTO v_unidade 
  FROM public.unidades_habitacionais 
  WHERE id = v_usuario.unidade_id AND ativo = true;
  
  IF v_unidade.id IS NULL THEN
    RAISE EXCEPTION 'Usuário não está vinculado a uma unidade ativa';
  END IF;
  
  -- Verificar se unidade já tem presença
  IF EXISTS (
    SELECT 1 FROM public.assembleia_presencas 
    WHERE assembleia_id = p_assembleia_id AND unidade_id = v_unidade.id
  ) THEN
    RAISE EXCEPTION 'Esta unidade já registrou presença nesta assembleia';
  END IF;
  
  -- Se for procuração, validar limite
  IF p_tipo = 'procuracao' AND p_representante_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_procuracoes_count
    FROM public.assembleia_presencas
    WHERE assembleia_id = p_assembleia_id
      AND representante_id = p_representante_id
      AND tipo = 'procuracao';
    
    IF v_procuracoes_count >= v_assembleia.max_procuracoes_por_pessoa THEN
      RAISE EXCEPTION 'Limite de procurações atingido para este representante (máx: %)', 
        v_assembleia.max_procuracoes_por_pessoa;
    END IF;
    
    -- Validar se procuração existe e está aceita
    IF p_procuracao_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.assembleia_procuracoes
        WHERE id = p_procuracao_id
          AND outorgante_id = p_usuario_id
          AND outorgado_id = p_representante_id
          AND status = 'aceita'
          AND (assembleia_id IS NULL OR assembleia_id = p_assembleia_id)
          AND validade_inicio <= CURRENT_DATE
          AND (validade_fim IS NULL OR validade_fim >= CURRENT_DATE)
      ) THEN
        RAISE EXCEPTION 'Procuração inválida ou não aceita';
      END IF;
    END IF;
  END IF;
  
  -- Registrar presença
  INSERT INTO public.assembleia_presencas (
    assembleia_id, usuario_id, unidade_id, tipo,
    representante_id, procuracao_id, fracao_ideal,
    ip_address, user_agent, dispositivo
  ) VALUES (
    p_assembleia_id, p_usuario_id, v_unidade.id, p_tipo,
    p_representante_id, p_procuracao_id, v_unidade.fracao_ideal,
    p_ip_address, p_user_agent, p_dispositivo
  )
  RETURNING id INTO v_presenca_id;
  
  -- Log
  INSERT INTO public.assembleia_logs (assembleia_id, usuario_id, acao, detalhes, ip_address)
  VALUES (p_assembleia_id, p_usuario_id, 'presenca_registrada', jsonb_build_object(
    'tipo', p_tipo,
    'unidade_id', v_unidade.id,
    'unidade', v_unidade.identificador,
    'fracao_ideal', v_unidade.fracao_ideal,
    'representante_id', p_representante_id
  ), p_ip_address);
  
  -- Marcar procuração como utilizada
  IF p_procuracao_id IS NOT NULL THEN
    UPDATE public.assembleia_procuracoes
    SET status = 'utilizada', updated_at = NOW()
    WHERE id = p_procuracao_id;
  END IF;
  
  RETURN v_presenca_id;
END;
$$;
COMMENT ON FUNCTION public.registrar_presenca IS 'Registra presença em assembleia com validações completas';
-- ============================================
-- FUNCTION: registrar_voto
-- Registra voto com validações e hash
-- ============================================
CREATE OR REPLACE FUNCTION public.registrar_voto(
  p_pauta_id UUID,
  p_presenca_id UUID,
  p_voto public.voto_tipo,
  p_opcao_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_pauta public.assembleia_pautas%ROWTYPE;
  v_presenca public.assembleia_presencas%ROWTYPE;
  v_assembleia public.assembleias%ROWTYPE;
  v_voto_id UUID;
  v_voto_hash VARCHAR(64);
  v_voto_anterior_hash VARCHAR(64);
  v_usuario_id UUID;
  v_unidade_id UUID;
BEGIN
  -- Buscar pauta
  SELECT * INTO v_pauta FROM public.assembleia_pautas WHERE id = p_pauta_id;
  IF v_pauta.id IS NULL THEN
    RAISE EXCEPTION 'Pauta não encontrada';
  END IF;
  
  IF v_pauta.status != 'em_votacao' THEN
    RAISE EXCEPTION 'Votação não está aberta para esta pauta. Status: %', v_pauta.status;
  END IF;
  
  -- Buscar presença
  SELECT * INTO v_presenca FROM public.assembleia_presencas WHERE id = p_presenca_id;
  IF v_presenca.id IS NULL THEN
    RAISE EXCEPTION 'Presença não encontrada';
  END IF;
  
  -- Verificar se presença é da mesma assembleia
  IF v_presenca.assembleia_id != v_pauta.assembleia_id THEN
    RAISE EXCEPTION 'Presença não pertence a esta assembleia';
  END IF;
  
  -- Verificar se já votou
  IF EXISTS (
    SELECT 1 FROM public.assembleia_votos 
    WHERE pauta_id = p_pauta_id AND presenca_id = p_presenca_id
  ) THEN
    RAISE EXCEPTION 'Esta unidade já votou nesta pauta';
  END IF;
  
  -- Verificar inadimplência (se configurado)
  IF v_pauta.bloqueia_inadimplentes THEN
    IF EXISTS (
      SELECT 1 FROM public.taxas_unidades
      WHERE unidade_id = v_presenca.unidade_id 
        AND status = 'atrasado'
    ) THEN
      RAISE EXCEPTION 'Unidade inadimplente não pode votar nesta pauta';
    END IF;
  END IF;
  
  -- Validar voto de opção
  IF p_voto = 'opcao' AND p_opcao_id IS NULL THEN
    RAISE EXCEPTION 'Voto de opção requer opcao_id';
  END IF;
  
  IF p_opcao_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.assembleia_pauta_opcoes 
      WHERE id = p_opcao_id AND pauta_id = p_pauta_id
    ) THEN
      RAISE EXCEPTION 'Opção de voto inválida';
    END IF;
  END IF;
  
  -- Buscar hash do último voto (blockchain simplificado)
  SELECT voto_hash INTO v_voto_anterior_hash
  FROM public.assembleia_votos
  WHERE pauta_id = p_pauta_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Gerar hash do voto
  v_voto_hash := encode(sha256(
    (p_pauta_id::TEXT || p_presenca_id::TEXT || p_voto::TEXT || 
     COALESCE(p_opcao_id::TEXT, '') || COALESCE(v_voto_anterior_hash, '') || 
     NOW()::TEXT || gen_random_uuid()::TEXT)::BYTEA
  ), 'hex');
  
  -- Determinar se salva identificação (voto não-secreto)
  IF NOT v_pauta.voto_secreto THEN
    v_usuario_id := v_presenca.usuario_id;
    v_unidade_id := v_presenca.unidade_id;
  END IF;
  
  -- Inserir voto
  INSERT INTO public.assembleia_votos (
    pauta_id, presenca_id, voto, opcao_id, fracao_ideal,
    usuario_id, unidade_id, voto_hash, voto_anterior_hash, ip_address
  ) VALUES (
    p_pauta_id, p_presenca_id, p_voto, p_opcao_id, v_presenca.fracao_ideal,
    v_usuario_id, v_unidade_id, v_voto_hash, v_voto_anterior_hash, p_ip_address
  )
  RETURNING id INTO v_voto_id;
  
  -- Log (sem identificar quem votou o quê se for secreto)
  INSERT INTO public.assembleia_logs (assembleia_id, usuario_id, acao, detalhes, ip_address)
  VALUES (v_pauta.assembleia_id, v_presenca.usuario_id, 'voto_registrado', jsonb_build_object(
    'pauta_id', p_pauta_id,
    'pauta_titulo', v_pauta.titulo,
    'voto_secreto', v_pauta.voto_secreto,
    'voto_hash', v_voto_hash
  ), p_ip_address);
  
  RETURN v_voto_id;
END;
$$;
COMMENT ON FUNCTION public.registrar_voto IS 'Registra voto com validações, hash e auditoria';
-- ============================================
-- FUNCTION: abrir_votacao_pauta
-- Abre votação para uma pauta
-- ============================================
CREATE OR REPLACE FUNCTION public.abrir_votacao_pauta(
  p_pauta_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_pauta public.assembleia_pautas%ROWTYPE;
  v_assembleia public.assembleias%ROWTYPE;
BEGIN
  -- Buscar pauta
  SELECT * INTO v_pauta FROM public.assembleia_pautas WHERE id = p_pauta_id;
  IF v_pauta.id IS NULL THEN
    RAISE EXCEPTION 'Pauta não encontrada';
  END IF;
  
  IF v_pauta.status != 'pendente' THEN
    RAISE EXCEPTION 'Pauta não está pendente. Status atual: %', v_pauta.status;
  END IF;
  
  -- Buscar assembleia
  SELECT * INTO v_assembleia FROM public.assembleias WHERE id = v_pauta.assembleia_id;
  IF v_assembleia.status NOT IN ('em_andamento', 'votacao') THEN
    RAISE EXCEPTION 'Assembleia não está em andamento';
  END IF;
  
  -- Verificar se há outra pauta em votação
  IF EXISTS (
    SELECT 1 FROM public.assembleia_pautas
    WHERE assembleia_id = v_pauta.assembleia_id
      AND id != p_pauta_id
      AND status = 'em_votacao'
  ) THEN
    RAISE EXCEPTION 'Já existe outra pauta em votação nesta assembleia';
  END IF;
  
  -- Abrir votação
  UPDATE public.assembleia_pautas
  SET status = 'em_votacao', votacao_iniciada_em = NOW(), updated_at = NOW()
  WHERE id = p_pauta_id;
  
  -- Atualizar status da assembleia
  UPDATE public.assembleias
  SET status = 'votacao', updated_at = NOW()
  WHERE id = v_pauta.assembleia_id AND status = 'em_andamento';
  
  -- Log
  INSERT INTO public.assembleia_logs (assembleia_id, usuario_id, acao, detalhes)
  VALUES (v_pauta.assembleia_id, auth.uid(), 'votacao_aberta', jsonb_build_object(
    'pauta_id', p_pauta_id,
    'pauta_titulo', v_pauta.titulo
  ));
  
  RETURN TRUE;
END;
$$;
COMMENT ON FUNCTION public.abrir_votacao_pauta IS 'Abre votação para uma pauta específica';
-- ============================================
-- FUNCTION: encerrar_votacao_pauta
-- Encerra votação e calcula resultado
-- ============================================
CREATE OR REPLACE FUNCTION public.encerrar_votacao_pauta(
  p_pauta_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_pauta public.assembleia_pautas%ROWTYPE;
  v_resultado public.v_pauta_resultado%ROWTYPE;
  v_status public.pauta_status;
  v_resultado_json JSONB;
  v_quorum_necessario DECIMAL(5,2);
  v_aprovado BOOLEAN;
BEGIN
  -- Buscar pauta
  SELECT * INTO v_pauta FROM public.assembleia_pautas WHERE id = p_pauta_id;
  IF v_pauta.id IS NULL THEN
    RAISE EXCEPTION 'Pauta não encontrada';
  END IF;
  
  IF v_pauta.status != 'em_votacao' THEN
    RAISE EXCEPTION 'Pauta não está em votação. Status: %', v_pauta.status;
  END IF;
  
  -- Buscar resultado atual
  SELECT * INTO v_resultado FROM public.v_pauta_resultado WHERE pauta_id = p_pauta_id;
  
  -- Calcular quórum necessário baseado no tipo
  v_quorum_necessario := CASE v_pauta.quorum_especial
    WHEN 'maioria_simples' THEN 50.01
    WHEN 'maioria_absoluta' THEN 50.01
    WHEN 'dois_tercos' THEN 66.67
    WHEN 'unanimidade' THEN 100.00
    ELSE 50.01
  END;
  
  -- Determinar se foi aprovado
  IF v_pauta.tipo_votacao = 'aprovacao' THEN
    v_aprovado := COALESCE(v_resultado.percentual_aprovacao, 0) >= v_quorum_necessario;
    v_status := CASE WHEN v_aprovado THEN 'aprovada' ELSE 'rejeitada' END;
    
    v_resultado_json := jsonb_build_object(
      'tipo', 'aprovacao',
      'total_votos', v_resultado.total_votos,
      'votos_sim', v_resultado.votos_sim,
      'votos_nao', v_resultado.votos_nao,
      'votos_abstencao', v_resultado.votos_abstencao,
      'fracao_sim', v_resultado.fracao_sim,
      'fracao_nao', v_resultado.fracao_nao,
      'fracao_abstencao', v_resultado.fracao_abstencao,
      'percentual_aprovacao', v_resultado.percentual_aprovacao,
      'quorum_necessario', v_quorum_necessario,
      'aprovado', v_aprovado
    );
    
  ELSIF v_pauta.tipo_votacao IN ('eleicao', 'escolha_unica') THEN
    v_status := 'encerrada';
    
    -- Marcar eleitos
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY votos_fracao DESC, votos_count DESC) as rank
      FROM public.assembleia_pauta_opcoes
      WHERE pauta_id = p_pauta_id
    )
    UPDATE public.assembleia_pauta_opcoes o
    SET eleito = (r.rank <= COALESCE(v_pauta.max_eleitos, 1))
    FROM ranked r
    WHERE o.id = r.id;
    
    -- Montar resultado
    SELECT jsonb_build_object(
      'tipo', v_pauta.tipo_votacao,
      'total_votos', v_resultado.total_votos,
      'eleitos', jsonb_agg(jsonb_build_object(
        'opcao_id', id,
        'titulo', titulo,
        'candidato_nome', candidato_nome,
        'votos_count', votos_count,
        'votos_fracao', votos_fracao
      ) ORDER BY votos_fracao DESC)
    )
    INTO v_resultado_json
    FROM public.assembleia_pauta_opcoes
    WHERE pauta_id = p_pauta_id AND eleito = true;
    
  ELSE
    v_status := 'encerrada';
    v_resultado_json := jsonb_build_object(
      'tipo', v_pauta.tipo_votacao,
      'total_votos', v_resultado.total_votos,
      'encerrada_em', NOW()
    );
  END IF;
  
  -- Atualizar pauta
  UPDATE public.assembleia_pautas
  SET 
    status = v_status, 
    resultado = v_resultado_json,
    votacao_encerrada_em = NOW(),
    updated_at = NOW()
  WHERE id = p_pauta_id;
  
  -- Log
  INSERT INTO public.assembleia_logs (assembleia_id, usuario_id, acao, detalhes)
  VALUES (v_pauta.assembleia_id, auth.uid(), 'votacao_encerrada', jsonb_build_object(
    'pauta_id', p_pauta_id,
    'pauta_titulo', v_pauta.titulo,
    'resultado', v_resultado_json
  ));
  
  RETURN v_resultado_json;
END;
$$;
COMMENT ON FUNCTION public.encerrar_votacao_pauta IS 'Encerra votação e calcula resultado final';
-- ============================================
-- FUNCTION: encerrar_assembleia
-- Encerra assembleia e prepara ata
-- ============================================
CREATE OR REPLACE FUNCTION public.encerrar_assembleia(
  p_assembleia_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_assembleia public.assembleias%ROWTYPE;
  v_pautas_abertas INTEGER;
BEGIN
  -- Buscar assembleia
  SELECT * INTO v_assembleia FROM public.assembleias WHERE id = p_assembleia_id;
  IF v_assembleia.id IS NULL THEN
    RAISE EXCEPTION 'Assembleia não encontrada';
  END IF;
  
  IF v_assembleia.status NOT IN ('em_andamento', 'votacao') THEN
    RAISE EXCEPTION 'Assembleia não está em andamento. Status: %', v_assembleia.status;
  END IF;
  
  -- Verificar se há pautas em votação
  SELECT COUNT(*) INTO v_pautas_abertas
  FROM public.assembleia_pautas
  WHERE assembleia_id = p_assembleia_id AND status = 'em_votacao';
  
  IF v_pautas_abertas > 0 THEN
    RAISE EXCEPTION 'Existem % pauta(s) com votação aberta. Encerre todas antes de encerrar a assembleia.', v_pautas_abertas;
  END IF;
  
  -- Encerrar assembleia
  UPDATE public.assembleias
  SET 
    status = 'encerrada',
    data_fim = NOW(),
    encerrada_em = NOW(),
    updated_at = NOW()
  WHERE id = p_assembleia_id;
  
  -- Log
  INSERT INTO public.assembleia_logs (assembleia_id, usuario_id, acao, detalhes)
  VALUES (p_assembleia_id, auth.uid(), 'assembleia_encerrada', jsonb_build_object(
    'encerrada_em', NOW()
  ));
  
  RETURN TRUE;
END;
$$;
COMMENT ON FUNCTION public.encerrar_assembleia IS 'Encerra assembleia após todas as votações';
-- ============================================
-- FUNCTION: gerar_ata_texto
-- Gera texto da ata automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION public.gerar_ata_texto(
  p_assembleia_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_assembleia public.assembleias%ROWTYPE;
  v_condominio public.condominios%ROWTYPE;
  v_quorum public.v_assembleia_quorum%ROWTYPE;
  v_ata TEXT;
  v_pauta RECORD;
  v_presenca RECORD;
BEGIN
  -- Buscar assembleia
  SELECT * INTO v_assembleia FROM public.assembleias WHERE id = p_assembleia_id;
  SELECT * INTO v_condominio FROM public.condominios WHERE id = v_assembleia.condominio_id;
  SELECT * INTO v_quorum FROM public.v_assembleia_quorum WHERE assembleia_id = p_assembleia_id;
  
  -- Cabeçalho
  v_ata := format(
    E'# ATA DE ASSEMBLEIA\n\n' ||
    E'## %s - %s\n\n' ||
    E'**Condomínio:** %s\n' ||
    E'**CNPJ:** %s\n' ||
    E'**Data:** %s\n' ||
    E'**Horário de Início:** %s\n' ||
    E'**Horário de Encerramento:** %s\n' ||
    E'**Local:** %s\n\n',
    v_assembleia.tipo,
    v_assembleia.titulo,
    v_condominio.nome,
    COALESCE(v_condominio.cnpj, 'N/A'),
    TO_CHAR(v_assembleia.data_inicio, 'DD/MM/YYYY'),
    TO_CHAR(v_assembleia.data_inicio, 'HH24:MI'),
    TO_CHAR(COALESCE(v_assembleia.data_fim, NOW()), 'HH24:MI'),
    COALESCE(v_assembleia.local_presencial, 'Reunião Virtual')
  );
  
  -- Quórum
  v_ata := v_ata || format(
    E'## QUÓRUM\n\n' ||
    E'**Unidades Presentes:** %s de %s\n' ||
    E'**Fração Ideal Representada:** %s%%\n' ||
    E'**Status:** %s\n\n',
    v_quorum.unidades_presentes,
    v_quorum.total_unidades,
    v_quorum.quorum_percentual,
    CASE v_quorum.status_quorum
      WHEN 'primeira_convocacao' THEN 'Quórum atingido em 1ª convocação'
      WHEN 'segunda_convocacao' THEN 'Quórum atingido em 2ª convocação'
      ELSE 'Sem quórum'
    END
  );
  
  -- Lista de presença
  v_ata := v_ata || E'## LISTA DE PRESENÇA\n\n';
  v_ata := v_ata || E'| Unidade | Proprietário | Tipo | Fração |\n';
  v_ata := v_ata || E'|---------|--------------|------|--------|\n';
  
  FOR v_presenca IN
    SELECT 
      uh.identificador,
      u.nome,
      p.tipo,
      p.fracao_ideal
    FROM public.assembleia_presencas p
    JOIN public.unidades_habitacionais uh ON uh.id = p.unidade_id
    JOIN public.usuarios u ON u.id = p.usuario_id
    WHERE p.assembleia_id = p_assembleia_id
    ORDER BY uh.identificador
  LOOP
    v_ata := v_ata || format(
      E'| %s | %s | %s | %s |\n',
      v_presenca.identificador,
      v_presenca.nome,
      v_presenca.tipo,
      v_presenca.fracao_ideal
    );
  END LOOP;
  
  v_ata := v_ata || E'\n';
  
  -- Pautas e deliberações
  v_ata := v_ata || E'## DELIBERAÇÕES\n\n';
  
  FOR v_pauta IN
    SELECT 
      p.*,
      r.votos_sim,
      r.votos_nao,
      r.votos_abstencao,
      r.percentual_aprovacao
    FROM public.assembleia_pautas p
    LEFT JOIN public.v_pauta_resultado r ON r.pauta_id = p.id
    WHERE p.assembleia_id = p_assembleia_id
    ORDER BY p.ordem
  LOOP
    v_ata := v_ata || format(
      E'### %s. %s\n\n' ||
      E'%s\n\n',
      v_pauta.ordem,
      v_pauta.titulo,
      COALESCE(v_pauta.descricao, '')
    );
    
    IF v_pauta.tipo_votacao = 'informativo' THEN
      v_ata := v_ata || E'*Pauta informativa, sem votação.*\n\n';
    ELSE
      v_ata := v_ata || format(
        E'**Resultado:** %s\n' ||
        E'- Votos a favor: %s\n' ||
        E'- Votos contra: %s\n' ||
        E'- Abstenções: %s\n' ||
        E'- Percentual de aprovação: %s%%\n\n',
        UPPER(v_pauta.status::TEXT),
        COALESCE(v_pauta.votos_sim, 0),
        COALESCE(v_pauta.votos_nao, 0),
        COALESCE(v_pauta.votos_abstencao, 0),
        COALESCE(v_pauta.percentual_aprovacao, 0)
      );
    END IF;
  END LOOP;
  
  -- Encerramento
  v_ata := v_ata || format(
    E'## ENCERRAMENTO\n\n' ||
    E'Nada mais havendo a tratar, foi encerrada a assembleia às %s, ' ||
    E'da qual eu, secretário(a), lavrei a presente ata que, após lida e aprovada, ' ||
    E'vai assinada digitalmente pelos presentes.\n\n' ||
    E'---\n\n' ||
    E'*Documento gerado automaticamente pelo sistema Versix Norma*\n' ||
    E'*Hash de integridade: %s*\n',
    TO_CHAR(COALESCE(v_assembleia.data_fim, NOW()), 'HH24:MI'),
    encode(sha256(v_ata::BYTEA), 'hex')
  );
  
  -- Salvar ata
  UPDATE public.assembleias
  SET 
    ata_texto = v_ata,
    ata_hash = encode(sha256(v_ata::BYTEA), 'hex'),
    updated_at = NOW()
  WHERE id = p_assembleia_id;
  
  RETURN v_ata;
END;
$$;
COMMENT ON FUNCTION public.gerar_ata_texto IS 'Gera texto da ata automaticamente em formato Markdown';
-- ============================================
-- FUNCTION: aceitar_procuracao
-- Aceita uma procuração digital
-- ============================================
CREATE OR REPLACE FUNCTION public.aceitar_procuracao(
  p_procuracao_id UUID,
  p_ip_address INET DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_procuracao public.assembleia_procuracoes%ROWTYPE;
BEGIN
  -- Buscar procuração
  SELECT * INTO v_procuracao FROM public.assembleia_procuracoes WHERE id = p_procuracao_id;
  
  IF v_procuracao.id IS NULL THEN
    RAISE EXCEPTION 'Procuração não encontrada';
  END IF;
  
  -- Verificar se é o outorgado
  IF v_procuracao.outorgado_id != auth.uid() THEN
    RAISE EXCEPTION 'Apenas o outorgado pode aceitar esta procuração';
  END IF;
  
  IF v_procuracao.status != 'pendente' THEN
    RAISE EXCEPTION 'Procuração não está pendente. Status: %', v_procuracao.status;
  END IF;
  
  -- Aceitar
  UPDATE public.assembleia_procuracoes
  SET 
    status = 'aceita',
    aceite_em = NOW(),
    aceite_ip = p_ip_address,
    updated_at = NOW()
  WHERE id = p_procuracao_id;
  
  RETURN TRUE;
END;
$$;
COMMENT ON FUNCTION public.aceitar_procuracao IS 'Aceita uma procuração digital';
-- ============================================
-- RLS: assembleias
-- ============================================
ALTER TABLE public.assembleias ENABLE ROW LEVEL SECURITY;
-- SuperAdmin: tudo
CREATE POLICY "superadmin_assembleias_all" ON public.assembleias
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'superadmin')
  );
-- Síndico/Subsíndico: CRUD do próprio condomínio
CREATE POLICY "sindico_assembleias_all" ON public.assembleias
  FOR ALL USING (
    condominio_id IN (
      SELECT condominio_id FROM public.usuarios 
      WHERE id = auth.uid() AND role IN ('sindico', 'subsindico', 'admin_condo')
    )
  );
-- Moradores: leitura de assembleias convocadas+
CREATE POLICY "morador_assembleias_read" ON public.assembleias
  FOR SELECT USING (
    condominio_id IN (SELECT condominio_id FROM public.usuarios WHERE id = auth.uid())
    AND status NOT IN ('rascunho')
  );
-- ============================================
-- RLS: assembleia_pautas
-- ============================================
ALTER TABLE public.assembleia_pautas ENABLE ROW LEVEL SECURITY;
-- SuperAdmin
CREATE POLICY "superadmin_pautas_all" ON public.assembleia_pautas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'superadmin')
  );
-- Síndico: CRUD
CREATE POLICY "sindico_pautas_all" ON public.assembleia_pautas
  FOR ALL USING (
    assembleia_id IN (
      SELECT a.id FROM public.assembleias a
      JOIN public.usuarios u ON u.condominio_id = a.condominio_id
      WHERE u.id = auth.uid() AND u.role IN ('sindico', 'subsindico', 'admin_condo')
    )
  );
-- Moradores: leitura
CREATE POLICY "morador_pautas_read" ON public.assembleia_pautas
  FOR SELECT USING (
    assembleia_id IN (
      SELECT a.id FROM public.assembleias a
      JOIN public.usuarios u ON u.condominio_id = a.condominio_id
      WHERE u.id = auth.uid() AND a.status NOT IN ('rascunho')
    )
  );
-- ============================================
-- RLS: assembleia_pauta_opcoes
-- ============================================
ALTER TABLE public.assembleia_pauta_opcoes ENABLE ROW LEVEL SECURITY;
-- SuperAdmin
CREATE POLICY "superadmin_opcoes_all" ON public.assembleia_pauta_opcoes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'superadmin')
  );
-- Síndico: CRUD
CREATE POLICY "sindico_opcoes_all" ON public.assembleia_pauta_opcoes
  FOR ALL USING (
    pauta_id IN (
      SELECT p.id FROM public.assembleia_pautas p
      JOIN public.assembleias a ON a.id = p.assembleia_id
      JOIN public.usuarios u ON u.condominio_id = a.condominio_id
      WHERE u.id = auth.uid() AND u.role IN ('sindico', 'subsindico', 'admin_condo')
    )
  );
-- Moradores: leitura
CREATE POLICY "morador_opcoes_read" ON public.assembleia_pauta_opcoes
  FOR SELECT USING (
    pauta_id IN (
      SELECT p.id FROM public.assembleia_pautas p
      JOIN public.assembleias a ON a.id = p.assembleia_id
      JOIN public.usuarios u ON u.condominio_id = a.condominio_id
      WHERE u.id = auth.uid() AND a.status NOT IN ('rascunho')
    )
  );
-- ============================================
-- RLS: assembleia_presencas
-- ============================================
ALTER TABLE public.assembleia_presencas ENABLE ROW LEVEL SECURITY;
-- SuperAdmin
CREATE POLICY "superadmin_presencas_all" ON public.assembleia_presencas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'superadmin')
  );
-- Síndico: leitura
CREATE POLICY "sindico_presencas_read" ON public.assembleia_presencas
  FOR SELECT USING (
    assembleia_id IN (
      SELECT a.id FROM public.assembleias a
      JOIN public.usuarios u ON u.condominio_id = a.condominio_id
      WHERE u.id = auth.uid() AND u.role IN ('sindico', 'subsindico', 'admin_condo', 'conselheiro')
    )
  );
-- Moradores: leitura (veem quem está presente)
CREATE POLICY "morador_presencas_read" ON public.assembleia_presencas
  FOR SELECT USING (
    assembleia_id IN (
      SELECT a.id FROM public.assembleias a
      JOIN public.usuarios u ON u.condominio_id = a.condominio_id
      WHERE u.id = auth.uid() AND a.status NOT IN ('rascunho')
    )
  );
-- Moradores: inserir própria presença (via function)
CREATE POLICY "morador_presencas_insert" ON public.assembleia_presencas
  FOR INSERT WITH CHECK (
    usuario_id = auth.uid()
  );
-- ============================================
-- RLS: assembleia_votos
-- ============================================
ALTER TABLE public.assembleia_votos ENABLE ROW LEVEL SECURITY;
-- SuperAdmin
CREATE POLICY "superadmin_votos_all" ON public.assembleia_votos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'superadmin')
  );
-- Votos não-secretos: todos do condomínio veem
-- Votos secretos: só o próprio vê
CREATE POLICY "votos_read" ON public.assembleia_votos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.assembleia_pautas p
      JOIN public.assembleias a ON a.id = p.assembleia_id
      JOIN public.usuarios u ON u.condominio_id = a.condominio_id
      WHERE p.id = assembleia_votos.pauta_id
        AND u.id = auth.uid()
        AND (NOT p.voto_secreto OR assembleia_votos.usuario_id = auth.uid())
    )
  );
-- Inserir voto: apenas própria presença (via function)
CREATE POLICY "votos_insert" ON public.assembleia_votos
  FOR INSERT WITH CHECK (
    presenca_id IN (
      SELECT id FROM public.assembleia_presencas WHERE usuario_id = auth.uid()
    )
  );
-- ============================================
-- RLS: assembleia_procuracoes
-- ============================================
ALTER TABLE public.assembleia_procuracoes ENABLE ROW LEVEL SECURITY;
-- SuperAdmin
CREATE POLICY "superadmin_procuracoes_all" ON public.assembleia_procuracoes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'superadmin')
  );
-- Síndico: leitura do condomínio
CREATE POLICY "sindico_procuracoes_read" ON public.assembleia_procuracoes
  FOR SELECT USING (
    condominio_id IN (
      SELECT condominio_id FROM public.usuarios 
      WHERE id = auth.uid() AND role IN ('sindico', 'subsindico', 'admin_condo')
    )
  );
-- Outorgante: CRUD das próprias
CREATE POLICY "outorgante_procuracoes_all" ON public.assembleia_procuracoes
  FOR ALL USING (outorgante_id = auth.uid());
-- Outorgado: leitura e atualização (aceitar/recusar)
CREATE POLICY "outorgado_procuracoes_read" ON public.assembleia_procuracoes
  FOR SELECT USING (outorgado_id = auth.uid());
CREATE POLICY "outorgado_procuracoes_update" ON public.assembleia_procuracoes
  FOR UPDATE USING (outorgado_id = auth.uid());
-- ============================================
-- RLS: assembleia_assinaturas
-- ============================================
ALTER TABLE public.assembleia_assinaturas ENABLE ROW LEVEL SECURITY;
-- SuperAdmin
CREATE POLICY "superadmin_assinaturas_all" ON public.assembleia_assinaturas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'superadmin')
  );
-- Todos do condomínio: leitura
CREATE POLICY "condominio_assinaturas_read" ON public.assembleia_assinaturas
  FOR SELECT USING (
    assembleia_id IN (
      SELECT a.id FROM public.assembleias a
      JOIN public.usuarios u ON u.condominio_id = a.condominio_id
      WHERE u.id = auth.uid()
    )
  );
-- Inserir própria assinatura
CREATE POLICY "usuario_assinaturas_insert" ON public.assembleia_assinaturas
  FOR INSERT WITH CHECK (usuario_id = auth.uid());
-- ============================================
-- RLS: assembleia_logs
-- ============================================
ALTER TABLE public.assembleia_logs ENABLE ROW LEVEL SECURITY;
-- SuperAdmin
CREATE POLICY "superadmin_logs_all" ON public.assembleia_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'superadmin')
  );
-- Síndico/Conselho: leitura
CREATE POLICY "sindico_logs_read" ON public.assembleia_logs
  FOR SELECT USING (
    assembleia_id IN (
      SELECT a.id FROM public.assembleias a
      JOIN public.usuarios u ON u.condominio_id = a.condominio_id
      WHERE u.id = auth.uid() AND u.role IN ('sindico', 'subsindico', 'admin_condo', 'conselheiro')
    )
  );
-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT ALL ON public.assembleias TO authenticated;
GRANT ALL ON public.assembleia_pautas TO authenticated;
GRANT ALL ON public.assembleia_pauta_opcoes TO authenticated;
GRANT ALL ON public.assembleia_presencas TO authenticated;
GRANT ALL ON public.assembleia_votos TO authenticated;
GRANT ALL ON public.assembleia_procuracoes TO authenticated;
GRANT ALL ON public.assembleia_assinaturas TO authenticated;
GRANT ALL ON public.assembleia_logs TO authenticated;
GRANT SELECT ON public.v_assembleia_quorum TO authenticated;
GRANT SELECT ON public.v_pauta_resultado TO authenticated;
GRANT SELECT ON public.v_assembleia_resumo TO authenticated;
-- ============================================
-- COMENTÁRIOS FINAIS
-- ============================================
COMMENT ON SCHEMA public IS 'Versix Norma - Sprint 6: Functions e RLS de Assembleias adicionados';
