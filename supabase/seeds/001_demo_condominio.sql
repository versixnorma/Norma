-- ============================================
-- VERSIX NORMA - SEED DATA v1.0.1
-- Condomínio Demo: Residencial Aurora
-- ============================================
-- Execute este script no Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ORGANIZAÇÃO
-- ============================================
INSERT INTO public.organizacoes (id, nome, cnpj, email, telefone)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Versix Administradora Demo',
  '12.345.678/0001-90',
  'admin@versix.com.br',
  '(85) 99999-0000'
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. CONDOMÍNIO DEMO
-- ============================================
INSERT INTO public.condominios (
  id,
  organizacao_id,
  nome,
  cnpj,
  endereco,
  numero,
  bairro,
  cidade,
  estado,
  cep,
  tier,
  total_unidades,
  codigo_convite,
  telefone,
  email,
  ativo
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Residencial Aurora',
  '98.765.432/0001-10',
  'Av. Beira Mar',
  '2500',
  'Meireles',
  'Fortaleza',
  'CE',
  '60165-121',
  'starter',
  48,
  'AURORA24',
  '(85) 3333-4444',
  'contato@aurora.cond.br',
  true
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. BLOCOS
-- ============================================
INSERT INTO public.blocos (id, condominio_id, nome, andares, unidades_por_andar) VALUES
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222222', 'Bloco A', 8, 3),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222222', 'Bloco B', 8, 3)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. UNIDADES HABITACIONAIS
-- ============================================
-- Bloco A (24 unidades)
INSERT INTO public.unidades (id, condominio_id, bloco_id, numero, andar, tipo, fracao_ideal, area_m2) VALUES
  -- Bloco A - Andar 1
  ('44444444-4444-4444-4444-444444440101', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333301', '101', 1, 'apartamento', 2.08, 75.00),
  ('44444444-4444-4444-4444-444444440102', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333301', '102', 1, 'apartamento', 2.08, 75.00),
  ('44444444-4444-4444-4444-444444440103', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333301', '103', 1, 'apartamento', 2.08, 75.00),
  -- Bloco A - Andar 2
  ('44444444-4444-4444-4444-444444440201', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333301', '201', 2, 'apartamento', 2.08, 75.00),
  ('44444444-4444-4444-4444-444444440202', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333301', '202', 2, 'apartamento', 2.08, 75.00),
  ('44444444-4444-4444-4444-444444440203', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333301', '203', 2, 'apartamento', 2.08, 75.00),
  -- Bloco A - Andar 3
  ('44444444-4444-4444-4444-444444440301', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333301', '301', 3, 'apartamento', 2.08, 75.00),
  ('44444444-4444-4444-4444-444444440302', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333301', '302', 3, 'apartamento', 2.08, 75.00),
  ('44444444-4444-4444-4444-444444440303', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333301', '303', 3, 'apartamento', 2.08, 75.00),
  -- Bloco A - Andar 4
  ('44444444-4444-4444-4444-444444440401', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333301', '401', 4, 'apartamento', 2.08, 75.00),
  ('44444444-4444-4444-4444-444444440402', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333301', '402', 4, 'apartamento', 2.08, 75.00),
  ('44444444-4444-4444-4444-444444440403', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333301', '403', 4, 'apartamento', 2.08, 75.00)
ON CONFLICT (id) DO NOTHING;

-- Bloco B (12 unidades para demo)
INSERT INTO public.unidades (id, condominio_id, bloco_id, numero, andar, tipo, fracao_ideal, area_m2) VALUES
  ('44444444-4444-4444-4444-444444440501', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333302', '501', 1, 'apartamento', 2.08, 75.00),
  ('44444444-4444-4444-4444-444444440502', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333302', '502', 1, 'apartamento', 2.08, 75.00),
  ('44444444-4444-4444-4444-444444440503', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333302', '503', 1, 'apartamento', 2.08, 75.00),
  ('44444444-4444-4444-4444-444444440601', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333302', '601', 2, 'apartamento', 2.08, 75.00),
  ('44444444-4444-4444-4444-444444440602', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333302', '602', 2, 'apartamento', 2.08, 75.00),
  ('44444444-4444-4444-4444-444444440603', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333302', '603', 2, 'apartamento', 2.08, 75.00)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. USUÁRIOS DEMO
-- ============================================
-- NOTA: Primeiro crie estes usuários no Supabase Auth,
-- depois execute o INSERT abaixo com os IDs corretos.
-- Ou use a função abaixo para criar via SQL.

-- Síndico Demo
INSERT INTO public.usuarios (
  id,
  auth_id, -- Será atualizado após criar no Auth
  nome,
  email,
  telefone,
  documento,
  tipo_documento,
  role,
  ativo
) VALUES (
  '55555555-5555-5555-5555-555555555501',
  NULL, -- Atualizar com auth.users.id após criar conta
  'Carlos Silva',
  'sindico@aurora.demo',
  '(85) 99999-1111',
  '123.456.789-00',
  'cpf',
  'sindico',
  true
) ON CONFLICT (id) DO NOTHING;

-- Morador Demo
INSERT INTO public.usuarios (
  id,
  auth_id,
  nome,
  email,
  telefone,
  documento,
  tipo_documento,
  role,
  ativo
) VALUES (
  '55555555-5555-5555-5555-555555555502',
  NULL,
  'Maria Santos',
  'morador@aurora.demo',
  '(85) 99999-2222',
  '987.654.321-00',
  'cpf',
  'morador',
  true
) ON CONFLICT (id) DO NOTHING;

-- Porteiro Demo
INSERT INTO public.usuarios (
  id,
  auth_id,
  nome,
  email,
  telefone,
  documento,
  tipo_documento,
  role,
  ativo
) VALUES (
  '55555555-5555-5555-5555-555555555503',
  NULL,
  'José Oliveira',
  'porteiro@aurora.demo',
  '(85) 99999-3333',
  '456.789.123-00',
  'cpf',
  'porteiro',
  true
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 6. VÍNCULO USUÁRIO-CONDOMÍNIO
-- ============================================
INSERT INTO public.usuario_condominios (
  id,
  usuario_id,
  condominio_id,
  unidade_id,
  role,
  is_proprietario,
  ativo
) VALUES
  -- Síndico no Apto 101
  (
    '66666666-6666-6666-6666-666666666601',
    '55555555-5555-5555-5555-555555555501',
    '22222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444440101',
    'sindico',
    true,
    true
  ),
  -- Moradora no Apto 202
  (
    '66666666-6666-6666-6666-666666666602',
    '55555555-5555-5555-5555-555555555502',
    '22222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444440202',
    'morador',
    true,
    true
  ),
  -- Porteiro (sem unidade)
  (
    '66666666-6666-6666-6666-666666666603',
    '55555555-5555-5555-5555-555555555503',
    '22222222-2222-2222-2222-222222222222',
    NULL,
    'porteiro',
    false,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 7. CATEGORIAS FINANCEIRAS
-- ============================================
INSERT INTO public.categorias_financeiras (id, condominio_id, nome, tipo, cor, icone) VALUES
  ('77777777-7777-7777-7777-777777777701', '22222222-2222-2222-2222-222222222222', 'Taxa Condominial', 'receita', '#10B981', 'payments'),
  ('77777777-7777-7777-7777-777777777702', '22222222-2222-2222-2222-222222222222', 'Fundo de Reserva', 'receita', '#3B82F6', 'savings'),
  ('77777777-7777-7777-7777-777777777703', '22222222-2222-2222-2222-222222222222', 'Multas e Juros', 'receita', '#F59E0B', 'gavel'),
  ('77777777-7777-7777-7777-777777777704', '22222222-2222-2222-2222-222222222222', 'Energia Elétrica', 'despesa', '#EF4444', 'bolt'),
  ('77777777-7777-7777-7777-777777777705', '22222222-2222-2222-2222-222222222222', 'Água e Esgoto', 'despesa', '#06B6D4', 'water_drop'),
  ('77777777-7777-7777-7777-777777777706', '22222222-2222-2222-2222-222222222222', 'Folha de Pagamento', 'despesa', '#8B5CF6', 'groups'),
  ('77777777-7777-7777-7777-777777777707', '22222222-2222-2222-2222-222222222222', 'Manutenção', 'despesa', '#F97316', 'build'),
  ('77777777-7777-7777-7777-777777777708', '22222222-2222-2222-2222-222222222222', 'Limpeza', 'despesa', '#14B8A6', 'cleaning_services'),
  ('77777777-7777-7777-7777-777777777709', '22222222-2222-2222-2222-222222222222', 'Segurança', 'despesa', '#6366F1', 'security'),
  ('77777777-7777-7777-7777-777777777710', '22222222-2222-2222-2222-222222222222', 'Administrativo', 'despesa', '#EC4899', 'description')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 8. CONTA BANCÁRIA
-- ============================================
INSERT INTO public.contas_bancarias (id, condominio_id, banco, agencia, conta, tipo, saldo_atual, ativo) VALUES
  (
    '88888888-8888-8888-8888-888888888801',
    '22222222-2222-2222-2222-222222222222',
    'Banco do Brasil',
    '1234-5',
    '12345678-9',
    'corrente',
    45680.50,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 9. LANÇAMENTOS FINANCEIROS (Últimos 3 meses)
-- ============================================
-- Mês atual
INSERT INTO public.lancamentos_financeiros (
  id, condominio_id, tipo, categoria_id, conta_bancaria_id,
  valor, data_competencia, data_vencimento, data_pagamento,
  descricao, status, criado_por
) VALUES
  -- Receitas do mês
  ('99999999-9999-9999-9999-999999990101', '22222222-2222-2222-2222-222222222222', 'receita', '77777777-7777-7777-7777-777777777701', '88888888-8888-8888-8888-888888888801', 28800.00, CURRENT_DATE, CURRENT_DATE, CURRENT_DATE, 'Taxas condominiais - Dezembro/2024', 'pago', '55555555-5555-5555-5555-555555555501'),
  ('99999999-9999-9999-9999-999999990102', '22222222-2222-2222-2222-222222222222', 'receita', '77777777-7777-7777-7777-777777777702', '88888888-8888-8888-8888-888888888801', 4800.00, CURRENT_DATE, CURRENT_DATE, CURRENT_DATE, 'Fundo de reserva - Dezembro/2024', 'pago', '55555555-5555-5555-5555-555555555501'),
  
  -- Despesas do mês
  ('99999999-9999-9999-9999-999999990201', '22222222-2222-2222-2222-222222222222', 'despesa', '77777777-7777-7777-7777-777777777704', '88888888-8888-8888-8888-888888888801', 3250.00, CURRENT_DATE, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '3 days', 'Energia elétrica áreas comuns', 'pago', '55555555-5555-5555-5555-555555555501'),
  ('99999999-9999-9999-9999-999999990202', '22222222-2222-2222-2222-222222222222', 'despesa', '77777777-7777-7777-7777-777777777705', '88888888-8888-8888-8888-888888888801', 1850.00, CURRENT_DATE, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '3 days', 'Água e esgoto', 'pago', '55555555-5555-5555-5555-555555555501'),
  ('99999999-9999-9999-9999-999999990203', '22222222-2222-2222-2222-222222222222', 'despesa', '77777777-7777-7777-7777-777777777706', '88888888-8888-8888-8888-888888888801', 12500.00, CURRENT_DATE, CURRENT_DATE, NULL, 'Folha de pagamento - Funcionários', 'pendente', '55555555-5555-5555-5555-555555555501'),
  ('99999999-9999-9999-9999-999999990204', '22222222-2222-2222-2222-222222222222', 'despesa', '77777777-7777-7777-7777-777777777707', '88888888-8888-8888-8888-888888888801', 2800.00, CURRENT_DATE, CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '8 days', 'Manutenção elevadores', 'pago', '55555555-5555-5555-5555-555555555501'),
  ('99999999-9999-9999-9999-999999990205', '22222222-2222-2222-2222-222222222222', 'despesa', '77777777-7777-7777-7777-777777777708', '88888888-8888-8888-8888-888888888801', 4200.00, CURRENT_DATE, CURRENT_DATE, CURRENT_DATE, 'Serviço de limpeza', 'pago', '55555555-5555-5555-5555-555555555501')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 10. COMUNICADOS
-- ============================================
INSERT INTO public.comunicados (
  id, condominio_id, titulo, conteudo, tipo, prioridade,
  autor_id, publicado, publicado_em
) VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001',
    '22222222-2222-2222-2222-222222222222',
    'Manutenção preventiva dos elevadores',
    'Informamos que no próximo sábado, das 8h às 12h, será realizada manutenção preventiva nos elevadores dos Blocos A e B. Durante este período, apenas um elevador estará em funcionamento por bloco. Pedimos desculpas pelo transtorno.',
    'manutencao',
    'alta',
    '55555555-5555-5555-5555-555555555501',
    true,
    NOW() - INTERVAL '2 days'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002',
    '22222222-2222-2222-2222-222222222222',
    'Assembleia Geral Ordinária - Janeiro/2025',
    'Convocamos todos os condôminos para a Assembleia Geral Ordinária que será realizada no dia 15/01/2025, às 19h, no salão de festas. Pauta: 1) Prestação de contas 2024; 2) Previsão orçamentária 2025; 3) Eleição de síndico. Sua presença é fundamental!',
    'assembleia',
    'alta',
    '55555555-5555-5555-5555-555555555501',
    true,
    NOW() - INTERVAL '1 day'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003',
    '22222222-2222-2222-2222-222222222222',
    'Feliz Natal e Boas Festas!',
    'A administração do Residencial Aurora deseja a todos os moradores um Feliz Natal e um próspero Ano Novo! Que 2025 seja repleto de paz, saúde e harmonia para toda nossa comunidade.',
    'aviso',
    'normal',
    '55555555-5555-5555-5555-555555555501',
    true,
    NOW()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004',
    '22222222-2222-2222-2222-222222222222',
    'Lembrete: Taxa condominial vence dia 10',
    'Lembramos que a taxa condominial de janeiro/2025 vence no dia 10. Evite multas e juros pagando em dia. O boleto está disponível no app ou pode ser solicitado na portaria.',
    'pagamento',
    'normal',
    '55555555-5555-5555-5555-555555555501',
    true,
    NOW() - INTERVAL '5 days'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 11. CHAMADOS / OCORRÊNCIAS
-- ============================================
INSERT INTO public.chamados (
  id, condominio_id, unidade_id, usuario_id,
  titulo, descricao, categoria, prioridade, status,
  created_at
) VALUES
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb001',
    '22222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444440202',
    '55555555-5555-5555-5555-555555555502',
    'Vazamento no teto do banheiro',
    'Identifiquei um vazamento no teto do banheiro social, aparentemente vindo do apartamento de cima (302). Já tentei contato com o vizinho mas não consegui.',
    'manutencao',
    'alta',
    'em_andamento',
    NOW() - INTERVAL '3 days'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb002',
    '22222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444440101',
    '55555555-5555-5555-5555-555555555501',
    'Lâmpada queimada no corredor 4º andar',
    'A lâmpada do corredor do 4º andar do Bloco A está queimada há 3 dias.',
    'manutencao',
    'baixa',
    'resolvido',
    NOW() - INTERVAL '7 days'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb003',
    '22222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444440501',
    '55555555-5555-5555-5555-555555555502',
    'Barulho excessivo após 22h',
    'O apartamento 603 do Bloco B tem feito festas com som alto após as 22h nos últimos finais de semana. Já conversei pessoalmente mas não resolveu.',
    'reclamacao',
    'media',
    'aberto',
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 12. ÁREAS COMUNS / RESERVAS
-- ============================================
INSERT INTO public.areas_comuns (
  id, condominio_id, nome, descricao,
  capacidade, valor_reserva, antecedencia_minima_horas,
  horario_inicio, horario_fim, ativo
) VALUES
  (
    'cccccccc-cccc-cccc-cccc-ccccccccc001',
    '22222222-2222-2222-2222-222222222222',
    'Salão de Festas',
    'Salão amplo com capacidade para 80 pessoas, cozinha equipada, banheiros e ar-condicionado.',
    80,
    350.00,
    72,
    '08:00',
    '23:00',
    true
  ),
  (
    'cccccccc-cccc-cccc-cccc-ccccccccc002',
    '22222222-2222-2222-2222-222222222222',
    'Churrasqueira',
    'Área de churrasqueira com mesas, bancos e piscina infantil.',
    30,
    150.00,
    48,
    '08:00',
    '22:00',
    true
  ),
  (
    'cccccccc-cccc-cccc-cccc-ccccccccc003',
    '22222222-2222-2222-2222-222222222222',
    'Academia',
    'Academia completa com esteiras, bicicletas e musculação. Reserva por horário.',
    10,
    0.00,
    2,
    '06:00',
    '22:00',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- Reservas de exemplo
INSERT INTO public.reservas (
  id, area_id, condominio_id, usuario_id,
  data_inicio, data_fim, status, valor_total
) VALUES
  (
    'dddddddd-dddd-dddd-dddd-ddddddddd001',
    'cccccccc-cccc-cccc-cccc-ccccccccc001',
    '22222222-2222-2222-2222-222222222222',
    '55555555-5555-5555-5555-555555555502',
    (CURRENT_DATE + INTERVAL '7 days')::timestamp + TIME '14:00',
    (CURRENT_DATE + INTERVAL '7 days')::timestamp + TIME '22:00',
    'aprovada',
    350.00
  ),
  (
    'dddddddd-dddd-dddd-dddd-ddddddddd002',
    'cccccccc-cccc-cccc-cccc-ccccccccc002',
    '22222222-2222-2222-2222-222222222222',
    '55555555-5555-5555-5555-555555555501',
    (CURRENT_DATE + INTERVAL '3 days')::timestamp + TIME '12:00',
    (CURRENT_DATE + INTERVAL '3 days')::timestamp + TIME '18:00',
    'pendente',
    150.00
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 13. ASSEMBLEIA DE EXEMPLO
-- ============================================
INSERT INTO public.assembleias (
  id, condominio_id, tipo, titulo, descricao,
  data_primeira_convocacao, data_segunda_convocacao,
  local_presencial, permite_voto_antecipado, status,
  criado_por
) VALUES
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeee001',
    '22222222-2222-2222-2222-222222222222',
    'AGO',
    'Assembleia Geral Ordinária - Janeiro/2025',
    'Assembleia anual para prestação de contas, aprovação de orçamento e eleição de síndico.',
    '2025-01-15 19:00:00',
    '2025-01-15 19:30:00',
    'Salão de Festas - Bloco A',
    true,
    'convocada',
    '55555555-5555-5555-5555-555555555501'
  )
ON CONFLICT (id) DO NOTHING;

-- Pautas da assembleia
INSERT INTO public.assembleia_pautas (
  id, assembleia_id, ordem, titulo, descricao, tipo_votacao, quorum_tipo
) VALUES
  ('ffffffff-ffff-ffff-ffff-fffffffffff1', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee001', 1, 'Prestação de Contas 2024', 'Apresentação e aprovação das contas do exercício de 2024.', 'simples', 'maioria_simples'),
  ('ffffffff-ffff-ffff-ffff-fffffffffff2', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee001', 2, 'Previsão Orçamentária 2025', 'Discussão e aprovação do orçamento para o ano de 2025.', 'simples', 'maioria_simples'),
  ('ffffffff-ffff-ffff-ffff-fffffffffff3', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee001', 3, 'Eleição de Síndico', 'Eleição do síndico para o biênio 2025-2026.', 'secreta', 'maioria_simples'),
  ('ffffffff-ffff-ffff-ffff-fffffffffff4', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeee001', 4, 'Assuntos Gerais', 'Discussão de assuntos diversos trazidos pelos condôminos.', 'discussao', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 14. INADIMPLENTES (para dashboard)
-- ============================================
INSERT INTO public.inadimplentes (
  id, condominio_id, unidade_id, usuario_id,
  valor_devido, meses_atraso, ultima_cobranca
) VALUES
  (
    'gggggggg-gggg-gggg-gggg-ggggggggg001',
    '22222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444440301',
    NULL,
    1800.00,
    3,
    NOW() - INTERVAL '15 days'
  ),
  (
    'gggggggg-gggg-gggg-gggg-ggggggggg002',
    '22222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444440603',
    NULL,
    600.00,
    1,
    NOW() - INTERVAL '5 days'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 15. DASHBOARD CACHE (resumo financeiro)
-- ============================================
INSERT INTO public.dashboard_financeiro (
  id, condominio_id, mes_referencia,
  saldo_total, receitas_mes, despesas_mes,
  inadimplencia_percent, fundo_reserva,
  atualizado_em
) VALUES
  (
    'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhh01',
    '22222222-2222-2222-2222-222222222222',
    DATE_TRUNC('month', CURRENT_DATE),
    45680.50,
    33600.00,
    24600.00,
    8.33, -- 2 de 24 unidades
    28500.00,
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- FIM DO SEED
-- ============================================

-- Mensagem de confirmação
DO $$
BEGIN
  RAISE NOTICE '✅ Seed data inserido com sucesso!';
  RAISE NOTICE '📊 Condomínio: Residencial Aurora';
  RAISE NOTICE '🏢 2 Blocos, 18 Unidades';
  RAISE NOTICE '👥 3 Usuários demo';
  RAISE NOTICE '💰 Dados financeiros de exemplo';
  RAISE NOTICE '📣 4 Comunicados';
  RAISE NOTICE '🔧 3 Chamados';
  RAISE NOTICE '📅 1 Assembleia agendada';
END $$;
