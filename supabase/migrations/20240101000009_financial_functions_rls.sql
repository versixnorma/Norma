-- ============================================
-- VERSIX NORMA - MIGRATION 009: FINANCEIRO FUNCTIONS & RLS
-- Sprint 4: Funções auxiliares e políticas de segurança
-- ============================================

-- ============================================
-- FUNCTION: Atualizar saldo da conta bancária
-- ============================================
CREATE OR REPLACE FUNCTION public.atualizar_saldo_conta()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmado' THEN
    IF NEW.tipo = 'receita' THEN
      UPDATE public.contas_bancarias
      SET saldo_atual = saldo_atual + NEW.valor, data_saldo = NOW()
      WHERE id = NEW.conta_bancaria_id;
    ELSIF NEW.tipo = 'despesa' THEN
      UPDATE public.contas_bancarias
      SET saldo_atual = saldo_atual - NEW.valor, data_saldo = NOW()
      WHERE id = NEW.conta_bancaria_id;
    ELSIF NEW.tipo = 'transferencia' THEN
      -- Saída da conta origem
      UPDATE public.contas_bancarias
      SET saldo_atual = saldo_atual - NEW.valor, data_saldo = NOW()
      WHERE id = NEW.conta_bancaria_id;
      -- Entrada na conta destino
      UPDATE public.contas_bancarias
      SET saldo_atual = saldo_atual + NEW.valor, data_saldo = NOW()
      WHERE id = NEW.conta_destino_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Se mudou de pendente para confirmado
    IF OLD.status = 'pendente' AND NEW.status = 'confirmado' THEN
      IF NEW.tipo = 'receita' THEN
        UPDATE public.contas_bancarias
        SET saldo_atual = saldo_atual + NEW.valor, data_saldo = NOW()
        WHERE id = NEW.conta_bancaria_id;
      ELSIF NEW.tipo = 'despesa' THEN
        UPDATE public.contas_bancarias
        SET saldo_atual = saldo_atual - NEW.valor, data_saldo = NOW()
        WHERE id = NEW.conta_bancaria_id;
      END IF;
    -- Se foi cancelado (reverter)
    ELSIF OLD.status = 'confirmado' AND NEW.status = 'cancelado' THEN
      IF NEW.tipo = 'receita' THEN
        UPDATE public.contas_bancarias
        SET saldo_atual = saldo_atual - NEW.valor, data_saldo = NOW()
        WHERE id = NEW.conta_bancaria_id;
      ELSIF NEW.tipo = 'despesa' THEN
        UPDATE public.contas_bancarias
        SET saldo_atual = saldo_atual + NEW.valor, data_saldo = NOW()
        WHERE id = NEW.conta_bancaria_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER tr_lancamento_atualiza_saldo
  AFTER INSERT OR UPDATE ON public.lancamentos_financeiros
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_saldo_conta();
-- ============================================
-- FUNCTION: Verificar período bloqueado
-- ============================================
CREATE OR REPLACE FUNCTION public.check_periodo_bloqueado()
RETURNS TRIGGER AS $$
DECLARE
  v_prestacao RECORD;
BEGIN
  -- Verificar se existe prestação publicada para o período
  SELECT * INTO v_prestacao
  FROM public.prestacao_contas
  WHERE condominio_id = NEW.condominio_id
    AND mes_referencia = date_trunc('month', NEW.data_competencia)::DATE
    AND status = 'publicado';
  
  IF v_prestacao IS NOT NULL THEN
    RAISE EXCEPTION 'Período % está fechado. Não é possível alterar lançamentos.', 
      to_char(NEW.data_competencia, 'MM/YYYY');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER tr_check_periodo_bloqueado
  BEFORE INSERT OR UPDATE ON public.lancamentos_financeiros
  FOR EACH ROW EXECUTE FUNCTION public.check_periodo_bloqueado();
-- ============================================
-- FUNCTION: Calcular saldo do período
-- ============================================
CREATE OR REPLACE FUNCTION public.calcular_saldo_periodo(
  p_condominio_id UUID,
  p_mes_referencia DATE
)
RETURNS TABLE (
  saldo_anterior DECIMAL,
  total_receitas DECIMAL,
  total_despesas DECIMAL,
  saldo_atual DECIMAL
) AS $$
DECLARE
  v_saldo_anterior DECIMAL := 0;
  v_receitas DECIMAL := 0;
  v_despesas DECIMAL := 0;
