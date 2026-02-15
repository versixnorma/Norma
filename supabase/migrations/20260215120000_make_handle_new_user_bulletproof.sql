-- ============================================
-- VERSIX NORMA - MIGRATION: Make handle_new_user completely bulletproof
-- ============================================
-- Wraps the ENTIRE function body in a BEGIN/EXCEPTION block so that
-- no downstream trigger failure (audit_log, canais_preferencias, etc.)
-- can cause "Database error saving new user" from Supabase Auth.
-- The API route /api/auth/signup handles fallback creation.
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
  -- Entire body wrapped in exception handler so trigger NEVER fails
  BEGIN
    -- Extrair metadata do signup
    v_codigo_convite := NEW.raw_user_meta_data->>'codigo_convite';

    -- Safe UUID cast for condominio_id
    BEGIN
      v_condominio_id := (NEW.raw_user_meta_data->>'condominio_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_condominio_id := NULL;
    END;

    -- Determinar role e status
    IF v_condominio_id IS NOT NULL THEN
      v_role := 'morador';
      v_status := 'pending';
    ELSIF v_codigo_convite IS NOT NULL AND v_codigo_convite != '' THEN
      SELECT id INTO v_condominio_id
      FROM public.condominios
      WHERE codigo_convite = v_codigo_convite
        AND ativo = true
        AND deleted_at IS NULL;

      v_role := 'morador';
      v_status := 'pending';
    ELSE
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

    -- Criar vínculo em usuario_condominios
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
        RAISE WARNING 'handle_new_user: usuario_condominios insert failed: %', SQLERRM;
      END;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    -- Log the error but NEVER fail - API route handles fallback
    RAISE WARNING 'handle_new_user trigger failed for user %: %', NEW.id, SQLERRM;
  END;

  -- ALWAYS return NEW so auth.users INSERT succeeds
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
