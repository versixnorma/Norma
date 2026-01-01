-- ============================================
-- VERSIX NORMA - CRIAR USUÁRIOS AUTH
-- Execute este script ANTES do seed principal
-- ============================================
-- ATENÇÃO: Este script deve ser executado pelo
-- serviço de admin do Supabase ou via API
-- ============================================

-- Método 1: Via Supabase Dashboard
-- ================================
-- 1. Vá em Authentication > Users
-- 2. Clique em "Add User" > "Create New User"
-- 3. Crie os seguintes usuários:

/*
┌─────────────────────────────────────────────────────────────────────┐
│                    USUÁRIOS DEMO PARA CRIAR                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. SÍNDICO                                                         │
│     Email: sindico@aurora.demo                                      │
│     Senha: Demo@2024!                                               │
│     Nome: Carlos Silva                                              │
│                                                                     │
│  2. MORADOR                                                         │
│     Email: morador@aurora.demo                                      │
│     Senha: Demo@2024!                                               │
│     Nome: Maria Santos                                              │
│                                                                     │
│  3. PORTEIRO                                                        │
│     Email: porteiro@aurora.demo                                     │
│     Senha: Demo@2024!                                               │
│     Nome: José Oliveira                                             │
│                                                                     │
│  4. SUPERADMIN (opcional)                                           │
│     Email: admin@versix.demo                                        │
│     Senha: SuperAdmin@2024!                                         │
│     Nome: Admin Versix                                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
*/

-- Método 2: Via Edge Function (Admin API)
-- =======================================
-- Crie uma Edge Function temporária para criar usuários

/*
// supabase/functions/create-demo-users/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const DEMO_USERS = [
  {
    email: 'sindico@aurora.demo',
    password: 'Demo@2024!',
    user_metadata: { nome: 'Carlos Silva', role: 'sindico' }
  },
  {
    email: 'morador@aurora.demo',
    password: 'Demo@2024!',
    user_metadata: { nome: 'Maria Santos', role: 'morador' }
  },
  {
    email: 'porteiro@aurora.demo',
    password: 'Demo@2024!',
    user_metadata: { nome: 'José Oliveira', role: 'porteiro' }
  }
]

Deno.serve(async (req) => {
  const results = []
  
  for (const user of DEMO_USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: user.user_metadata
    })
    
    results.push({
      email: user.email,
      success: !error,
      id: data?.user?.id,
      error: error?.message
    })
  }
  
  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  })
})
*/

-- Método 3: Via SQL (requer permissão de superuser)
-- =================================================
-- Após criar os usuários no Auth, atualize a tabela usuarios:

-- Exemplo (substitua os UUIDs pelos reais do auth.users):
/*
UPDATE public.usuarios 
SET auth_id = 'uuid-do-auth-users-aqui'
WHERE email = 'sindico@aurora.demo';

UPDATE public.usuarios 
SET auth_id = 'uuid-do-auth-users-aqui'
WHERE email = 'morador@aurora.demo';

UPDATE public.usuarios 
SET auth_id = 'uuid-do-auth-users-aqui'
WHERE email = 'porteiro@aurora.demo';
*/

-- ============================================
-- SCRIPT PARA VINCULAR AUTH_ID APÓS CRIAÇÃO
-- ============================================
-- Execute este script APÓS criar os usuários no Auth Dashboard

DO $$
DECLARE
  v_sindico_auth_id UUID;
  v_morador_auth_id UUID;
  v_porteiro_auth_id UUID;
BEGIN
  -- Busca os IDs do auth.users
  SELECT id INTO v_sindico_auth_id FROM auth.users WHERE email = 'sindico@aurora.demo';
  SELECT id INTO v_morador_auth_id FROM auth.users WHERE email = 'morador@aurora.demo';
  SELECT id INTO v_porteiro_auth_id FROM auth.users WHERE email = 'porteiro@aurora.demo';
  
  -- Atualiza a tabela usuarios
  IF v_sindico_auth_id IS NOT NULL THEN
    UPDATE public.usuarios SET auth_id = v_sindico_auth_id WHERE email = 'sindico@aurora.demo';
    RAISE NOTICE 'Síndico vinculado: %', v_sindico_auth_id;
  END IF;
  
  IF v_morador_auth_id IS NOT NULL THEN
    UPDATE public.usuarios SET auth_id = v_morador_auth_id WHERE email = 'morador@aurora.demo';
    RAISE NOTICE 'Morador vinculado: %', v_morador_auth_id;
  END IF;
  
  IF v_porteiro_auth_id IS NOT NULL THEN
    UPDATE public.usuarios SET auth_id = v_porteiro_auth_id WHERE email = 'porteiro@aurora.demo';
    RAISE NOTICE 'Porteiro vinculado: %', v_porteiro_auth_id;
  END IF;
  
  RAISE NOTICE '✅ Vinculação de auth_id concluída!';
END $$;
