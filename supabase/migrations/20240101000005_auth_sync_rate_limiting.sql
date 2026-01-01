-- ============================================
-- VERSIX NORMA - MIGRATION 005: AUTH SYNC & RATE LIMITING
-- ============================================
-- Trigger para sincronizar auth.users com tabela usuarios
-- Rate limiting melhorado para proteção contra brute force
-- ============================================

-- ============================================
-- FUNCTION: Criar usuário na tabela public.usuarios
-- quando um novo usuário é criado no auth.users
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_condominio_id UUID;
  v_codigo_convite VARCHAR(8);
  v_role public.user_role;
  v_status public.user_status;
BEGIN
  -- Extrair metadata do signup
  v_codigo_convite := NEW.raw_user_meta_data->>'codigo_convite';
  
  -- Se tem código de convite, é morador
  IF v_codigo_convite IS NOT NULL AND v_codigo_convite != '' THEN
    -- Buscar condomínio pelo código
    SELECT id INTO v_condominio_id
    FROM public.condominios
    WHERE codigo_convite = v_codigo_convite
      AND ativo = true
      AND deleted_at IS NULL;
    
    IF v_condominio_id IS NULL THEN
      RAISE EXCEPTION 'Código de convite inválido ou expirado';
    END IF;
    
    v_role := 'morador';
    v_status := 'pending'; -- Aguarda aprovação do síndico
  ELSE
    -- Sem código = candidato a síndico (precisa validar ata)
    v_role := 'sindico';
    v_status := 'pending'; -- Aguarda validação da ata
  END IF;
  
  -- Inserir na tabela usuarios
  INSERT INTO public.usuarios (
    auth_id,
    condominio_id,
    nome,
    email,
    telefone,
    role,
    status
  ) VALUES (
    NEW.id,
    v_condominio_id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'telefone',
    v_role,
    v_status
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Trigger no auth.users (executado após INSERT)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- ============================================
-- FUNCTION: Atualizar ultimo_acesso no login
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.usuarios
  SET ultimo_acesso = NOW()
  WHERE auth_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- FUNCTION: Rate Limiting para login
-- ============================================
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier VARCHAR,
  p_endpoint VARCHAR DEFAULT 'login',
  p_max_requests INTEGER DEFAULT 5,
  p_window_minutes INTEGER DEFAULT 15
)
RETURNS TABLE (
  allowed BOOLEAN,
  remaining INTEGER,
  reset_at TIMESTAMPTZ
) AS $$
DECLARE
  v_current_count INTEGER;
  v_window_start TIMESTAMPTZ;
  v_reset_at TIMESTAMPTZ;
BEGIN
  v_window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  v_reset_at := NOW() + (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Limpar registros antigos
  DELETE FROM public.rate_limits
  WHERE window_start < v_window_start;
  
  -- Buscar ou criar registro
  INSERT INTO public.rate_limits (identifier, endpoint, requests, window_start)
  VALUES (p_identifier, p_endpoint, 1, NOW())
  ON CONFLICT (identifier, endpoint) 
  DO UPDATE SET 
    requests = CASE 
      WHEN rate_limits.window_start < v_window_start THEN 1
      ELSE rate_limits.requests + 1
    END,
    window_start = CASE
      WHEN rate_limits.window_start < v_window_start THEN NOW()
      ELSE rate_limits.window_start
    END
  RETURNING requests INTO v_current_count;
  
  -- Retornar resultado
  RETURN QUERY SELECT 
    v_current_count <= p_max_requests,
    GREATEST(0, p_max_requests - v_current_count),
    v_reset_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- FUNCTION: Limpar rate limit (para testes/admin)
-- ============================================
CREATE OR REPLACE FUNCTION public.clear_rate_limit(
  p_identifier VARCHAR,
  p_endpoint VARCHAR DEFAULT 'login'
)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Apenas SuperAdmin pode limpar rate limits';
  END IF;
  
  DELETE FROM public.rate_limits
  WHERE identifier = p_identifier
    AND (p_endpoint IS NULL OR endpoint = p_endpoint);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- TABELA: codigos_convite_uso (tracking de uso)
-- ============================================
CREATE TABLE IF NOT EXISTS public.codigos_convite_uso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  codigo_usado VARCHAR(8) NOT NULL,
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  usado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_convite_uso_condominio ON public.codigos_convite_uso(condominio_id);
CREATE INDEX idx_convite_uso_codigo ON public.codigos_convite_uso(codigo_usado);
-- RLS
ALTER TABLE public.codigos_convite_uso ENABLE ROW LEVEL SECURITY;
CREATE POLICY "superadmin_all_convite_uso" ON public.codigos_convite_uso
  FOR ALL TO authenticated
  USING (public.is_superadmin());
CREATE POLICY "sindico_view_convite_uso" ON public.codigos_convite_uso
  FOR SELECT TO authenticated
  USING (public.is_sindico(condominio_id));
-- ============================================
-- Adicionar coluna de expiração do código de convite
-- ============================================
ALTER TABLE public.condominios 
ADD COLUMN IF NOT EXISTS codigo_convite_expira_em TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days');
ALTER TABLE public.condominios
ADD COLUMN IF NOT EXISTS codigo_convite_validade_dias INTEGER DEFAULT 7;
-- ============================================
-- FUNCTION: Regenerar código de convite (atualizada)
-- ============================================
CREATE OR REPLACE FUNCTION public.regenerate_invite_code(
  p_condominio_id UUID,
  p_validade_dias INTEGER DEFAULT NULL
)
RETURNS TABLE (
  codigo VARCHAR(8),
  expira_em TIMESTAMPTZ
) AS $$
DECLARE
  v_new_code VARCHAR(8);
  v_validade INTEGER;
  v_expira_em TIMESTAMPTZ;
BEGIN
  -- Verificar permissão
  IF NOT (public.is_superadmin() OR public.is_sindico(p_condominio_id)) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;
  
  -- Gerar novo código
  v_new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 8));
  
  -- Usar validade customizada ou padrão do condomínio
  SELECT COALESCE(p_validade_dias, codigo_convite_validade_dias, 7)
  INTO v_validade
  FROM public.condominios
  WHERE id = p_condominio_id;
  
  v_expira_em := NOW() + (v_validade || ' days')::INTERVAL;
  
  -- Atualizar condomínio
  UPDATE public.condominios 
  SET 
    codigo_convite = v_new_code,
    codigo_convite_expira_em = v_expira_em,
    updated_at = NOW()
  WHERE id = p_condominio_id;
  
  RETURN QUERY SELECT v_new_code, v_expira_em;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- FUNCTION: Validar código de convite
