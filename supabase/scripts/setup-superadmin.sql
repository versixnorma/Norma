-- ============================================
-- VERSIX NORMA - Script de Configuração Inicial
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- https://supabase.com/dashboard/project/bhtosfttnucnmjnawbuw/sql/new
--
-- ANTES DE EXECUTAR:
-- 1. Crie um usuário no Supabase Auth (Authentication > Users > Add user)
-- 2. Copie o UUID do usuário criado
-- 3. Substitua 'SEU-AUTH-UUID-AQUI' pelo UUID copiado
-- 4. Personalize os dados conforme necessário
-- ============================================

-- ============================================
-- PARTE 1: CRIAR SUPERADMIN
-- ============================================

-- Substitua os valores abaixo
DO $$
DECLARE
  v_auth_id UUID := 'SEU-AUTH-UUID-AQUI';  -- UUID do Supabase Auth
  v_nome TEXT := 'Administrador Versix';
  v_email TEXT := 'admin@versix.com.br';
  v_superadmin_id UUID;
BEGIN
  -- Verificar se já existe um superadmin com este auth_id
  IF EXISTS (SELECT 1 FROM public.usuarios WHERE auth_id = v_auth_id) THEN
    RAISE NOTICE 'Usuário com auth_id % já existe', v_auth_id;
  ELSE
    -- Criar o SuperAdmin
    INSERT INTO public.usuarios (
      auth_id,
      nome,
      email,
      role,
      status
    ) VALUES (
      v_auth_id,
      v_nome,
      v_email,
      'superadmin',
      'active'
    )
    RETURNING id INTO v_superadmin_id;

    RAISE NOTICE 'SuperAdmin criado com sucesso! ID: %', v_superadmin_id;
  END IF;
END $$;

-- Verificar criação
SELECT id, nome, email, role, status, created_at
FROM public.usuarios
WHERE role = 'superadmin';


-- ============================================
-- PARTE 2: CRIAR PRIMEIRO CONDOMÍNIO
-- ============================================
-- Descomente e personalize quando estiver pronto

/*
DO $$
DECLARE
  v_condominio_id UUID;
  v_superadmin_id UUID;
  v_bloco_a_id UUID;
  v_bloco_b_id UUID;
BEGIN
  -- Buscar o SuperAdmin
  SELECT id INTO v_superadmin_id
  FROM public.usuarios
  WHERE role = 'superadmin'
  LIMIT 1;

  -- Criar o condomínio
  INSERT INTO public.condominios (
    nome,
    cnpj,
    endereco,
    cidade,
    estado,
    cep,
    tier,
    total_unidades,
    created_by
  ) VALUES (
    'Condomínio Residencial Exemplo',           -- Nome
    '12.345.678/0001-90',                       -- CNPJ
    'Rua das Flores, 123',                      -- Endereço
    'São Paulo',                                -- Cidade
    'SP',                                       -- Estado
    '01234-567',                                -- CEP
    'professional',                             -- Tier: starter, professional, enterprise
    24,                                         -- Total de unidades
    v_superadmin_id                             -- Criado por
  )
  RETURNING id INTO v_condominio_id;

  RAISE NOTICE 'Condomínio criado! ID: %', v_condominio_id;

  -- Criar Blocos
  INSERT INTO public.blocos (condominio_id, nome, descricao)
  VALUES (v_condominio_id, 'Bloco A', 'Torre principal')
  RETURNING id INTO v_bloco_a_id;

  INSERT INTO public.blocos (condominio_id, nome, descricao)
  VALUES (v_condominio_id, 'Bloco B', 'Torre secundária')
  RETURNING id INTO v_bloco_b_id;

  RAISE NOTICE 'Blocos criados! A: %, B: %', v_bloco_a_id, v_bloco_b_id;

  -- Criar Unidades do Bloco A (12 apartamentos: 101-104, 201-204, 301-304)
  INSERT INTO public.unidades_habitacionais (condominio_id, bloco_id, numero, tipo, fracao_ideal)
  SELECT
    v_condominio_id,
    v_bloco_a_id,
    (andar || '0' || unidade)::VARCHAR,
    'apartamento',
    4.1667  -- 100/24 unidades
  FROM
    generate_series(1, 3) AS andar,
    generate_series(1, 4) AS unidade;

  -- Criar Unidades do Bloco B (12 apartamentos: 101-104, 201-204, 301-304)
  INSERT INTO public.unidades_habitacionais (condominio_id, bloco_id, numero, tipo, fracao_ideal)
  SELECT
    v_condominio_id,
    v_bloco_b_id,
    (andar || '0' || unidade)::VARCHAR,
    'apartamento',
    4.1667
  FROM
    generate_series(1, 3) AS andar,
    generate_series(1, 4) AS unidade;

  RAISE NOTICE 'Unidades criadas com sucesso!';

  -- Mostrar código de convite gerado
  RAISE NOTICE 'Código de convite do condomínio: %',
    (SELECT codigo_convite FROM public.condominios WHERE id = v_condominio_id);

END $$;

-- Verificar condomínio criado
SELECT
  c.id,
  c.nome,
  c.tier,
  c.codigo_convite,
  c.total_unidades,
  COUNT(DISTINCT b.id) as blocos,
  COUNT(DISTINCT u.id) as unidades_criadas
FROM public.condominios c
LEFT JOIN public.blocos b ON b.condominio_id = c.id
LEFT JOIN public.unidades_habitacionais u ON u.condominio_id = c.id
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.nome, c.tier, c.codigo_convite, c.total_unidades;
*/


