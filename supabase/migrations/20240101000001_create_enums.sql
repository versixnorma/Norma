-- ============================================
-- VERSIX NORMA - MIGRATION 001: ENUMS
-- ============================================
-- Criação de todos os tipos enumerados do sistema
-- ============================================

-- Tier do condomínio (plano de assinatura)
CREATE TYPE public.tier_type AS ENUM (
  'starter',      -- Até 50 UHs, funcionalidades básicas
  'professional', -- Até 200 UHs, IA, WhatsApp
  'enterprise'    -- Ilimitado, API, white-label
);
COMMENT ON TYPE public.tier_type IS 'Plano de assinatura do condomínio';
-- Roles de usuário
CREATE TYPE public.user_role AS ENUM (
  'superadmin',   -- Acesso total ao sistema (Versix)
  'admin_condo',  -- Administrador do condomínio
  'sindico',      -- Síndico com poderes de gestão
  'subsindico',   -- Subsíndico
  'conselheiro',  -- Membro do conselho
  'morador',      -- Morador comum
  'proprietario', -- Proprietário (pode não morar)
  'inquilino',    -- Inquilino
  'porteiro',     -- Funcionário - portaria
  'zelador'       -- Funcionário - zelador
);
COMMENT ON TYPE public.user_role IS 'Função do usuário no sistema';
-- Status do usuário
CREATE TYPE public.user_status AS ENUM (
  'pending',    -- Aguardando aprovação
  'active',     -- Ativo e pode acessar
  'inactive',   -- Inativo temporariamente
  'suspended',  -- Suspenso por violação
  'removed'     -- Removido do condomínio
);
COMMENT ON TYPE public.user_status IS 'Estado atual do usuário';
-- Tipo de residente
CREATE TYPE public.tipo_residente AS ENUM (
  'proprietario_residente',  -- Mora no imóvel próprio
  'proprietario_externo',    -- Proprietário que não mora
  'inquilino',               -- Aluga o imóvel
  'dependente',              -- Familiar/dependente
  'funcionario'              -- Funcionário do condomínio
);
COMMENT ON TYPE public.tipo_residente IS 'Relação do usuário com a unidade';
-- Tipo de unidade habitacional
CREATE TYPE public.unidade_tipo AS ENUM (
  'apartamento',
  'casa',
  'cobertura',
  'sala_comercial',
  'loja',
  'garagem',
  'deposito'
);
COMMENT ON TYPE public.unidade_tipo IS 'Classificação da unidade habitacional';
-- Status de ata
CREATE TYPE public.ata_status AS ENUM (
  'rascunho',
  'pendente_validacao',
  'validada',
  'rejeitada',
  'arquivada'
);
COMMENT ON TYPE public.ata_status IS 'Estado de validação da ata';
-- Categoria de comunicado
CREATE TYPE public.comunicado_categoria AS ENUM (
  'geral',
  'manutencao',
  'financeiro',
  'seguranca',
  'evento',
  'urgente',
  'obras',
  'assembleia'
);
COMMENT ON TYPE public.comunicado_categoria IS 'Categoria do comunicado';
-- Prioridade
CREATE TYPE public.prioridade AS ENUM (
  'baixa',
  'media',
  'alta',
  'urgente'
);
COMMENT ON TYPE public.prioridade IS 'Nível de prioridade';
