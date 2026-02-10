-- ============================================
-- FIX: Drop ambiguous get_user_role() function (no params version)
-- ============================================
-- Two versions exist:
--   1. get_user_role() → queries usuarios.role directly (from 20240101000003)
--   2. get_user_role(UUID DEFAULT NULL) → queries usuario_condominios (from 20251228161915)
-- Both match calls to get_user_role(), causing "function is not unique" error.
-- Drop the old version (no params) and keep the newer one that uses the pivot table.
-- ============================================

DROP FUNCTION IF EXISTS public.get_user_role();

-- Ensure the newer version exists (idempotent)
CREATE OR REPLACE FUNCTION public.get_user_role(p_condominio_id UUID DEFAULT NULL)
RETURNS public.user_role AS $$
BEGIN
  RETURN (
    SELECT uc.role
    FROM public.usuario_condominios uc
    WHERE uc.usuario_id = public.get_my_user_id()
      AND (p_condominio_id IS NULL OR uc.condominio_id = p_condominio_id)
      AND uc.status = 'active'
    ORDER BY uc.created_at DESC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
