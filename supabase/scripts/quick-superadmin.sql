-- ============================================
-- VERSIX NORMA - Criar SuperAdmin (Rápido)
-- ============================================
-- 1. Crie usuário no Supabase Auth primeiro
-- 2. Substitua os 3 valores abaixo
-- 3. Execute no SQL Editor
-- ============================================

INSERT INTO public.usuarios (
  auth_id,
  nome,
  email,
  role,
  status
) VALUES (
  'SEU-AUTH-UUID-AQUI',      -- Cole o UUID do Supabase Auth
  'Seu Nome Completo',       -- Seu nome
  'seu@email.com',           -- Mesmo email do Auth
  'superadmin',
  'active'
);

-- Verificar
SELECT id, nome, email, role, status FROM public.usuarios WHERE role = 'superadmin';
