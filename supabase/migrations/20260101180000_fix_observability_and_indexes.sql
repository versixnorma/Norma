-- ==============================================================================
-- VERSIX NORMA - OPTIMIZATION & BUGFIX (2026-01-01)
-- ==============================================================================
-- 1. Fix broken RLS policies in Observability module (using id instead of auth_id)
-- 2. Add indices for rate-limiting and auth checks optimization
-- ==============================================================================

-- 1. FIX RLS POLICIES FOR OBSERVABILITY
-- ======================================

-- metricas_uso
DROP POLICY IF EXISTS "metricas_uso_select" ON metricas_uso;
CREATE POLICY "metricas_uso_select" ON metricas_uso FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuario_condominios uc
      WHERE uc.usuario_id = auth.uid()
        AND uc.status = 'active'
        AND (uc.role = 'superadmin' OR uc.condominio_id = metricas_uso.condominio_id)
    )
  );

-- alertas_sistema
DROP POLICY IF EXISTS "alertas_select" ON alertas_sistema;
CREATE POLICY "alertas_select" ON alertas_sistema FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuario_condominios uc
      WHERE uc.usuario_id = auth.uid()
        AND uc.status = 'active'
        AND uc.role IN ('superadmin', 'admin_condo')
    )
  );

DROP POLICY IF EXISTS "alertas_update" ON alertas_sistema;
CREATE POLICY "alertas_update" ON alertas_sistema FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuario_condominios uc
      WHERE uc.usuario_id = auth.uid()
        AND uc.status = 'active'
        AND uc.role IN ('superadmin', 'admin_condo')
    )
  );

-- metricas_performance
DROP POLICY IF EXISTS "perf_select_superadmin" ON metricas_performance;
CREATE POLICY "perf_select_superadmin" ON metricas_performance FOR SELECT
  USING (public.is_superadmin());

-- uptime_checks
DROP POLICY IF EXISTS "uptime_select_superadmin" ON uptime_checks;
CREATE POLICY "uptime_select_superadmin" ON uptime_checks FOR SELECT
  USING (public.is_superadmin());

-- api_request_logs
DROP POLICY IF EXISTS "api_logs_select_superadmin" ON api_request_logs;
CREATE POLICY "api_logs_select_superadmin" ON api_request_logs FOR SELECT
  USING (public.is_superadmin());

-- 2. PERFORMANCE INDICES
-- ======================================

-- Optimization for "get_user_condominio_id" and "is_superadmin" frequently used in RLS
-- Although auth_id is unique, looking up active users is frequent.
CREATE INDEX IF NOT EXISTS idx_usuarios_auth
ON public.usuarios(auth_id)
WHERE deleted_at IS NULL;

-- Optimization for dashboard queries filtering by status often
CREATE INDEX IF NOT EXISTS idx_assembleias_condominio_status
ON public.assembleias(condominio_id, status)
INCLUDE (data_inicio);

-- Optimization for fetching recent logs (limit/order by)
CREATE INDEX IF NOT EXISTS idx_assembleia_logs_recent
ON public.assembleia_logs(assembleia_id, created_at DESC);

-- Optimization for listing pautas by assembly
CREATE INDEX IF NOT EXISTS idx_pautas_list_optimized
ON public.assembleia_pautas(assembleia_id, ordem)
INCLUDE (titulo, status, tipo_votacao);
