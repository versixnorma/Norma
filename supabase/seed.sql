-- =====================================================
-- VERSIX NORMA - Seed Data
-- =====================================================
-- Dados iniciais do sistema
-- =====================================================

-- ============================================
-- FEATURE FLAGS INICIAIS
-- ============================================
INSERT INTO public.feature_flags (nome, descricao, ativo, escopo, tiers_habilitados) VALUES
  ('ia_norma', 'Assistente de IA Norma', true, 'tier', ARRAY['professional', 'enterprise']::tier_type[]),
  ('whatsapp_integration', 'Integração com WhatsApp', true, 'tier', ARRAY['professional', 'enterprise']::tier_type[]),
  ('assembleia_hibrida', 'Assembleias híbridas (presencial + remoto)', true, 'tier', ARRAY['professional', 'enterprise']::tier_type[]),
  ('api_access', 'Acesso à API externa', true, 'tier', ARRAY['enterprise']::tier_type[]),
  ('custom_branding', 'Personalização de marca (white-label)', true, 'tier', ARRAY['enterprise']::tier_type[]),
  ('relatorios_avancados', 'Relatórios avançados e exportação', true, 'tier', ARRAY['professional', 'enterprise']::tier_type[]),
  ('multi_sindico', 'Múltiplos síndicos/admins', true, 'tier', ARRAY['professional', 'enterprise']::tier_type[]),
  ('backup_automatico', 'Backup automático de documentos', true, 'global', NULL),
  ('modo_manutencao', 'Sistema em manutenção', false, 'global', NULL)
ON CONFLICT (nome) DO NOTHING;

-- ============================================
-- CONDOMÍNIO PILOTO (para testes)
-- ============================================
INSERT INTO public.condominios (
  id,
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
  telefone,
  email
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Condomínio Residencial Versix (Piloto)',
  '00.000.000/0001-00',
  'Rua das Flores',
  '100',
  'Centro',
  'Teresina',
  'PI',
  '64000-000',
  'enterprise',
  50,
  '(86) 99999-9999',
  'piloto@versixnorma.com.br'
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- BLOCOS DO PILOTO
-- ============================================
INSERT INTO public.blocos (condominio_id, nome, andares, unidades_por_andar) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Bloco A', 5, 5),
  ('00000000-0000-0000-0000-000000000001', 'Bloco B', 5, 5)
ON CONFLICT (condominio_id, nome) DO NOTHING;

-- ============================================
-- UNIDADES DO PILOTO (50 apartamentos)
-- ============================================
DO $$
DECLARE
  bloco_a_id UUID;
  bloco_b_id UUID;
  i INTEGER;
BEGIN
  -- Buscar IDs dos blocos
  SELECT id INTO bloco_a_id FROM public.blocos 
  WHERE condominio_id = '00000000-0000-0000-0000-000000000001' AND nome = 'Bloco A';
  
  SELECT id INTO bloco_b_id FROM public.blocos 
  WHERE condominio_id = '00000000-0000-0000-0000-000000000001' AND nome = 'Bloco B';
  
  -- Criar 25 unidades no Bloco A (101-505)
  FOR i IN 1..25 LOOP
    INSERT INTO public.unidades_habitacionais (
      condominio_id, 
      bloco_id, 
      numero, 
      andar, 
      tipo, 
      fracao_ideal
    ) VALUES (
      '00000000-0000-0000-0000-000000000001',
      bloco_a_id,
      ((i-1)/5 + 1)::TEXT || LPAD(((i-1) % 5 + 1)::TEXT, 2, '0'), -- 101, 102, ..., 505
      (i-1)/5 + 1,
      'apartamento',
      0.02 -- 2% cada (50 unidades = 100%)
    ) ON CONFLICT DO NOTHING;
  END LOOP;
  
  -- Criar 25 unidades no Bloco B (101-505)
  FOR i IN 1..25 LOOP
    INSERT INTO public.unidades_habitacionais (
      condominio_id, 
      bloco_id, 
      numero, 
      andar, 
      tipo, 
      fracao_ideal
    ) VALUES (
      '00000000-0000-0000-0000-000000000001',
      bloco_b_id,
      ((i-1)/5 + 1)::TEXT || LPAD(((i-1) % 5 + 1)::TEXT, 2, '0'),
      (i-1)/5 + 1,
      'apartamento',
      0.02
    ) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ============================================
-- NOTA SOBRE SUPERADMIN
-- ============================================
-- O SuperAdmin será criado manualmente após configurar
-- o Supabase Auth. Siga estes passos:
--
-- 1. Crie um usuário no Supabase Auth (Dashboard > Authentication > Users)
--    Email: seu-email@versix.com.br
--    Password: [senha segura]
--
-- 2. Copie o UUID do usuário criado
--
-- 3. Execute este SQL substituindo o UUID:
--
-- INSERT INTO public.usuarios (
--   auth_id,
--   nome,
--   email,
--   role,
--   status
-- ) VALUES (
--   'UUID-DO-AUTH-AQUI',  -- Substituir pelo UUID real
--   'Administrador Versix',
--   'seu-email@versix.com.br',
--   'superadmin',
--   'active'
-- );
-- ============================================

-- ============================================
-- COMUNICADOS DE EXEMPLO
-- ============================================
-- Serão criados após ter um usuário autor válido

DO $$
BEGIN
  RAISE NOTICE '✅ Versix Norma seed executado com sucesso!';
  RAISE NOTICE '📊 Feature flags criadas: 9';
  RAISE NOTICE '🏢 Condomínio piloto criado: Versix (Piloto)';
  RAISE NOTICE '🏗️ Blocos criados: 2';
  RAISE NOTICE '🏠 Unidades criadas: 50';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ PRÓXIMO PASSO: Criar SuperAdmin manualmente';
  RAISE NOTICE '   Veja instruções no final do seed.sql';
END $$;
