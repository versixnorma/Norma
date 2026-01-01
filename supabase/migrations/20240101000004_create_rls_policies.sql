-- ============================================
-- VERSIX NORMA - MIGRATION 004: RLS POLICIES
-- ============================================
-- Row Level Security para isolamento multi-tenant
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.condominios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades_habitacionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atas_validacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessoes_impersonate ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- ============================================
-- POLICIES: condominios
-- ============================================

-- SuperAdmin vê todos
CREATE POLICY "superadmin_all_condominios" ON public.condominios
  FOR ALL
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());
-- Usuários veem apenas seu condomínio (não deletado)
CREATE POLICY "users_view_own_condominio" ON public.condominios
  FOR SELECT
  TO authenticated
  USING (
    id = public.get_user_condominio_id() 
    AND deleted_at IS NULL
  );
-- ============================================
-- POLICIES: blocos
-- ============================================

-- SuperAdmin vê todos
CREATE POLICY "superadmin_all_blocos" ON public.blocos
  FOR ALL
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());
-- Usuários veem blocos do seu condomínio
CREATE POLICY "users_view_condominio_blocos" ON public.blocos
  FOR SELECT
  TO authenticated
  USING (condominio_id = public.get_user_condominio_id());
-- Síndico pode gerenciar blocos
CREATE POLICY "sindico_manage_blocos" ON public.blocos
  FOR ALL
  TO authenticated
  USING (public.is_sindico(condominio_id))
  WITH CHECK (public.is_sindico(condominio_id));
-- ============================================
-- POLICIES: unidades_habitacionais
-- ============================================

-- SuperAdmin vê todas
CREATE POLICY "superadmin_all_unidades" ON public.unidades_habitacionais
  FOR ALL
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());
-- Usuários veem unidades do seu condomínio
CREATE POLICY "users_view_condominio_unidades" ON public.unidades_habitacionais
  FOR SELECT
  TO authenticated
  USING (condominio_id = public.get_user_condominio_id());
-- Síndico pode gerenciar unidades
CREATE POLICY "sindico_manage_unidades" ON public.unidades_habitacionais
  FOR ALL
  TO authenticated
  USING (public.is_sindico(condominio_id))
  WITH CHECK (public.is_sindico(condominio_id));
-- ============================================
-- POLICIES: usuarios
-- ============================================

-- SuperAdmin vê todos (inclusive deletados para auditoria)
CREATE POLICY "superadmin_all_usuarios" ON public.usuarios
  FOR ALL
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());
-- Usuários veem outros do mesmo condomínio (não deletados)
CREATE POLICY "users_view_condominio_usuarios" ON public.usuarios
  FOR SELECT
  TO authenticated
  USING (
    (condominio_id = public.get_user_condominio_id() AND deleted_at IS NULL)
    OR auth_id = auth.uid()
  );
-- Usuário pode atualizar próprio perfil
CREATE POLICY "users_update_self" ON public.usuarios
  FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());
-- Síndico pode gerenciar usuários do condomínio (exceto outros síndicos)
CREATE POLICY "sindico_manage_usuarios" ON public.usuarios
  FOR ALL
  TO authenticated
  USING (
    public.is_sindico(condominio_id)
    AND role NOT IN ('superadmin', 'sindico', 'admin_condo')
    AND deleted_at IS NULL
  )
  WITH CHECK (
    public.is_sindico(condominio_id)
    AND role NOT IN ('superadmin', 'sindico', 'admin_condo')
  );
-- ============================================
-- POLICIES: comunicados
-- ============================================

-- SuperAdmin vê todos
CREATE POLICY "superadmin_all_comunicados" ON public.comunicados
  FOR ALL
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());
-- Usuários veem comunicados publicados do seu condomínio
CREATE POLICY "users_view_comunicados" ON public.comunicados
  FOR SELECT
  TO authenticated
  USING (
    condominio_id = public.get_user_condominio_id()
    AND (
      publicado = true 
      OR autor_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
    )
  );
-- Síndico pode gerenciar comunicados
CREATE POLICY "sindico_manage_comunicados" ON public.comunicados
  FOR ALL
  TO authenticated
  USING (public.is_sindico(condominio_id))
  WITH CHECK (public.is_sindico(condominio_id));
-- Conselheiros podem criar comunicados
CREATE POLICY "conselheiro_create_comunicados" ON public.comunicados
  FOR INSERT
  TO authenticated
  WITH CHECK (
    condominio_id = public.get_user_condominio_id()
    AND public.get_user_role() IN ('sindico', 'subsindico', 'admin_condo', 'conselheiro')
  );
-- ============================================
-- POLICIES: atas_validacao
-- ============================================

-- SuperAdmin vê todas
CREATE POLICY "superadmin_all_atas" ON public.atas_validacao
  FOR ALL
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());
-- Usuários veem atas validadas do seu condomínio
CREATE POLICY "users_view_atas_validadas" ON public.atas_validacao
  FOR SELECT
  TO authenticated
  USING (
    condominio_id = public.get_user_condominio_id()
    AND status = 'validada'
  );
-- Síndico vê todas as atas do condomínio
CREATE POLICY "sindico_view_all_atas" ON public.atas_validacao
  FOR SELECT
  TO authenticated
  USING (public.is_sindico(condominio_id));
-- Síndico pode criar/editar atas em rascunho
CREATE POLICY "sindico_manage_atas" ON public.atas_validacao
  FOR ALL
  TO authenticated
  USING (
    public.is_sindico(condominio_id)
    AND status IN ('rascunho', 'pendente_validacao')
  )
  WITH CHECK (public.is_sindico(condominio_id));
-- ============================================
-- POLICIES: audit_logs
-- ============================================

-- Apenas SuperAdmin vê logs de auditoria
CREATE POLICY "superadmin_view_audit" ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_superadmin());
-- Ninguém pode modificar logs (imutáveis)
-- INSERT é feito via trigger com SECURITY DEFINER

-- ============================================
-- POLICIES: sessoes_impersonate
-- ============================================

-- Apenas SuperAdmin pode gerenciar sessões de impersonate
CREATE POLICY "superadmin_manage_impersonate" ON public.sessoes_impersonate
  FOR ALL
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());
-- ============================================
-- POLICIES: feature_flags
-- ============================================

-- SuperAdmin gerencia feature flags
CREATE POLICY "superadmin_manage_flags" ON public.feature_flags
  FOR ALL
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());
-- Todos podem ler feature flags ativas
CREATE POLICY "all_read_active_flags" ON public.feature_flags
  FOR SELECT
  TO authenticated
  USING (ativo = true);
-- ============================================
-- POLICIES: rate_limits
-- ============================================

-- Rate limits são gerenciados pelo sistema (service role)
-- Usuários não têm acesso direto
CREATE POLICY "system_manage_rate_limits" ON public.rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
