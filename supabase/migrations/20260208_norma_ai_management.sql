-- ============================================
-- VERSIX NORMA - MIGRATION: NORMA AI MANAGEMENT
-- ============================================
-- Estende documents com source_type, cria tabelas de training logs e performance metrics
-- Abordagem hibrida: documents + document_chunks como base unificada de conhecimento
-- ============================================

-- ============================================
-- 1. ALTERAR TABELA DOCUMENTS
-- ============================================
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'upload',
  ADD COLUMN IF NOT EXISTS category VARCHAR(50),
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Atualizar registros existentes
UPDATE public.documents SET source_type = 'upload' WHERE source_type IS NULL;

-- Constraint para source_type
ALTER TABLE public.documents
  ADD CONSTRAINT chk_documents_source_type
  CHECK (source_type IN ('upload', 'manual', 'conversation'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_source_type ON public.documents(source_type);
CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents(category);

-- ============================================
-- 2. TABELA NORMA_TRAINING_LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.norma_training_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  operation_type VARCHAR(20) NOT NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  query TEXT,
  response TEXT,
  confidence_score DECIMAL(3,2),
  response_time_ms INTEGER,
  user_feedback INTEGER CHECK (user_feedback BETWEEN 1 AND 5),
  feedback_text TEXT,
  user_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  condominio_id UUID REFERENCES public.condominios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Constraint para operation_type
ALTER TABLE public.norma_training_logs
  ADD CONSTRAINT chk_training_logs_operation_type
  CHECK (operation_type IN ('insert', 'update', 'delete', 'query', 'feedback'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_logs_session ON public.norma_training_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_training_logs_created ON public.norma_training_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_logs_operation ON public.norma_training_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_training_logs_user ON public.norma_training_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_training_logs_condominio ON public.norma_training_logs(condominio_id);

-- ============================================
-- 3. TABELA NORMA_PERFORMANCE_METRICS
-- ============================================
CREATE TABLE IF NOT EXISTS public.norma_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  condominio_id UUID REFERENCES public.condominios(id) ON DELETE CASCADE,
  total_queries INTEGER DEFAULT 0,
  avg_response_time_ms DECIMAL(8,2),
  avg_confidence_score DECIMAL(3,2),
  satisfaction_score DECIMAL(3,2),
  knowledge_base_size INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (date, condominio_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_perf_metrics_date ON public.norma_performance_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_condominio ON public.norma_performance_metrics(condominio_id);

-- ============================================
-- 4. RLS
-- ============================================
ALTER TABLE public.norma_training_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.norma_performance_metrics ENABLE ROW LEVEL SECURITY;

-- norma_training_logs: superadmin full access
CREATE POLICY "superadmin_manage_training_logs" ON public.norma_training_logs
  FOR ALL
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- norma_training_logs: admin_condo read own condominio
CREATE POLICY "admin_condo_read_training_logs" ON public.norma_training_logs
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role() = 'admin_condo'
    AND condominio_id = public.get_user_condominio_id()
  );

-- norma_training_logs: authenticated users can insert feedback
CREATE POLICY "users_insert_feedback" ON public.norma_training_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    operation_type = 'feedback'
    AND user_id = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid() LIMIT 1)
  );

-- norma_performance_metrics: superadmin full access
CREATE POLICY "superadmin_manage_perf_metrics" ON public.norma_performance_metrics
  FOR ALL
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- norma_performance_metrics: admin_condo read own condominio
CREATE POLICY "admin_condo_read_perf_metrics" ON public.norma_performance_metrics
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role() = 'admin_condo'
    AND condominio_id = public.get_user_condominio_id()
  );
