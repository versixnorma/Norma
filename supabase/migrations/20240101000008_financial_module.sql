-- ============================================
-- VERSIX NORMA - MIGRATION 008: MÓDULO FINANCEIRO
-- Sprint 4: Categorias, Contas, Lançamentos, Prestação
-- ============================================

-- ============================================
-- ENUMS FINANCEIROS
-- ============================================

-- Tipo de categoria (receita/despesa)
CREATE TYPE public.categoria_tipo AS ENUM ('receita', 'despesa');
-- Status do lançamento
CREATE TYPE public.lancamento_status AS ENUM (
  'pendente',
  'confirmado',
  'cancelado'
);
-- Tipo de lançamento
CREATE TYPE public.lancamento_tipo AS ENUM ('receita', 'despesa', 'transferencia');
-- Status da prestação de contas
CREATE TYPE public.prestacao_status AS ENUM (
  'rascunho',
  'em_revisao',
  'aprovado',
  'publicado',
  'rejeitado'
);
-- Tipo de taxa
CREATE TYPE public.taxa_tipo AS ENUM (
  'ordinaria',
  'extra',
  'fundo_reserva',
  'multa',
  'juros',
  'outros'
);
-- Status de cobrança
CREATE TYPE public.cobranca_status AS ENUM (
  'pendente',
  'pago',
  'atrasado',
  'cancelado',
  'negociado'
);
-- ============================================
-- TABELA: categorias_financeiras
-- Plano de contas do condomínio
-- ============================================
CREATE TABLE public.categorias_financeiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  
  -- Hierarquia
  parent_id UUID REFERENCES public.categorias_financeiras(id) ON DELETE SET NULL,
  codigo VARCHAR(20) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  
  -- Classificação
  tipo public.categoria_tipo NOT NULL,
  
  -- Orçamento
  orcamento_anual DECIMAL(12,2) DEFAULT 0,
  
  -- Estado
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Código único por condomínio
  UNIQUE(condominio_id, codigo)
);
-- Índices
CREATE INDEX idx_cat_fin_condominio ON public.categorias_financeiras(condominio_id);
CREATE INDEX idx_cat_fin_parent ON public.categorias_financeiras(parent_id);
CREATE INDEX idx_cat_fin_tipo ON public.categorias_financeiras(tipo);
CREATE INDEX idx_cat_fin_active ON public.categorias_financeiras(condominio_id) 
  WHERE ativo = true AND deleted_at IS NULL;
COMMENT ON TABLE public.categorias_financeiras IS 'Plano de contas (categorias) do condomínio';
COMMENT ON COLUMN public.categorias_financeiras.codigo IS 'Código hierárquico (ex: 1.1.01)';
-- ============================================
-- TABELA: contas_bancarias
-- Contas bancárias do condomínio
-- ============================================
CREATE TABLE public.contas_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  
  -- Dados bancários
  banco_codigo VARCHAR(10) NOT NULL,
  banco_nome VARCHAR(100) NOT NULL,
  agencia VARCHAR(10) NOT NULL,
  conta VARCHAR(20) NOT NULL,
  tipo_conta VARCHAR(20) NOT NULL DEFAULT 'corrente',
  
  -- Identificação
  nome_exibicao VARCHAR(100) NOT NULL,
  
  -- Saldos
  saldo_inicial DECIMAL(12,2) NOT NULL DEFAULT 0,
  saldo_atual DECIMAL(12,2) NOT NULL DEFAULT 0,
  data_saldo TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Configurações
  principal BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
-- Índices
CREATE INDEX idx_contas_bancarias_condo ON public.contas_bancarias(condominio_id);
CREATE INDEX idx_contas_bancarias_principal ON public.contas_bancarias(condominio_id) 
  WHERE principal = true AND deleted_at IS NULL;
