-- Sprint 4: Analytics & Reports - Tables, Materialized Views, Indexes, RLS
-- Depends on: condominios, usuarios, usuario_condominios, metricas_uso, audit_logs,
--             marketplace_transactions, norma_chat_logs, norma_training_logs, documents, document_chunks

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- Report configurations (saved report templates)
CREATE TABLE IF NOT EXISTS public.report_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES public.condominios(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('executive', 'financial', 'operational', 'custom')),
  metrics JSONB NOT NULL DEFAULT '[]',
  filters JSONB NOT NULL DEFAULT '{}',
  format VARCHAR(10) NOT NULL DEFAULT 'pdf' CHECK (format IN ('pdf', 'excel', 'csv')),
  schedule VARCHAR(20) CHECK (schedule IN ('daily', 'weekly', 'monthly', NULL)),
  recipients JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generated reports history
CREATE TABLE IF NOT EXISTS public.generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES public.report_configurations(id) ON DELETE SET NULL,
  condominio_id UUID REFERENCES public.condominios(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  format VARCHAR(10) NOT NULL CHECK (format IN ('pdf', 'excel', 'csv')),
  file_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  file_size_bytes BIGINT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. MATERIALIZED VIEWS
-- ============================================================================

-- Daily activity summary (last 90 days)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_daily_activity_summary AS
SELECT
  m.condominio_id,
  c.nome AS condominio_nome,
  m.periodo AS date,
  m.usuarios_ativos,
  m.sessoes_totais,
  m.comunicados_criados,
  m.comunicados_visualizados,
  m.ocorrencias_criadas,
  m.ocorrencias_resolvidas,
  m.chamados_abertos,
  m.chamados_fechados,
  m.reservas_feitas,
  m.norma_conversas,
  m.norma_mensagens,
  m.norma_satisfacao_avg,
  m.norma_tempo_resposta_avg_ms,
  m.notificacoes_enviadas,
  m.notificacoes_lidas,
  m.custo_total_centavos
FROM public.metricas_uso m
JOIN public.condominios c ON c.id = m.condominio_id
WHERE m.tipo_periodo = 'dia'
  AND m.periodo >= CURRENT_DATE - INTERVAL '90 days'
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_activity_condo_date
  ON public.mv_daily_activity_summary (condominio_id, date);

-- Condominio health overview
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_condominio_health AS
SELECT
  c.id AS condominio_id,
  c.nome,
  c.tier,
  c.total_unidades,
  c.ativo,
  COALESCE(uc.total_usuarios, 0) AS total_usuarios,
  COALESCE(uc.usuarios_ativos, 0) AS usuarios_ativos,
  COALESCE(m7.usuarios_ativos_total, 0) AS usuarios_ativos_7d,
  COALESCE(m7.comunicados_total, 0) AS comunicados_7d,
  COALESCE(m7.ocorrencias_total, 0) AS ocorrencias_7d,
  COALESCE(m7.conversas_ia_total, 0) AS conversas_ia_7d,
  COALESCE(m7.custo_total, 0) AS custo_7d_centavos,
  COALESCE(m7.latencia_ia_media, 0) AS latencia_ia_media_ms,
  c.created_at
FROM public.condominios c
LEFT JOIN (
  SELECT
    condominio_id,
    COUNT(*) AS total_usuarios,
    COUNT(*) FILTER (WHERE status = 'active') AS usuarios_ativos
  FROM public.usuario_condominios
  GROUP BY condominio_id
) uc ON uc.condominio_id = c.id
LEFT JOIN public.v_metricas_7d m7 ON m7.condominio_id = c.id
WHERE c.deleted_at IS NULL
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_condominio_health_id
  ON public.mv_condominio_health (condominio_id);

-- Marketplace analytics (daily aggregation)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_marketplace_analytics AS
SELECT
  mt.condominio_id,
  DATE(mt.transaction_date) AS date,
  COUNT(*) AS total_transactions,
  COUNT(DISTINCT mt.usuario_id) AS unique_buyers,
  COUNT(DISTINCT mt.partner_id) AS unique_partners,
  SUM(mt.transaction_amount) AS gmv,
  SUM(mt.discount_amount) AS total_discounts,
  SUM(mt.final_amount) AS net_revenue,
  SUM(mt.commission_amount) AS total_commission,
  COUNT(*) FILTER (WHERE mt.status = 'completed') AS completed_transactions,
  COUNT(*) FILTER (WHERE mt.status = 'pending') AS pending_transactions
FROM public.marketplace_transactions mt
WHERE mt.transaction_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY mt.condominio_id, DATE(mt.transaction_date)
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_marketplace_condo_date
  ON public.mv_marketplace_analytics (condominio_id, date);

-- Executive KPIs (singleton-ish, global aggregation)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_executive_kpis AS
SELECT
  -- User metrics
  (SELECT COUNT(*) FROM public.usuarios WHERE deleted_at IS NULL) AS total_users,
  (SELECT COUNT(*) FROM public.usuarios WHERE deleted_at IS NULL AND status = 'active') AS active_users,
  (SELECT COUNT(DISTINCT usuario_id) FROM public.audit_logs
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS active_users_30d,
  -- Condominio metrics
  (SELECT COUNT(*) FROM public.condominios WHERE deleted_at IS NULL AND ativo = true) AS total_condominios,
  -- Revenue / cost
  (SELECT COALESCE(SUM(custo_total_centavos), 0) FROM public.metricas_uso
    WHERE periodo >= DATE_TRUNC('month', CURRENT_DATE) AND tipo_periodo = 'dia') AS custo_mes_centavos,
  -- Marketplace
  (SELECT COALESCE(SUM(final_amount), 0) FROM public.marketplace_transactions
    WHERE transaction_date >= DATE_TRUNC('month', CURRENT_DATE) AND status = 'completed') AS gmv_mes,
  -- AI metrics
  (SELECT COUNT(*) FROM public.norma_chat_logs
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS conversas_ia_30d,
  (SELECT COALESCE(AVG(user_feedback), 0) FROM public.norma_training_logs
    WHERE user_feedback IS NOT NULL
      AND created_at >= CURRENT_DATE - INTERVAL '30 days') AS satisfacao_ia_30d,
  -- Documents
  (SELECT COUNT(*) FROM public.documents) AS total_documents,
  (SELECT COUNT(*) FROM public.document_chunks) AS total_chunks,
  -- Timestamp
  NOW() AS refreshed_at
WITH DATA;

-- ============================================================================
-- 3. REFRESH FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_daily_activity_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_condominio_health;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_marketplace_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_executive_kpis;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. ADDITIONAL INDEXES (performance)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_date
  ON public.audit_logs (acao, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date
  ON public.audit_logs (usuario_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_tx_status_date
  ON public.marketplace_transactions (status, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_usuarios_status_created
  ON public.usuarios (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usuario_condominios_condo_status
  ON public.usuario_condominios (condominio_id, status);

CREATE INDEX IF NOT EXISTS idx_training_logs_feedback_date
  ON public.norma_training_logs (user_feedback, created_at DESC)
  WHERE user_feedback IS NOT NULL;

-- ============================================================================
-- 5. RLS POLICIES
-- ============================================================================

ALTER TABLE public.report_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

-- Superadmin: full access to report_configurations
DROP POLICY IF EXISTS "superadmin_manage_report_configs" ON public.report_configurations;
CREATE POLICY "superadmin_manage_report_configs" ON public.report_configurations
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- Admin condo: own condominio reports
DROP POLICY IF EXISTS "admin_condo_manage_report_configs" ON public.report_configurations;
CREATE POLICY "admin_condo_manage_report_configs" ON public.report_configurations
  FOR ALL TO authenticated
  USING (
    public.get_user_role() = 'admin_condo'
    AND condominio_id = public.get_user_condominio_id()
  )
  WITH CHECK (
    public.get_user_role() = 'admin_condo'
    AND condominio_id = public.get_user_condominio_id()
  );

-- Superadmin: full access to generated_reports
DROP POLICY IF EXISTS "superadmin_manage_generated_reports" ON public.generated_reports;
CREATE POLICY "superadmin_manage_generated_reports" ON public.generated_reports
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- Admin condo: own condominio generated reports
DROP POLICY IF EXISTS "admin_condo_manage_generated_reports" ON public.generated_reports;
CREATE POLICY "admin_condo_manage_generated_reports" ON public.generated_reports
  FOR ALL TO authenticated
  USING (
    public.get_user_role() = 'admin_condo'
    AND condominio_id = public.get_user_condominio_id()
  )
  WITH CHECK (
    public.get_user_role() = 'admin_condo'
    AND condominio_id = public.get_user_condominio_id()
  );

-- ============================================================================
-- 6. TRIGGERS (updated_at)
-- ============================================================================

CREATE TRIGGER set_updated_at_report_configurations
  BEFORE UPDATE ON public.report_configurations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_generated_reports_status
  BEFORE UPDATE ON public.generated_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