-- ============================================
CREATE OR REPLACE FUNCTION public.validate_invite_code(p_codigo VARCHAR)
RETURNS TABLE (
  valid BOOLEAN,
  condominio_id UUID,
  condominio_nome VARCHAR,
  error_message TEXT
) AS $$
DECLARE
  v_condo RECORD;
BEGIN
  -- Buscar condomínio
  SELECT c.id, c.nome, c.codigo_convite_expira_em, c.ativo, c.deleted_at
  INTO v_condo
  FROM public.condominios c
  WHERE c.codigo_convite = UPPER(p_codigo);
  
  -- Código não existe
  IF v_condo IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, 'Código de convite inválido'::TEXT;
    RETURN;
  END IF;
  
  -- Condomínio inativo ou deletado
  IF NOT v_condo.ativo OR v_condo.deleted_at IS NOT NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, 'Condomínio não está mais ativo'::TEXT;
    RETURN;
  END IF;
  
  -- Código expirado
  IF v_condo.codigo_convite_expira_em IS NOT NULL AND v_condo.codigo_convite_expira_em < NOW() THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, 'Código de convite expirado. Solicite um novo ao síndico.'::TEXT;
    RETURN;
  END IF;
  
  -- Válido
  RETURN QUERY SELECT true, v_condo.id, v_condo.nome::VARCHAR, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- FUNCTION: Aprovar usuário (síndico aprova morador)
-- ============================================
CREATE OR REPLACE FUNCTION public.approve_user(
  p_usuario_id UUID,
  p_unidade_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_usuario RECORD;
BEGIN
  -- Buscar usuário
  SELECT * INTO v_usuario
  FROM public.usuarios
  WHERE id = p_usuario_id;
  
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;
  
  -- Verificar permissão (SuperAdmin ou Síndico do condomínio)
  IF NOT (public.is_superadmin() OR public.is_sindico(v_usuario.condominio_id)) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;
  
  -- Verificar se está pendente
  IF v_usuario.status != 'pending' THEN
    RAISE EXCEPTION 'Usuário não está pendente de aprovação';
  END IF;
  
  -- Atualizar usuário
  UPDATE public.usuarios
  SET 
    status = 'active',
    unidade_id = COALESCE(p_unidade_id, unidade_id),
    updated_at = NOW()
  WHERE id = p_usuario_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- FUNCTION: Rejeitar usuário
-- ============================================
CREATE OR REPLACE FUNCTION public.reject_user(
  p_usuario_id UUID,
  p_motivo TEXT DEFAULT 'Cadastro rejeitado'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_usuario RECORD;
BEGIN
  -- Buscar usuário
  SELECT * INTO v_usuario
  FROM public.usuarios
  WHERE id = p_usuario_id;
  
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;
  
  -- Verificar permissão
  IF NOT (public.is_superadmin() OR public.is_sindico(v_usuario.condominio_id)) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;
  
  -- Soft delete
  UPDATE public.usuarios
  SET 
    status = 'removed',
    deleted_at = NOW(),
    deleted_reason = p_motivo,
    updated_at = NOW()
  WHERE id = p_usuario_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- FUNCTION: Ativar síndico após validação de ata
-- ============================================
CREATE OR REPLACE FUNCTION public.activate_sindico(
  p_usuario_id UUID,
  p_condominio_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Apenas SuperAdmin pode ativar síndico
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Apenas SuperAdmin pode ativar síndicos';
  END IF;
  
  -- Atualizar usuário
  UPDATE public.usuarios
  SET 
    status = 'active',
    role = 'sindico',
    condominio_id = p_condominio_id,
    updated_at = NOW()
  WHERE id = p_usuario_id
    AND status = 'pending';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