BEGIN
  -- Tentar buscar do histórico primeiro (performance)
  SELECT 
    COALESCE(SUM(saldo_final), 0) INTO v_saldo_anterior
  FROM public.contas_bancarias_historico
  WHERE condominio_id = p_condominio_id
    AND mes_referencia = (p_mes_referencia - INTERVAL '1 month')::DATE;
  
  -- Se não tem histórico, calcular do início
  IF v_saldo_anterior = 0 THEN
    SELECT COALESCE(SUM(saldo_inicial), 0) INTO v_saldo_anterior
    FROM public.contas_bancarias
    WHERE condominio_id = p_condominio_id
      AND deleted_at IS NULL;
    
    -- Somar lançamentos anteriores ao período
    SELECT 
      COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0)
    INTO v_saldo_anterior
    FROM public.lancamentos_financeiros
    WHERE condominio_id = p_condominio_id
      AND data_competencia < p_mes_referencia
      AND status = 'confirmado'
      AND deleted_at IS NULL;
  END IF;
  
  -- Calcular receitas do período
  SELECT COALESCE(SUM(valor), 0) INTO v_receitas
  FROM public.lancamentos_financeiros
  WHERE condominio_id = p_condominio_id
    AND date_trunc('month', data_competencia) = date_trunc('month', p_mes_referencia)
    AND tipo = 'receita'
    AND status = 'confirmado'
    AND deleted_at IS NULL;
  
  -- Calcular despesas do período
  SELECT COALESCE(SUM(valor), 0) INTO v_despesas
  FROM public.lancamentos_financeiros
  WHERE condominio_id = p_condominio_id
    AND date_trunc('month', data_competencia) = date_trunc('month', p_mes_referencia)
    AND tipo = 'despesa'
    AND status = 'confirmado'
    AND deleted_at IS NULL;
  
  RETURN QUERY SELECT 
    v_saldo_anterior,
    v_receitas,
    v_despesas,
    v_saldo_anterior + v_receitas - v_despesas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- FUNCTION: Gerar taxas do mês
