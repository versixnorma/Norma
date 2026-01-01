-- ============================================
-- VERSIX NORMA - MIGRATION 002: TABELAS CORE
-- ============================================
-- Criação das tabelas principais do sistema
-- ============================================

-- Habilitar extensões necessárias (no schema extensions do Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
-- ============================================
-- TABELA: condominios
-- ============================================
CREATE TABLE public.condominios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18) UNIQUE,

  -- Endereço
  endereco TEXT NOT NULL,
  numero VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100) NOT NULL,
  cidade VARCHAR(100) NOT NULL,
  estado CHAR(2) NOT NULL,
  cep VARCHAR(9) NOT NULL,

  -- Configurações
  tier public.tier_type NOT NULL DEFAULT 'starter',
  total_unidades INTEGER NOT NULL CHECK (total_unidades > 0),
  codigo_convite VARCHAR(8) NOT NULL UNIQUE DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),

  -- Contato
  telefone VARCHAR(20),
  email VARCHAR(255),

  -- Configurações visuais (Enterprise)
  logo_url TEXT,
  cor_primaria VARCHAR(7) DEFAULT '#3B82F6',

  -- Metadados
  ativo BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);
-- Índices
CREATE INDEX idx_condominios_cnpj ON public.condominios(cnpj);
CREATE INDEX idx_condominios_codigo ON public.condominios(codigo_convite);
CREATE INDEX idx_condominios_cidade ON public.condominios(cidade, estado);
CREATE INDEX idx_condominios_ativo ON public.condominios(ativo) WHERE ativo = true;
CREATE INDEX idx_condominios_deleted ON public.condominios(deleted_at) WHERE deleted_at IS NULL;
COMMENT ON TABLE public.condominios IS 'Condomínios cadastrados no sistema (tenant principal)';
COMMENT ON COLUMN public.condominios.codigo_convite IS 'Código único para convite de moradores';
COMMENT ON COLUMN public.condominios.deleted_at IS 'Soft delete - quando preenchido, registro está removido';
-- ============================================
-- TABELA: blocos
-- ============================================
CREATE TABLE public.blocos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,

  -- Identificação
  nome VARCHAR(50) NOT NULL,
  descricao TEXT,

  -- Estrutura
  andares INTEGER,
  unidades_por_andar INTEGER,

  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_bloco_condominio UNIQUE (condominio_id, nome)
);
CREATE INDEX idx_blocos_condominio ON public.blocos(condominio_id);
COMMENT ON TABLE public.blocos IS 'Blocos/torres de um condomínio';
-- ============================================
-- TABELA: unidades_habitacionais
-- ============================================
CREATE TABLE public.unidades_habitacionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  bloco_id UUID REFERENCES public.blocos(id) ON DELETE SET NULL,

  -- Identificação
  numero VARCHAR(20) NOT NULL,
  andar INTEGER,
  tipo public.unidade_tipo NOT NULL DEFAULT 'apartamento',

  -- Características
  area_m2 DECIMAL(10,2),
  fracao_ideal DECIMAL(10,8),

  -- Metadados
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_unidade_condominio UNIQUE (condominio_id, bloco_id, numero)
);
-- Índices
CREATE INDEX idx_unidades_condominio ON public.unidades_habitacionais(condominio_id);
CREATE INDEX idx_unidades_bloco ON public.unidades_habitacionais(bloco_id);
CREATE INDEX idx_unidades_ativo ON public.unidades_habitacionais(ativo) WHERE ativo = true;
COMMENT ON TABLE public.unidades_habitacionais IS 'Apartamentos, casas, salas do condomínio';
COMMENT ON COLUMN public.unidades_habitacionais.fracao_ideal IS 'Percentual da unidade no total do condomínio (para votação e rateio)';
-- ============================================
-- TABELA: usuarios
-- ============================================
CREATE TABLE public.usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  condominio_id UUID REFERENCES public.condominios(id) ON DELETE SET NULL,
  unidade_id UUID REFERENCES public.unidades_habitacionais(id) ON DELETE SET NULL,

  -- Dados pessoais
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) UNIQUE,
  telefone VARCHAR(20),

  -- Perfil
  avatar_url TEXT,
  data_nascimento DATE,

  -- Função e status
  role public.user_role NOT NULL DEFAULT 'morador',
  status public.user_status NOT NULL DEFAULT 'pending',
  tipo_residente public.tipo_residente,

  -- Configurações
  notificacoes_email BOOLEAN NOT NULL DEFAULT true,
  notificacoes_push BOOLEAN NOT NULL DEFAULT true,
  notificacoes_whatsapp BOOLEAN NOT NULL DEFAULT false,

  -- Metadados
  ultimo_acesso TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  deleted_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Índices
