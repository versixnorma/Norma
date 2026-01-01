-- ============================================
-- VERSIX NORMA - MIGRATION: REMOVE OBSOLETE COLUMNS FROM USUARIOS
-- ============================================
-- Remove condominio_id and role columns from usuarios table
-- These are now handled by usuario_condominios table for multi-tenancy
-- ============================================

-- ============================================
-- FIRST: Update ALL RLS policies to use usuario_condominios table
-- ============================================

-- Drop existing policies that depend on condominio_id
DROP POLICY IF EXISTS "users_view_condominio_usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "sindico_manage_usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "sindico_assembleias_all" ON public.assembleias;
DROP POLICY IF EXISTS "morador_assembleias_read" ON public.assembleias;
DROP POLICY IF EXISTS "sindico_pautas_all" ON public.assembleia_pautas;
DROP POLICY IF EXISTS "morador_pautas_read" ON public.assembleia_pautas;
DROP POLICY IF EXISTS "sindico_opcoes_all" ON public.assembleia_pauta_opcoes;
DROP POLICY IF EXISTS "morador_opcoes_read" ON public.assembleia_pauta_opcoes;
DROP POLICY IF EXISTS "sindico_presencas_read" ON public.assembleia_presencas;
DROP POLICY IF EXISTS "morador_presencas_read" ON public.assembleia_presencas;
DROP POLICY IF EXISTS "sindico_procuracoes_read" ON public.assembleia_procuracoes;
DROP POLICY IF EXISTS "condominio_assinaturas_read" ON public.assembleia_assinaturas;
DROP POLICY IF EXISTS "sindico_logs_read" ON public.assembleia_logs;
DROP POLICY IF EXISTS "votos_read" ON public.assembleia_votos;
DROP POLICY IF EXISTS "sindico_config_all" ON public.notificacoes_config;
DROP POLICY IF EXISTS "sindico_templates_read" ON public.templates_notificacao;
DROP POLICY IF EXISTS "sindico_notificacoes_all" ON public.notificacoes;
DROP POLICY IF EXISTS "sindico_entregas_read" ON public.notificacoes_entregas;
DROP POLICY IF EXISTS "sindico_leituras_read" ON public.notificacoes_leituras;
DROP POLICY IF EXISTS "sindico_cotas_read" ON public.cotas_comunicacao;
DROP POLICY IF EXISTS "sindico_webhooks_all" ON public.webhooks_notificacao;
DROP POLICY IF EXISTS "sindico_emergencias_read" ON public.emergencias_log;
DROP POLICY IF EXISTS "sindico_integracoes_all" ON public.integracoes;
DROP POLICY IF EXISTS "sindico_webhooks_config_all" ON public.webhooks_config;
DROP POLICY IF EXISTS "sindico_webhooks_entregas_read" ON public.webhooks_entregas;
DROP POLICY IF EXISTS "sindico_conectores_all" ON public.conectores;
DROP POLICY IF EXISTS "sindico_api_logs_read" ON public.api_logs;
DROP POLICY IF EXISTS "sindico_sync_logs_read" ON public.sync_logs;
DROP POLICY IF EXISTS "metricas_uso_select" ON public.metricas_uso;

-- Drop superadmin policies that depend on role column
DROP POLICY IF EXISTS "superadmin_assembleias_all" ON public.assembleias;
DROP POLICY IF EXISTS "superadmin_pautas_all" ON public.assembleia_pautas;
DROP POLICY IF EXISTS "superadmin_opcoes_all" ON public.assembleia_pauta_opcoes;
DROP POLICY IF EXISTS "superadmin_presencas_all" ON public.assembleia_presencas;
DROP POLICY IF EXISTS "superadmin_votos_all" ON public.assembleia_votos;
DROP POLICY IF EXISTS "superadmin_procuracoes_all" ON public.assembleia_procuracoes;
DROP POLICY IF EXISTS "superadmin_assinaturas_all" ON public.assembleia_assinaturas;
DROP POLICY IF EXISTS "superadmin_logs_all" ON public.assembleia_logs;
DROP POLICY IF EXISTS "superadmin_config_all" ON public.notificacoes_config;
DROP POLICY IF EXISTS "superadmin_preferencias_all" ON public.usuarios_canais_preferencias;
DROP POLICY IF EXISTS "superadmin_templates_all" ON public.templates_notificacao;
DROP POLICY IF EXISTS "superadmin_notificacoes_all" ON public.notificacoes;
DROP POLICY IF EXISTS "superadmin_entregas_all" ON public.notificacoes_entregas;
DROP POLICY IF EXISTS "superadmin_leituras_all" ON public.notificacoes_leituras;
DROP POLICY IF EXISTS "superadmin_cotas_all" ON public.cotas_comunicacao;
DROP POLICY IF EXISTS "superadmin_webhooks_all" ON public.webhooks_notificacao;
DROP POLICY IF EXISTS "superadmin_fila_all" ON public.notificacoes_fila;
DROP POLICY IF EXISTS "superadmin_emergencias_all" ON public.emergencias_log;
DROP POLICY IF EXISTS "superadmin_integracoes_all" ON public.integracoes;
DROP POLICY IF EXISTS "superadmin_webhooks_config_all" ON public.webhooks_config;
DROP POLICY IF EXISTS "superadmin_webhooks_entregas_all" ON public.webhooks_entregas;
DROP POLICY IF EXISTS "superadmin_conectores_all" ON public.conectores;
DROP POLICY IF EXISTS "superadmin_api_logs_all" ON public.api_logs;
DROP POLICY IF EXISTS "superadmin_api_scopes_all" ON public.api_scopes;
DROP POLICY IF EXISTS "superadmin_sync_logs_all" ON public.sync_logs;