COMMENT ON TABLE public.contas_bancarias IS 'Contas bancárias do condomínio';
-- ============================================
-- TABELA: contas_bancarias_historico
-- Snapshot mensal para performance
-- ============================================
CREATE TABLE public.contas_bancarias_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_bancaria_id UUID NOT NULL REFERENCES public.contas_bancarias(id) ON DELETE CASCADE,
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  
  -- Referência
  mes_referencia DATE NOT NULL,
  
  -- Saldos
  saldo_inicial DECIMAL(12,2) NOT NULL,
  total_entradas DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_saidas DECIMAL(12,2) NOT NULL DEFAULT 0,
  saldo_final DECIMAL(12,2) NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Único por conta/mês
  UNIQUE(conta_bancaria_id, mes_referencia)
);
CREATE INDEX idx_conta_hist_conta ON public.contas_bancarias_historico(conta_bancaria_id);
CREATE INDEX idx_conta_hist_mes ON public.contas_bancarias_historico(mes_referencia DESC);
COMMENT ON TABLE public.contas_bancarias_historico IS 'Snapshot mensal de saldos para performance';
-- ============================================
-- TABELA: lancamentos_financeiros
-- Receitas e despesas
-- ============================================
CREATE TABLE public.lancamentos_financeiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  
  -- Classificação
  tipo public.lancamento_tipo NOT NULL,
  categoria_id UUID REFERENCES public.categorias_financeiras(id) ON DELETE SET NULL,
  conta_bancaria_id UUID REFERENCES public.contas_bancarias(id) ON DELETE SET NULL,
  
  -- Valores
  descricao VARCHAR(500) NOT NULL,
  valor DECIMAL(12,2) NOT NULL CHECK (valor > 0),
  
  -- Datas
  data_lancamento DATE NOT NULL,
  data_competencia DATE NOT NULL,
  data_pagamento DATE,
  
  -- Status
  status public.lancamento_status NOT NULL DEFAULT 'pendente',
  
  -- Documentação
  numero_documento VARCHAR(50),
  fornecedor VARCHAR(200),
  
  -- Comprovantes (URLs)
  comprovantes JSONB DEFAULT '[]'::JSONB,
  
  -- Observações
  observacoes TEXT,
  
  -- Transferência entre contas
  conta_destino_id UUID REFERENCES public.contas_bancarias(id) ON DELETE SET NULL,
  
  -- Vínculo com taxa (se for receita de condomínio)
  taxa_unidade_id UUID,
  
  -- Período bloqueado
  periodo_bloqueado BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadados
  criado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
