-- ============================================
-- VERSIX NORMA - Criar SuperAdmin
-- ============================================
-- Execute COMO: postgres (não como user)
-- ============================================

-- ============================================
-- PASSO 1: Modificar temporariamente o trigger
-- para permitir criação sem código de convite
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_condominio_id UUID;
  v_codigo_convite VARCHAR(8);
  v_is_superadmin BOOLEAN;
  v_role public.user_role;
  v_status public.user_status;
BEGIN
  -- Verificar se é criação de superadmin
  v_is_superadmin := COALESCE((NEW.raw_user_meta_data->>'is_superadmin')::BOOLEAN, false);

  -- Se for superadmin, criar com role especial
  IF v_is_superadmin THEN
    INSERT INTO public.usuarios (
      auth_id,
      nome,
      email,
      role,
      status
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
      NEW.email,
      'superadmin',
      'active'
    );
    RETURN NEW;
  END IF;

  -- Extrair metadata do signup
  v_codigo_convite := NEW.raw_user_meta_data->>'codigo_convite';

  -- Se tem código de convite, é morador
  IF v_codigo_convite IS NOT NULL AND v_codigo_convite != '' THEN
    -- Buscar condomínio pelo código
    SELECT id INTO v_condominio_id
    FROM public.condominios
    WHERE codigo_convite = v_codigo_convite
      AND ativo = true
      AND deleted_at IS NULL;

    IF v_condominio_id IS NULL THEN
      RAISE EXCEPTION 'Código de convite inválido ou expirado';
    END IF;

    v_role := 'morador';
    v_status := 'pending'; -- Aguarda aprovação do síndico
  ELSE
    -- Sem código = candidato a síndico (precisa validar ata)
    v_role := 'sindico';
    v_status := 'pending'; -- Aguarda validação da ata
  END IF;

  -- Inserir na tabela usuarios
  INSERT INTO public.usuarios (
    auth_id,
    condominio_id,
    nome,
    email,
    telefone,
    role,
    status
  ) VALUES (
    NEW.id,
    v_condominio_id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'telefone',
    v_role,
    v_status
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PASSO 2: Desabilitar RLS temporariamente
-- ============================================
ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PASSO 3: Agora vá ao Dashboard do Supabase
-- Authentication > Users > Add user > Create new user
--
-- IMPORTANTE: Use a API ou clique em "Advanced"
-- e adicione este metadata:
-- {
--   "is_superadmin": true,
--   "nome": "Seu Nome"
-- }
-- ============================================

-- Se preferir, use este comando cURL (substitua os valores):
-- curl -X POST 'https://bhtosfttnucnmjnawbuw.supabase.co/auth/v1/admin/users' \
--   -H "Authorization: Bearer SUA_SERVICE_ROLE_KEY" \
--   -H "Content-Type: application/json" \
--   -d '{
--     "email": "admin@versix.com.br",
--     "password": "SuaSenhaSegura123!",
--     "email_confirm": true,
--     "user_metadata": {
--       "is_superadmin": true,
--       "nome": "Administrador Versix"
--     }
--   }'

-- ============================================
-- PASSO 4: Reabilitar RLS
-- ============================================
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICAR RESULTADO
-- ============================================
SELECT
  u.id,
  u.auth_id,
  u.nome,
  u.email,
  u.role,
  u.status
FROM public.usuarios u
WHERE u.role = 'superadmin';