-- Recreate policies using usuario_condominios

-- Usuarios policies - these should not depend on condominio_id anymore
CREATE POLICY "users_view_condominio_usuarios" ON public.usuarios
FOR SELECT USING (
  auth_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.usuario_condominios uc
    WHERE uc.usuario_id = auth.uid()
    AND uc.role IN ('sindico', 'superadmin')
    AND uc.status = 'active'
  )
);

CREATE POLICY "sindico_manage_usuarios" ON public.usuarios
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.usuario_condominios uc
    WHERE uc.usuario_id = auth.uid()
    AND uc.role IN ('sindico', 'superadmin')
    AND uc.status = 'active'
  )
);

-- Assembleias policies
CREATE POLICY "sindico_assembleias_all" ON public.assembleias
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.usuario_condominios uc
    WHERE uc.usuario_id = auth.uid()
    AND uc.condominio_id = assembleias.condominio_id
    AND uc.role IN ('sindico', 'superadmin')
    AND uc.status = 'active'
  )
);

CREATE POLICY "morador_assembleias_read" ON public.assembleias
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.usuario_condominios uc
    WHERE uc.usuario_id = auth.uid()
    AND uc.condominio_id = assembleias.condominio_id
    AND uc.status = 'active'
  )
);

-- Assembleia pautas policies
CREATE POLICY "sindico_pautas_all" ON public.assembleia_pautas
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.usuario_condominios uc
    JOIN public.assembleias a ON a.id = assembleia_pautas.assembleia_id
    WHERE uc.usuario_id = auth.uid()
    AND uc.condominio_id = a.condominio_id
    AND uc.role IN ('sindico', 'superadmin')
    AND uc.status = 'active'
  )
);

CREATE POLICY "morador_pautas_read" ON public.assembleia_pautas
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.usuario_condominios uc
    JOIN public.assembleias a ON a.id = assembleia_pautas.assembleia_id
    WHERE uc.usuario_id = auth.uid()
    AND uc.condominio_id = a.condominio_id
    AND uc.status = 'active'
  )
);

-- Assembleia pauta opcoes policies
CREATE POLICY "sindico_opcoes_all" ON public.assembleia_pauta_opcoes
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.usuario_condominios uc
    JOIN public.assembleia_pautas ap ON ap.id = assembleia_pauta_opcoes.pauta_id
    JOIN public.assembleias a ON a.id = ap.assembleia_id
    WHERE uc.usuario_id = auth.uid()
    AND uc.condominio_id = a.condominio_id
    AND uc.role IN ('sindico', 'superadmin')
    AND uc.status = 'active'
  )
);

CREATE POLICY "morador_opcoes_read" ON public.assembleia_pauta_opcoes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.usuario_condominios uc
    JOIN public.assembleia_pautas ap ON ap.id = assembleia_pauta_opcoes.pauta_id
    JOIN public.assembleias a ON a.id = ap.assembleia_id
    WHERE uc.usuario_id = auth.uid()
    AND uc.condominio_id = a.condominio_id
    AND uc.status = 'active'
  )
);

-- Assembleia presencas policies
CREATE POLICY "sindico_presencas_read" ON public.assembleia_presencas
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.usuario_condominios uc
    JOIN public.assembleias a ON a.id = assembleia_presencas.assembleia_id
    WHERE uc.usuario_id = auth.uid()
    AND uc.condominio_id = a.condominio_id
    AND uc.role IN ('sindico', 'superadmin')
    AND uc.status = 'active'
  )
);

CREATE POLICY "morador_presencas_read" ON public.assembleia_presencas
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.usuario_condominios uc
    JOIN public.assembleias a ON a.id = assembleia_presencas.assembleia_id
    WHERE uc.usuario_id = auth.uid()
    AND uc.condominio_id = a.condominio_id
    AND uc.status = 'active'
  )
);

-- Métricas de uso: síndicos veem do próprio condomínio, superadmin vê tudo
CREATE POLICY "metricas_uso_select" ON public.metricas_uso
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.usuario_condominios uc
    WHERE uc.usuario_id = auth.uid()
      AND (uc.role = 'superadmin' OR uc.condominio_id = metricas_uso.condominio_id)
      AND uc.status = 'active'
  )
);