CREATE INDEX idx_usuarios_auth ON public.usuarios(auth_id);
CREATE INDEX idx_usuarios_condominio ON public.usuarios(condominio_id);
CREATE INDEX idx_usuarios_unidade ON public.usuarios(unidade_id);
CREATE INDEX idx_usuarios_email ON public.usuarios(email);
CREATE INDEX idx_usuarios_cpf ON public.usuarios(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX idx_usuarios_role ON public.usuarios(role);
CREATE INDEX idx_usuarios_status ON public.usuarios(status);
CREATE INDEX idx_usuarios_deleted ON public.usuarios(deleted_at) WHERE deleted_at IS NULL;
COMMENT ON TABLE public.usuarios IS 'Usuários do sistema (moradores, síndicos, funcionários)';
COMMENT ON COLUMN public.usuarios.auth_id IS 'Referência para auth.users do Supabase';
COMMENT ON COLUMN public.usuarios.deleted_at IS 'Soft delete - LGPD compliance';
-- ============================================
-- TABELA: comunicados
-- ============================================
CREATE TABLE public.comunicados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,

  -- Conteúdo
  titulo VARCHAR(255) NOT NULL,
  conteudo TEXT NOT NULL,
  categoria public.comunicado_categoria NOT NULL DEFAULT 'geral',
  prioridade public.prioridade NOT NULL DEFAULT 'media',

  -- Anexos
  anexos JSONB DEFAULT '[]',

  -- Publicação
  publicado BOOLEAN NOT NULL DEFAULT false,
  data_publicacao TIMESTAMPTZ,
  data_expiracao TIMESTAMPTZ,
  fixado BOOLEAN NOT NULL DEFAULT false,

  -- Destinatários (NULL = todos)
  destinatarios_blocos UUID[] DEFAULT NULL,
  destinatarios_unidades UUID[] DEFAULT NULL,

  -- Metadados
  visualizacoes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Índices
CREATE INDEX idx_comunicados_condominio ON public.comunicados(condominio_id);
CREATE INDEX idx_comunicados_autor ON public.comunicados(autor_id);
CREATE INDEX idx_comunicados_categoria ON public.comunicados(categoria);
CREATE INDEX idx_comunicados_publicado ON public.comunicados(publicado, data_publicacao DESC);
CREATE INDEX idx_comunicados_fixado ON public.comunicados(fixado) WHERE fixado = true;
COMMENT ON TABLE public.comunicados IS 'Comunicados e avisos do condomínio';
-- ============================================
-- TABELA: audit_logs
-- ============================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Quem fez
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  condominio_id UUID REFERENCES public.condominios(id) ON DELETE SET NULL,

  -- O que fez
  acao VARCHAR(50) NOT NULL,
  tabela VARCHAR(100) NOT NULL,
  registro_id UUID,

  -- Dados
  dados_antes JSONB,
  dados_depois JSONB,

  -- Contexto
  ip_address INET,
  user_agent TEXT,

  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Índices
CREATE INDEX idx_audit_usuario ON public.audit_logs(usuario_id);
CREATE INDEX idx_audit_condominio ON public.audit_logs(condominio_id);
CREATE INDEX idx_audit_tabela ON public.audit_logs(tabela);
CREATE INDEX idx_audit_acao ON public.audit_logs(acao);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_registro ON public.audit_logs(tabela, registro_id);
COMMENT ON TABLE public.audit_logs IS 'Log de auditoria imutável de todas as ações';
-- ============================================
-- TABELA: sessoes_impersonate
-- ============================================
CREATE TABLE public.sessoes_impersonate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  superadmin_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  usuario_alvo_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,

  -- Contexto
  motivo TEXT NOT NULL,

  -- Validade
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours'),
  revoked_at TIMESTAMPTZ,

  CONSTRAINT check_different_users CHECK (superadmin_id != usuario_alvo_id)
);
-- Índices
CREATE INDEX idx_impersonate_superadmin ON public.sessoes_impersonate(superadmin_id);
CREATE INDEX idx_impersonate_alvo ON public.sessoes_impersonate(usuario_alvo_id);
CREATE INDEX idx_impersonate_active ON public.sessoes_impersonate(expires_at) WHERE revoked_at IS NULL;
COMMENT ON TABLE public.sessoes_impersonate IS 'Sessões de impersonate (SuperAdmin → Usuário)';
-- ============================================
-- TABELA: atas_validacao
-- ============================================
CREATE TABLE public.atas_validacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,

  -- Conteúdo
  titulo VARCHAR(255) NOT NULL,
  conteudo TEXT NOT NULL,
  tipo VARCHAR(50) NOT NULL DEFAULT 'assembleia',

  -- Validação
  status public.ata_status NOT NULL DEFAULT 'rascunho',
  validado_por UUID REFERENCES public.usuarios(id),
  validado_em TIMESTAMPTZ,
  motivo_rejeicao TEXT,

  -- Arquivo
  arquivo_url TEXT,
  hash_documento VARCHAR(64),

  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.usuarios(id)
);
-- Índices
CREATE INDEX idx_atas_condominio ON public.atas_validacao(condominio_id);
CREATE INDEX idx_atas_status ON public.atas_validacao(status);
CREATE INDEX idx_atas_created ON public.atas_validacao(created_at DESC);
COMMENT ON TABLE public.atas_validacao IS 'Atas de assembleia com fluxo de validação';
-- ============================================
-- TABELA: feature_flags
-- ============================================
CREATE TABLE public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  nome VARCHAR(100) NOT NULL UNIQUE,
  descricao TEXT,

  -- Estado
  ativo BOOLEAN NOT NULL DEFAULT false,

  -- Escopo
  escopo VARCHAR(20) NOT NULL DEFAULT 'global' CHECK (escopo IN ('global', 'tier', 'condominio')),
  tiers_habilitados public.tier_type[] DEFAULT '{}',
  condominios_habilitados UUID[] DEFAULT '{}',

  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_feature_flags_nome ON public.feature_flags(nome);
CREATE INDEX idx_feature_flags_ativo ON public.feature_flags(ativo) WHERE ativo = true;
COMMENT ON TABLE public.feature_flags IS 'Feature flags para controle de funcionalidades';
-- ============================================
-- TABELA: rate_limits
-- ============================================
CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  identifier VARCHAR(255) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,

  -- Contagem
  requests INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_rate_limit UNIQUE (identifier, endpoint)
);
CREATE INDEX idx_rate_limits_identifier ON public.rate_limits(identifier);
CREATE INDEX idx_rate_limits_window ON public.rate_limits(window_start);
COMMENT ON TABLE public.rate_limits IS 'Controle de rate limiting por usuário/IP';
