-- ============================================
-- VERSIX NORMA - MIGRATION: Add helper get_my_condominio_id
-- Ensures legacy references to public.get_my_condominio_id() resolve.
-- ============================================
DO $$
BEGIN
  -- If function already exists, replace it to ensure correct logic.
  IF to_regclass('public.get_my_condominio_id') IS NOT NULL THEN
    RAISE NOTICE 'Replacing existing function public.get_my_condominio_id()';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.get_my_condominio_id()
RETURNS UUID AS $$
DECLARE
  cid UUID;
BEGIN
  -- Prefer explicit active_condominio context if available via session variables (example)
  BEGIN
    -- Try session variable (if application sets it)
    cid := current_setting('versix.condominio_id', true)::UUID;
    IF cid IS NOT NULL THEN
      RETURN cid;
    END IF;
  EXCEPTION WHEN others THEN
    -- ignore if not set or cannot cast
    cid := NULL;
  END;

  -- Fallback: return the most recently associated active condominio for the current user
  SELECT uc.condominio_id INTO cid
  FROM public.usuario_condominios uc
  WHERE uc.usuario_id = public.get_my_user_id()
    AND uc.status = 'active'
  ORDER BY uc.created_at DESC
  LIMIT 1;

  RETURN cid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

