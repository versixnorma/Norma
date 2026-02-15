-- ============================================
-- VERSIX NORMA - MIGRATION: Make handle_new_user more defensive
-- ============================================
-- Adds exception handling for UUID cast and usuario_condominios insert
-- to prevent "Database error saving new user" from Supabase Auth.
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_condominio_id UUID;
  v_codigo_convite VARCHAR(8);
  v_usuario_id UUID;
  v_role public.user_role;
  v_status public.user_status;
BEGIN
  -- Extrair metadata do signup
  v_codigo_convite := NEW.raw_user_meta_data->>'codigo_convite';

  -- Safe UUID cast for condominio_id (empty string or invalid UUID won't crash)
  BEGIN
    v_condominio_id := (NEW.raw_user_meta_data->>'condominio_id')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_condominio_id := NULL;
  END;

  -- Prioridade 1: condominio_id direto (signup com seletor)
  IF v_condominio_id IS NOT NULL THEN
    v_role := 'morador';
    v_status := 'pending';

  -- Prioridade 2: código de convite
  ELSIF v_codigo_convite IS NOT NULL AND v_codigo_convite != '' THEN
    SELECT id INTO v_condominio_id
    FROM public.condominios
    WHERE codigo_convite = v_codigo_convite
      AND ativo = true
      AND deleted_at IS NULL;

    IF v_condominio_id IS NULL THEN
      -- Don't raise exception - just proceed without condominio
      v_role := 'morador';
      v_status := 'pending';
    ELSE
      v_role := 'morador';
      v_status := 'pending';
    END IF;
  ELSE
    -- Sem código e sem condomínio
    v_role := 'morador';
    v_status := 'pending';
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
  )
  RETURNING id INTO v_usuario_id;

  -- Criar vínculo em usuario_condominios (safe - won't crash on error)
  IF v_condominio_id IS NOT NULL AND v_usuario_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.usuario_condominios (
        usuario_id,
        condominio_id,
        role,
        status
      ) VALUES (
        v_usuario_id,
        v_condominio_id,
        v_role,
        v_status
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log but don't fail - API route will handle fallback
      RAISE WARNING 'Could not create usuario_condominios link: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