-- ============================================
-- PARTE 3: PROMOVER USUÁRIO A SÍNDICO
-- ============================================
-- Execute após o síndico se cadastrar usando o código de convite

/*
-- Opção 1: Por email
UPDATE public.usuarios
SET
  role = 'sindico',
  status = 'active'
WHERE email = 'sindico@exemplo.com'
  AND role = 'morador';

-- Opção 2: Por ID do usuário
UPDATE public.usuarios
SET
  role = 'sindico',
  status = 'active'
WHERE id = 'UUID-DO-USUARIO';

-- Verificar síndicos
SELECT id, nome, email, role, status, condominio_id
FROM public.usuarios
WHERE role IN ('sindico', 'subsindico', 'admin_condo')
  AND deleted_at IS NULL;
*/


-- ============================================
-- PARTE 4: QUERIES ÚTEIS PARA ADMINISTRAÇÃO
-- ============================================

-- Listar todos os condomínios
-- SELECT * FROM public.condominios WHERE deleted_at IS NULL;

-- Listar usuários por condomínio
-- SELECT u.nome, u.email, u.role, u.status, c.nome as condominio
-- FROM public.usuarios u
-- LEFT JOIN public.condominios c ON c.id = u.condominio_id
-- WHERE u.deleted_at IS NULL
-- ORDER BY c.nome, u.role;

-- Regenerar código de convite de um condomínio
-- SELECT regenerate_invite_code('UUID-DO-CONDOMINIO');

-- Verificar feature flags ativas
-- SELECT * FROM public.feature_flags WHERE is_active = true;

-- Ver estatísticas de um condomínio
-- SELECT
--   c.nome,
--   c.tier,
--   COUNT(DISTINCT u.id) FILTER (WHERE u.deleted_at IS NULL) as usuarios_ativos,
--   COUNT(DISTINCT b.id) as blocos,
--   COUNT(DISTINCT uh.id) as unidades
-- FROM public.condominios c
-- LEFT JOIN public.usuarios u ON u.condominio_id = c.id
-- LEFT JOIN public.blocos b ON b.condominio_id = c.id
-- LEFT JOIN public.unidades_habitacionais uh ON uh.condominio_id = c.id
-- WHERE c.id = 'UUID-DO-CONDOMINIO'
-- GROUP BY c.id;
