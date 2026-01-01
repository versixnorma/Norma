-- ============================================
-- VERSIX NORMA - MIGRATION 007: RLS MÓDULOS OPERACIONAIS
-- Sprint 3: Policies para Comunicados, Ocorrências, Chamados, FAQ
-- ============================================

-- ============================================
-- RLS: comunicados_leitura
-- ============================================
ALTER TABLE public.comunicados_leitura ENABLE ROW LEVEL SECURITY;
-- Usuário vê apenas suas próprias leituras
CREATE POLICY "users_own_leitura" ON public.comunicados_leitura
  FOR ALL TO authenticated
  USING (usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()))
  WITH CHECK (usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()));
-- ============================================
-- RLS: ocorrencias
-- ============================================
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;
-- SuperAdmin vê todas
CREATE POLICY "superadmin_all_ocorrencias" ON public.ocorrencias
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());
-- Síndico vê todas do condomínio
CREATE POLICY "sindico_view_ocorrencias" ON public.ocorrencias
  FOR SELECT TO authenticated
  USING (
    public.is_sindico(condominio_id)
    AND deleted_at IS NULL
  );
-- Síndico pode gerenciar
CREATE POLICY "sindico_manage_ocorrencias" ON public.ocorrencias
  FOR ALL TO authenticated
  USING (public.is_sindico(condominio_id))
  WITH CHECK (public.is_sindico(condominio_id));
-- Morador vê próprias ocorrências (mesmo anônimas)
CREATE POLICY "morador_own_ocorrencias" ON public.ocorrencias
  FOR SELECT TO authenticated
  USING (
    reportado_por = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
    AND deleted_at IS NULL
  );
-- Morador cria ocorrências no próprio condomínio
CREATE POLICY "morador_create_ocorrencias" ON public.ocorrencias
  FOR INSERT TO authenticated
  WITH CHECK (
    condominio_id = public.get_user_condominio_id()
    AND reportado_por = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
  );
-- Morador pode atualizar próprias ocorrências (apenas se abertas)
CREATE POLICY "morador_update_own_ocorrencias" ON public.ocorrencias
  FOR UPDATE TO authenticated
  USING (
    reportado_por = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
    AND status = 'aberta'
  )
  WITH CHECK (
    reportado_por = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
  );
-- ============================================
-- RLS: ocorrencias_historico
-- ============================================
ALTER TABLE public.ocorrencias_historico ENABLE ROW LEVEL SECURITY;
-- SuperAdmin vê todo histórico
CREATE POLICY "superadmin_all_historico" ON public.ocorrencias_historico
  FOR SELECT TO authenticated
  USING (public.is_superadmin());
-- Síndico vê histórico do condomínio
CREATE POLICY "sindico_view_historico" ON public.ocorrencias_historico
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ocorrencias o
      WHERE o.id = ocorrencia_id
        AND public.is_sindico(o.condominio_id)
    )
  );
-- Morador vê histórico das próprias ocorrências
CREATE POLICY "morador_view_own_historico" ON public.ocorrencias_historico
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ocorrencias o
      WHERE o.id = ocorrencia_id
        AND o.reportado_por = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
    )
  );
-- ============================================
-- RLS: chamados
-- ============================================
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;
-- SuperAdmin vê todos
CREATE POLICY "superadmin_all_chamados" ON public.chamados
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());
-- Síndico vê todos do condomínio
CREATE POLICY "sindico_view_chamados" ON public.chamados
  FOR SELECT TO authenticated
  USING (
    public.is_sindico(condominio_id)
    AND deleted_at IS NULL
  );
-- Síndico pode gerenciar
CREATE POLICY "sindico_manage_chamados" ON public.chamados
  FOR ALL TO authenticated
  USING (public.is_sindico(condominio_id))
  WITH CHECK (public.is_sindico(condominio_id));
-- Morador vê próprios chamados
CREATE POLICY "morador_own_chamados" ON public.chamados
  FOR SELECT TO authenticated
  USING (
    solicitante_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
    AND deleted_at IS NULL
  );
-- Morador cria chamados
CREATE POLICY "morador_create_chamados" ON public.chamados
  FOR INSERT TO authenticated
  WITH CHECK (
    condominio_id = public.get_user_condominio_id()
    AND solicitante_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
  );
-- Morador pode atualizar próprios chamados (avaliação, etc)
CREATE POLICY "morador_update_own_chamados" ON public.chamados
  FOR UPDATE TO authenticated
  USING (
    solicitante_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
  )
  WITH CHECK (
    solicitante_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
  );
-- ============================================
-- RLS: chamados_mensagens
-- ============================================
ALTER TABLE public.chamados_mensagens ENABLE ROW LEVEL SECURITY;
-- SuperAdmin vê todas
CREATE POLICY "superadmin_all_mensagens" ON public.chamados_mensagens
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());
-- Síndico vê mensagens de chamados do condomínio
CREATE POLICY "sindico_view_mensagens" ON public.chamados_mensagens
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chamados c
      WHERE c.id = chamado_id
        AND public.is_sindico(c.condominio_id)
    )
  );
-- Síndico pode criar mensagens
CREATE POLICY "sindico_create_mensagens" ON public.chamados_mensagens
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chamados c
      WHERE c.id = chamado_id
        AND public.is_sindico(c.condominio_id)
    )
  );
-- Morador vê mensagens dos próprios chamados (exceto internas)
CREATE POLICY "morador_view_mensagens" ON public.chamados_mensagens
  FOR SELECT TO authenticated
  USING (
    interno = false
    AND EXISTS (
      SELECT 1 FROM public.chamados c
      WHERE c.id = chamado_id
        AND c.solicitante_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
    )
  );
-- Morador pode criar mensagens nos próprios chamados
CREATE POLICY "morador_create_mensagens" ON public.chamados_mensagens
  FOR INSERT TO authenticated
  WITH CHECK (
    interno = false
    AND EXISTS (
      SELECT 1 FROM public.chamados c
      WHERE c.id = chamado_id
        AND c.solicitante_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
    )
  );
-- ============================================
-- RLS: faq
-- ============================================
ALTER TABLE public.faq ENABLE ROW LEVEL SECURITY;
-- SuperAdmin vê todos
CREATE POLICY "superadmin_all_faq" ON public.faq
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());
-- Síndico gerencia FAQ do condomínio
CREATE POLICY "sindico_manage_faq" ON public.faq
  FOR ALL TO authenticated
  USING (public.is_sindico(condominio_id))
  WITH CHECK (public.is_sindico(condominio_id));
-- Todos do condomínio veem FAQs ativos
CREATE POLICY "users_view_active_faq" ON public.faq
  FOR SELECT TO authenticated
  USING (
    condominio_id = public.get_user_condominio_id()
    AND ativo = true
    AND deleted_at IS NULL
  );
-- ============================================
-- RLS: faq_votos
-- ============================================
ALTER TABLE public.faq_votos ENABLE ROW LEVEL SECURITY;
-- Usuário vê/gerencia apenas seus votos
CREATE POLICY "users_own_faq_votos" ON public.faq_votos
  FOR ALL TO authenticated
  USING (usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()))
  WITH CHECK (usuario_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()));
