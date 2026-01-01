-- ============================================
-- VERSIX NORMA - MIGRATION 003: FUNCTIONS & TRIGGERS
-- ============================================
-- Funções auxiliares e triggers de automação
-- ============================================

-- ============================================
-- FUNCTION: Atualizar updated_at automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Triggers de updated_at
CREATE TRIGGER tr_condominios_updated
  BEFORE UPDATE ON public.condominios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_blocos_updated
  BEFORE UPDATE ON public.blocos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_unidades_updated
  BEFORE UPDATE ON public.unidades_habitacionais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_usuarios_updated
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_comunicados_updated
  BEFORE UPDATE ON public.comunicados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_atas_updated
  BEFORE UPDATE ON public.atas_validacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_feature_flags_updated
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
-- ============================================
-- FUNCTION: Registrar auditoria
-- ============================================
CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_id UUID;
  v_condominio_id UUID;
BEGIN
  -- Tentar obter usuario_id do contexto
  BEGIN
    SELECT id INTO v_usuario_id
    FROM public.usuarios
    WHERE auth_id = auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_usuario_id := NULL;
  END;

-- Determinar condominio_id de forma segura usando informações do sistema
  BEGIN
    IF TG_OP = 'DELETE' THEN
      EXECUTE 'SELECT ($1).' || quote_ident('condominio_id') INTO v_condominio_id
      USING OLD;
    ELSE
      EXECUTE 'SELECT ($1).' || quote_ident('condominio_id') INTO v_condominio_id
      USING NEW;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Campo não existe, definir como NULL
    v_condominio_id := NULL;
  END;

  INSERT INTO public.audit_logs (
    usuario_id,
    condominio_id,
    acao,
    tabela,
    registro_id,
    dados_antes,
    dados_depois,
    ip_address
  ) VALUES (
    v_usuario_id,
    v_condominio_id,
    TG_OP,
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    inet_client_addr()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Triggers de auditoria
CREATE TRIGGER tr_audit_condominios
  AFTER INSERT OR UPDATE OR DELETE ON public.condominios
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER tr_audit_usuarios
  AFTER INSERT OR UPDATE OR DELETE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER tr_audit_comunicados
  AFTER INSERT OR UPDATE OR DELETE ON public.comunicados
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER tr_audit_atas
  AFTER INSERT OR UPDATE OR DELETE ON public.atas_validacao
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();
-- ============================================
-- FUNCTION: Verificar se é SuperAdmin
-- ============================================
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE auth_id = auth.uid()
      AND role = 'superadmin'
      AND status = 'active'
      AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
-- ============================================
-- FUNCTION: Verificar se é Síndico do condomínio
-- ============================================
CREATE OR REPLACE FUNCTION public.is_sindico(p_condominio_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE auth_id = auth.uid()
      AND (p_condominio_id IS NULL OR condominio_id = p_condominio_id)
      AND role IN ('sindico', 'subsindico', 'admin_condo')
      AND status = 'active'
      AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
-- ============================================
-- FUNCTION: Obter condomínio do usuário atual
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_condominio_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT condominio_id
    FROM public.usuarios
    WHERE auth_id = auth.uid()
      AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
-- ============================================
-- FUNCTION: Obter usuário atual
-- ============================================
CREATE OR REPLACE FUNCTION public.get_current_usuario()
RETURNS public.usuarios AS $$
DECLARE
  v_usuario public.usuarios;
BEGIN
  SELECT * INTO v_usuario
  FROM public.usuarios
  WHERE auth_id = auth.uid()
    AND deleted_at IS NULL;

  RETURN v_usuario;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
-- ============================================
-- FUNCTION: Obter role do usuário atual
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role AS $$
BEGIN
  RETURN (
    SELECT role
    FROM public.usuarios
    WHERE auth_id = auth.uid()
      AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
-- ============================================
-- FUNCTION: Gerar novo código de convite
-- ============================================
CREATE OR REPLACE FUNCTION public.regenerate_invite_code(p_condominio_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  new_code VARCHAR(8);
BEGIN
  -- Verificar permissão
  IF NOT (public.is_superadmin() OR public.is_sindico(p_condominio_id)) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;

  new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 8));

  UPDATE public.condominios
  SET codigo_convite = new_code, updated_at = NOW()
  WHERE id = p_condominio_id;

  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- FUNCTION: Verificar limite de usuários por UH
-- ============================================
CREATE OR REPLACE FUNCTION public.check_uh_user_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
  condo_tier public.tier_type;
BEGIN
  -- Pular verificação para SuperAdmin
  IF NEW.role = 'superadmin' THEN
    RETURN NEW;
  END IF;

  -- Pular se não tem unidade vinculada
  IF NEW.unidade_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Pular se é soft delete
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar tier do condomínio
  SELECT c.tier INTO condo_tier
  FROM public.condominios c
  JOIN public.unidades_habitacionais u ON u.condominio_id = c.id
  WHERE u.id = NEW.unidade_id
    AND c.deleted_at IS NULL;

  -- Definir limite baseado no tier
  max_allowed := CASE condo_tier
    WHEN 'starter' THEN 3
    WHEN 'professional' THEN 5
    WHEN 'enterprise' THEN 999
    ELSE 3
  END;

  -- Contar usuários atuais na UH (não deletados)
  SELECT COUNT(*) INTO current_count
  FROM public.usuarios
  WHERE unidade_id = NEW.unidade_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND status NOT IN ('removed', 'suspended')
    AND deleted_at IS NULL;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Limite de % usuários por unidade atingido (Tier: %)', max_allowed, condo_tier;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER tr_check_uh_limit
  BEFORE INSERT OR UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.check_uh_user_limit();
-- ============================================
-- FUNCTION: Soft delete de usuário (LGPD)
-- ============================================
CREATE OR REPLACE FUNCTION public.soft_delete_usuario(
  p_usuario_id UUID,
  p_motivo TEXT DEFAULT 'Solicitação do usuário'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_usuario public.usuarios;
BEGIN
  SELECT * INTO v_usuario FROM public.usuarios WHERE id = p_usuario_id;

  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  -- Verificar permissão
  IF NOT (
    public.is_superadmin()
    OR public.is_sindico(v_usuario.condominio_id)
    OR (SELECT auth_id FROM public.usuarios WHERE id = p_usuario_id) = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;

  -- Não pode deletar superadmin
  IF v_usuario.role = 'superadmin' THEN
    RAISE EXCEPTION 'Não é possível remover SuperAdmin';
  END IF;

  UPDATE public.usuarios
  SET
    deleted_at = NOW(),
    deleted_reason = p_motivo,
    status = 'removed',
    -- Anonimizar dados sensíveis (LGPD)
    email = 'deleted_' || id || '@removed.local',
    cpf = NULL,
    telefone = NULL,
    avatar_url = NULL
  WHERE id = p_usuario_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- FUNCTION: Soft delete de condomínio
-- ============================================
CREATE OR REPLACE FUNCTION public.soft_delete_condominio(p_condominio_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Apenas SuperAdmin pode deletar condomínio
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Apenas SuperAdmin pode remover condomínios';
  END IF;

  -- Soft delete do condomínio
  UPDATE public.condominios
  SET
    deleted_at = NOW(),
    ativo = false,
    codigo_convite = 'DELETED_' || SUBSTRING(id::TEXT FROM 1 FOR 8)
  WHERE id = p_condominio_id;

  -- Soft delete de todos os usuários do condomínio
  UPDATE public.usuarios
  SET
    deleted_at = NOW(),
    deleted_reason = 'Condomínio removido',
    status = 'removed'
  WHERE condominio_id = p_condominio_id
    AND role != 'superadmin'
    AND deleted_at IS NULL;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- FUNCTION: Verificar feature flag
-- ============================================
CREATE OR REPLACE FUNCTION public.check_feature_flag(
  p_nome VARCHAR,
  p_condominio_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_flag public.feature_flags;
  v_condo_tier public.tier_type;
BEGIN
  SELECT * INTO v_flag FROM public.feature_flags WHERE nome = p_nome;

  IF v_flag IS NULL OR NOT v_flag.ativo THEN
    RETURN FALSE;
  END IF;

  -- Global: ativo para todos
  IF v_flag.escopo = 'global' THEN
    RETURN TRUE;
  END IF;

  -- Por tier
  IF v_flag.escopo = 'tier' AND p_condominio_id IS NOT NULL THEN
    SELECT tier INTO v_condo_tier FROM public.condominios WHERE id = p_condominio_id;
    RETURN v_condo_tier = ANY(v_flag.tiers_habilitados);
  END IF;

  -- Por condomínio específico
  IF v_flag.escopo = 'condominio' THEN
    RETURN p_condominio_id = ANY(v_flag.condominios_habilitados);
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
-- ============================================
-- FUNCTION: Limpar rate limits expirados
-- ============================================
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