-- ============================================
CREATE OR REPLACE FUNCTION public.gerar_taxas_mes(
  p_condominio_id UUID,
  p_mes_referencia DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_config RECORD;
  v_unidade RECORD;
  v_count INTEGER := 0;
  v_valor_taxa DECIMAL;
  v_data_vencimento DATE;
BEGIN
  -- Verificar permissão
  IF NOT (public.is_superadmin() OR public.is_sindico(p_condominio_id)) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;
  
  -- Buscar configurações
  SELECT * INTO v_config
  FROM public.configuracoes_financeiras
  WHERE condominio_id = p_condominio_id;
  
  IF v_config IS NULL THEN
    RAISE EXCEPTION 'Configurações financeiras não encontradas';
  END IF;
  
  -- Calcular data de vencimento
  v_data_vencimento := (p_mes_referencia + INTERVAL '1 month')::DATE 
    + (v_config.dia_vencimento - 1);
  
  -- Gerar taxa para cada unidade
  FOR v_unidade IN 
    SELECT uh.id, uh.fracao_ideal
    FROM public.unidades_habitacionais uh
    WHERE uh.condominio_id = p_condominio_id
      AND uh.ativo = true
  LOOP
    -- Calcular valor (base * fração ideal se definida)
    v_valor_taxa := v_config.taxa_ordinaria_base;
    IF v_unidade.fracao_ideal IS NOT NULL AND v_unidade.fracao_ideal > 0 THEN
      v_valor_taxa := v_valor_taxa * (v_unidade.fracao_ideal * 100);
    END IF;
    
    -- Inserir taxa ordinária
    INSERT INTO public.taxas_unidades (
      condominio_id,
      unidade_id,
      mes_referencia,
      tipo,
      valor_base,
      data_vencimento,
      status
    ) VALUES (
      p_condominio_id,
      v_unidade.id,
      p_mes_referencia,
      'ordinaria',
      v_valor_taxa,
      v_data_vencimento,
      'pendente'
    )
    ON CONFLICT (unidade_id, mes_referencia, tipo) DO NOTHING;
    
    IF FOUND THEN
      v_count := v_count + 1;
    END IF;
    
    -- Gerar fundo de reserva se configurado
    IF v_config.fundo_reserva_percentual > 0 THEN
      INSERT INTO public.taxas_unidades (
        condominio_id,
        unidade_id,
        mes_referencia,
        tipo,
        valor_base,
        data_vencimento,
        status
      ) VALUES (
        p_condominio_id,
        v_unidade.id,
        p_mes_referencia,
        'fundo_reserva',
        v_valor_taxa * (v_config.fundo_reserva_percentual / 100),
        v_data_vencimento,
        'pendente'
      )
      ON CONFLICT (unidade_id, mes_referencia, tipo) DO NOTHING;
    END IF;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- FUNCTION: Criar snapshot mensal
-- ============================================
CREATE OR REPLACE FUNCTION public.criar_snapshot_mensal(
  p_condominio_id UUID,
  p_mes_referencia DATE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_conta RECORD;
  v_saldo_inicial DECIMAL;
  v_entradas DECIMAL;
  v_saidas DECIMAL;
BEGIN
  -- Verificar permissão
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Apenas SuperAdmin pode criar snapshots';
  END IF;
  
  FOR v_conta IN
    SELECT id FROM public.contas_bancarias
    WHERE condominio_id = p_condominio_id
      AND deleted_at IS NULL
  LOOP
    -- Buscar saldo inicial (do snapshot anterior ou saldo inicial da conta)
    SELECT COALESCE(saldo_final, 0) INTO v_saldo_inicial
    FROM public.contas_bancarias_historico
    WHERE conta_bancaria_id = v_conta.id
      AND mes_referencia = (p_mes_referencia - INTERVAL '1 month')::DATE;
    
    IF v_saldo_inicial IS NULL THEN
      SELECT saldo_inicial INTO v_saldo_inicial
      FROM public.contas_bancarias
      WHERE id = v_conta.id;
    END IF;
    
    -- Calcular entradas
    SELECT COALESCE(SUM(valor), 0) INTO v_entradas
    FROM public.lancamentos_financeiros
    WHERE conta_bancaria_id = v_conta.id
      AND date_trunc('month', data_competencia) = date_trunc('month', p_mes_referencia)
      AND tipo = 'receita'
      AND status = 'confirmado'
      AND deleted_at IS NULL;
    
    -- Calcular saídas
    SELECT COALESCE(SUM(valor), 0) INTO v_saidas
    FROM public.lancamentos_financeiros
    WHERE conta_bancaria_id = v_conta.id
      AND date_trunc('month', data_competencia) = date_trunc('month', p_mes_referencia)
      AND tipo = 'despesa'
      AND status = 'confirmado'
      AND deleted_at IS NULL;
    
    -- Inserir ou atualizar snapshot
    INSERT INTO public.contas_bancarias_historico (
      conta_bancaria_id,
      condominio_id,
      mes_referencia,
      saldo_inicial,
      total_entradas,
      total_saidas,
      saldo_final
    ) VALUES (
      v_conta.id,
      p_condominio_id,
      p_mes_referencia,
      v_saldo_inicial,
      v_entradas,
      v_saidas,
      v_saldo_inicial + v_entradas - v_saidas
    )
    ON CONFLICT (conta_bancaria_id, mes_referencia) DO UPDATE SET
      saldo_inicial = EXCLUDED.saldo_inicial,
      total_entradas = EXCLUDED.total_entradas,
      total_saidas = EXCLUDED.total_saidas,
      saldo_final = EXCLUDED.saldo_final;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- FUNCTION: Publicar prestação de contas
-- ============================================
CREATE OR REPLACE FUNCTION public.publicar_prestacao_contas(
  p_prestacao_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_prestacao RECORD;
  v_saldo RECORD;
BEGIN
  SELECT * INTO v_prestacao
  FROM public.prestacao_contas
  WHERE id = p_prestacao_id;
  
  IF v_prestacao IS NULL THEN
    RAISE EXCEPTION 'Prestação não encontrada';
  END IF;
  
  -- Verificar permissão
  IF NOT (public.is_superadmin() OR public.is_sindico(v_prestacao.condominio_id)) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;
  
  -- Verificar status
  IF v_prestacao.status NOT IN ('rascunho', 'aprovado') THEN
    RAISE EXCEPTION 'Prestação não pode ser publicada (status: %)', v_prestacao.status;
  END IF;
  
  -- Calcular saldos
  SELECT * INTO v_saldo
  FROM public.calcular_saldo_periodo(v_prestacao.condominio_id, v_prestacao.mes_referencia);
  
  -- Atualizar prestação
  UPDATE public.prestacao_contas
  SET 
    saldo_anterior = v_saldo.saldo_anterior,
    total_receitas = v_saldo.total_receitas,
    total_despesas = v_saldo.total_despesas,
    saldo_atual = v_saldo.saldo_atual,
    status = 'publicado',
    publicado_por = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()),
    publicado_em = NOW()
  WHERE id = p_prestacao_id;
  
  -- Criar snapshot mensal
  PERFORM public.criar_snapshot_mensal(v_prestacao.condominio_id, v_prestacao.mes_referencia);
  
  -- Bloquear lançamentos do período
  UPDATE public.lancamentos_financeiros
  SET periodo_bloqueado = true
  WHERE condominio_id = v_prestacao.condominio_id
    AND date_trunc('month', data_competencia) = date_trunc('month', v_prestacao.mes_referencia);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- RLS: categorias_financeiras
-- ============================================
ALTER TABLE public.categorias_financeiras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "superadmin_all_categorias" ON public.categorias_financeiras
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());
CREATE POLICY "sindico_manage_categorias" ON public.categorias_financeiras
  FOR ALL TO authenticated
  USING (public.is_sindico(condominio_id))
  WITH CHECK (public.is_sindico(condominio_id));
CREATE POLICY "users_view_categorias" ON public.categorias_financeiras
  FOR SELECT TO authenticated
  USING (
    condominio_id = public.get_user_condominio_id()
    AND ativo = true
    AND deleted_at IS NULL
  );
-- ============================================
-- RLS: contas_bancarias
-- ============================================
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "superadmin_all_contas" ON public.contas_bancarias
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());
CREATE POLICY "sindico_manage_contas" ON public.contas_bancarias
  FOR ALL TO authenticated
  USING (public.is_sindico(condominio_id))
  WITH CHECK (public.is_sindico(condominio_id));