-- Índices
CREATE INDEX idx_lanc_condominio ON public.lancamentos_financeiros(condominio_id);
CREATE INDEX idx_lanc_tipo ON public.lancamentos_financeiros(tipo);
CREATE INDEX idx_lanc_categoria ON public.lancamentos_financeiros(categoria_id);
CREATE INDEX idx_lanc_conta ON public.lancamentos_financeiros(conta_bancaria_id);
CREATE INDEX idx_lanc_data ON public.lancamentos_financeiros(data_lancamento DESC);
CREATE INDEX idx_lanc_competencia ON public.lancamentos_financeiros(data_competencia);
CREATE INDEX idx_lanc_status ON public.lancamentos_financeiros(status);
CREATE INDEX idx_lanc_deleted ON public.lancamentos_financeiros(deleted_at) WHERE deleted_at IS NULL;
COMMENT ON TABLE public.lancamentos_financeiros IS 'Lançamentos financeiros (receitas e despesas)';
COMMENT ON COLUMN public.lancamentos_financeiros.data_competencia IS 'Mês/ano de referência do lançamento';
COMMENT ON COLUMN public.lancamentos_financeiros.comprovantes IS 'Array de URLs [{url, nome, tipo}]';
-- ============================================
-- TABELA: prestacao_contas
-- Fechamento mensal
-- ============================================
CREATE TABLE public.prestacao_contas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  
  -- Período
  mes_referencia DATE NOT NULL,
  
  -- Resumo financeiro
  saldo_anterior DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_receitas DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_despesas DECIMAL(12,2) NOT NULL DEFAULT 0,
  saldo_atual DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Status e aprovação
  status public.prestacao_status NOT NULL DEFAULT 'rascunho',
  
  -- Revisão pelo conselho
  revisado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  revisado_em TIMESTAMPTZ,
  parecer_conselho TEXT,
  
  -- Publicação
  publicado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  publicado_em TIMESTAMPTZ,
  
  -- Observações
  observacoes_sindico TEXT,
  
  -- Metadados
  criado_por UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Único por mês/condomínio
  UNIQUE(condominio_id, mes_referencia)
);
-- Índices
CREATE INDEX idx_prestacao_condominio ON public.prestacao_contas(condominio_id);
CREATE INDEX idx_prestacao_mes ON public.prestacao_contas(mes_referencia DESC);
CREATE INDEX idx_prestacao_status ON public.prestacao_contas(status);
COMMENT ON TABLE public.prestacao_contas IS 'Prestação de contas mensal do condomínio';
-- ============================================
-- TABELA: taxas_unidades
-- Taxas por unidade habitacional
-- ============================================
CREATE TABLE public.taxas_unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  unidade_id UUID NOT NULL REFERENCES public.unidades_habitacionais(id) ON DELETE CASCADE,
  
  -- Referência
  mes_referencia DATE NOT NULL,
  
  -- Tipo e valores
  tipo public.taxa_tipo NOT NULL DEFAULT 'ordinaria',
  valor_base DECIMAL(10,2) NOT NULL,
  desconto DECIMAL(10,2) DEFAULT 0,
  acrescimo DECIMAL(10,2) DEFAULT 0,
  valor_final DECIMAL(10,2) GENERATED ALWAYS AS (valor_base - COALESCE(desconto, 0) + COALESCE(acrescimo, 0)) STORED,
  
  -- Vencimento e pagamento
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  valor_pago DECIMAL(10,2),
  
  -- Status
  status public.cobranca_status NOT NULL DEFAULT 'pendente',
  
  -- Boleto (para integração futura)
  boleto_id VARCHAR(100),
  boleto_url TEXT,
  linha_digitavel VARCHAR(100),
  
  -- Descrição
  descricao TEXT,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Única taxa por tipo/mês/unidade
  UNIQUE(unidade_id, mes_referencia, tipo)
);
-- Índices
CREATE INDEX idx_taxas_condominio ON public.taxas_unidades(condominio_id);
CREATE INDEX idx_taxas_unidade ON public.taxas_unidades(unidade_id);
CREATE INDEX idx_taxas_mes ON public.taxas_unidades(mes_referencia);
CREATE INDEX idx_taxas_status ON public.taxas_unidades(status);
CREATE INDEX idx_taxas_vencimento ON public.taxas_unidades(data_vencimento);
COMMENT ON TABLE public.taxas_unidades IS 'Taxas condominiais por unidade';
-- ============================================
-- TABELA: configuracoes_financeiras
-- Configurações do módulo financeiro
-- ============================================
CREATE TABLE public.configuracoes_financeiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL UNIQUE REFERENCES public.condominios(id) ON DELETE CASCADE,
  
  -- Taxa ordinária
  taxa_ordinaria_base DECIMAL(10,2) NOT NULL DEFAULT 0,
  dia_vencimento INTEGER NOT NULL DEFAULT 10 CHECK (dia_vencimento BETWEEN 1 AND 28),
  
  -- Multa e juros
  multa_percentual DECIMAL(5,2) NOT NULL DEFAULT 2.00,
  juros_mensal_percentual DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  dias_carencia INTEGER NOT NULL DEFAULT 0,
  
  -- Fundo de reserva
  fundo_reserva_percentual DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  
  -- Desconto pontualidade
  desconto_pontualidade_percentual DECIMAL(5,2) NOT NULL DEFAULT 0,
  desconto_pontualidade_dias INTEGER NOT NULL DEFAULT 0,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.configuracoes_financeiras IS 'Configurações financeiras do condomínio';
-- ============================================
-- TRIGGERS: updated_at
-- ============================================
CREATE TRIGGER tr_categorias_fin_updated
  BEFORE UPDATE ON public.categorias_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_contas_bancarias_updated
  BEFORE UPDATE ON public.contas_bancarias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_lancamentos_updated
  BEFORE UPDATE ON public.lancamentos_financeiros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_prestacao_updated
  BEFORE UPDATE ON public.prestacao_contas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_taxas_updated
  BEFORE UPDATE ON public.taxas_unidades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_config_fin_updated
  BEFORE UPDATE ON public.configuracoes_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
-- ============================================
-- TRIGGERS: Auditoria
-- ============================================
CREATE TRIGGER tr_audit_categorias_fin
  AFTER INSERT OR UPDATE OR DELETE ON public.categorias_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER tr_audit_contas_bancarias
  AFTER INSERT OR UPDATE OR DELETE ON public.contas_bancarias
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER tr_audit_lancamentos
  AFTER INSERT OR UPDATE OR DELETE ON public.lancamentos_financeiros
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER tr_audit_prestacao
  AFTER INSERT OR UPDATE OR DELETE ON public.prestacao_contas
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER tr_audit_taxas
  AFTER INSERT OR UPDATE OR DELETE ON public.taxas_unidades
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();