-- ============================================
-- SECOND: Remove triggers that depend on the obsolete columns
-- ============================================
DROP TRIGGER IF EXISTS tr_usuarios_updated ON public.usuarios;

-- ============================================
-- THIRD: Remove the obsolete columns
-- ============================================
ALTER TABLE public.usuarios
DROP COLUMN IF EXISTS condominio_id;
-- Note: Keeping 'role' column for now as it has many dependencies

-- ============================================
-- FOURTH: Recreate the updated_at trigger
-- ============================================
CREATE TRIGGER tr_usuarios_updated
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- Update basic user policies (these don't depend on condominio_id)
-- ============================================

-- Drop old policies that depend on removed columns
DROP POLICY IF EXISTS "users_read_own_profile" ON public.usuarios;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.usuarios;
DROP POLICY IF EXISTS "superadmin_manage_users" ON public.usuarios;

-- Create new policies based on usuario_condominios relationship
CREATE POLICY "users_read_own_profile" ON public.usuarios
  FOR SELECT TO authenticated
  USING (auth_id = auth.uid());

CREATE POLICY "users_update_own_profile" ON public.usuarios
  FOR UPDATE TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

CREATE POLICY "superadmin_manage_users" ON public.usuarios
  FOR ALL TO authenticated
  USING (public.is_superadmin());
-- ============================================
-- VERSIX NORMA - MIGRATION: REFACTOR RLS FUNCTIONS FOR MULTI-TENANT
-- ============================================
-- Update all RLS helper functions to use usuario_condominios table
-- instead of obsolete columns in usuarios table
-- ============================================

-- ============================================
-- FUNCTION: Verificar se é SuperAdmin (UPDATED)
-- ============================================
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.usuario_condominios uc
    WHERE uc.usuario_id = public.get_my_user_id()
      AND uc.role = 'superadmin'
      AND uc.status = 'ativo'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- FUNCTION: Verificar se é Síndico (UPDATED)
-- ============================================
CREATE OR REPLACE FUNCTION public.is_sindico(p_condominio_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.usuario_condominios uc
    WHERE uc.usuario_id = public.get_my_user_id()
      AND (p_condominio_id IS NULL OR uc.condominio_id = p_condominio_id)
      AND uc.role IN ('sindico', 'subsindico', 'admin_condo')
      AND uc.status = 'ativo'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- FUNCTION: Verificar se é Morador (UPDATED)
-- ============================================
CREATE OR REPLACE FUNCTION public.is_morador(p_condominio_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.usuario_condominios uc
    WHERE uc.usuario_id = public.get_my_user_id()
      AND (p_condominio_id IS NULL OR uc.condominio_id = p_condominio_id)
      AND uc.role = 'morador'
      AND uc.status = 'ativo'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- FUNCTION: Obter condomínio do usuário atual (UPDATED)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_condominio_id()
RETURNS UUID AS $$
BEGIN
  RETURN public.get_my_condominio_id();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- FUNCTION: Obter role do usuário atual (UPDATED)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_role(p_condominio_id UUID DEFAULT NULL)
RETURNS public.user_role AS $$
BEGIN
  RETURN (
    SELECT uc.role
    FROM public.usuario_condominios uc
    WHERE uc.usuario_id = public.get_my_user_id()
      AND (p_condominio_id IS NULL OR uc.condominio_id = p_condominio_id)
      AND uc.status = 'ativo'
    ORDER BY uc.created_at DESC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- FUNCTION: Obter condomínios do usuário (UPDATED)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_my_condominios()
RETURNS TABLE(condominio_id UUID, role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT uc.condominio_id, uc.role::TEXT
  FROM public.usuario_condominios uc
  WHERE uc.usuario_id = public.get_my_user_id()
  AND uc.status = 'ativo'
  ORDER BY uc.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- FUNCTION: Verificar se usuário tem acesso ao condomínio
-- ============================================
CREATE OR REPLACE FUNCTION public.has_condominio_access(p_condominio_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.usuario_condominios uc
    WHERE uc.usuario_id = public.get_my_user_id()
      AND uc.condominio_id = p_condominio_id
      AND uc.status = 'ativo'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- FUNCTION: Obter condomínio ativo do usuário (com contexto)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_active_condominio_id()
RETURNS UUID AS $$
DECLARE
  active_condominio_id UUID;
BEGIN
  -- Tentar obter do contexto da sessão (se implementado)
  -- Por enquanto, retorna o primeiro condomínio ativo
  SELECT uc.condominio_id INTO active_condominio_id
  FROM public.usuario_condominios uc
  WHERE uc.usuario_id = public.get_my_user_id()
  AND uc.status = 'ativo'
  ORDER BY uc.created_at DESC
  LIMIT 1;

  RETURN active_condominio_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