-- Moradores NÃO veem contas bancárias (dados sensíveis)

-- ============================================
-- RLS: contas_bancarias_historico
-- ============================================
ALTER TABLE public.contas_bancarias_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "superadmin_all_hist_contas" ON public.contas_bancarias_historico
  FOR ALL TO authenticated
  USING (public.is_superadmin());
CREATE POLICY "sindico_view_hist_contas" ON public.contas_bancarias_historico
  FOR SELECT TO authenticated
  USING (public.is_sindico(condominio_id));
-- ============================================
-- RLS: lancamentos_financeiros
-- ============================================
ALTER TABLE public.lancamentos_financeiros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "superadmin_all_lancamentos" ON public.lancamentos_financeiros
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());
CREATE POLICY "sindico_manage_lancamentos" ON public.lancamentos_financeiros
  FOR ALL TO authenticated
  USING (public.is_sindico(condominio_id))
  WITH CHECK (public.is_sindico(condominio_id));
-- Moradores veem lançamentos publicados (resumo)
CREATE POLICY "users_view_lancamentos_publicados" ON public.lancamentos_financeiros
  FOR SELECT TO authenticated
  USING (
    condominio_id = public.get_user_condominio_id()
    AND status = 'confirmado'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.prestacao_contas pc
      WHERE pc.condominio_id = lancamentos_financeiros.condominio_id
        AND pc.mes_referencia = date_trunc('month', lancamentos_financeiros.data_competencia)::DATE
        AND pc.status = 'publicado'
    )
  );
-- ============================================
-- RLS: prestacao_contas
-- ============================================
ALTER TABLE public.prestacao_contas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "superadmin_all_prestacao" ON public.prestacao_contas
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());
CREATE POLICY "sindico_manage_prestacao" ON public.prestacao_contas
  FOR ALL TO authenticated
  USING (public.is_sindico(condominio_id))
  WITH CHECK (public.is_sindico(condominio_id));
-- Conselho pode aprovar
CREATE POLICY "conselho_aprovar_prestacao" ON public.prestacao_contas
  FOR UPDATE TO authenticated
  USING (
    condominio_id = public.get_user_condominio_id()
    AND public.get_user_role() = 'conselheiro'
    AND status = 'em_revisao'
  )
  WITH CHECK (
    condominio_id = public.get_user_condominio_id()
    AND public.get_user_role() = 'conselheiro'
  );
-- Moradores veem prestações publicadas
CREATE POLICY "users_view_prestacao_publicada" ON public.prestacao_contas
  FOR SELECT TO authenticated
  USING (
    condominio_id = public.get_user_condominio_id()
    AND status = 'publicado'
  );
-- ============================================
-- RLS: taxas_unidades
-- ============================================
ALTER TABLE public.taxas_unidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "superadmin_all_taxas" ON public.taxas_unidades
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());
CREATE POLICY "sindico_manage_taxas" ON public.taxas_unidades
  FOR ALL TO authenticated
  USING (public.is_sindico(condominio_id))
  WITH CHECK (public.is_sindico(condominio_id));
-- Morador vê apenas suas próprias taxas
CREATE POLICY "morador_own_taxas" ON public.taxas_unidades
  FOR SELECT TO authenticated
  USING (
    unidade_id = (SELECT unidade_id FROM public.usuarios WHERE auth_id = auth.uid())
  );
-- ============================================
-- RLS: configuracoes_financeiras
-- ============================================
ALTER TABLE public.configuracoes_financeiras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "superadmin_all_config_fin" ON public.configuracoes_financeiras
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());
CREATE POLICY "sindico_manage_config_fin" ON public.configuracoes_financeiras
  FOR ALL TO authenticated
  USING (public.is_sindico(condominio_id))
  WITH CHECK (public.is_sindico(condominio_id));
CREATE POLICY "users_view_config_fin" ON public.configuracoes_financeiras
  FOR SELECT TO authenticated
  USING (condominio_id = public.get_user_condominio_id());
