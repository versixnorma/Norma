-- ============================================
-- FIX: Drop ambiguous get_user_role() function (no params version)
-- ============================================
-- Two versions exist:
--   1. get_user_role() → queries usuarios.role directly (from 20240101000003)
--   2. get_user_role(UUID DEFAULT NULL) → queries usuario_condominios (from 20251228161915)
-- Both match calls to get_user_role(), causing "function is not unique" error.
-- Drop the old version (no params) and keep the newer one that uses the pivot table.
-- Must drop dependent policies first, then recreate them (they'll bind to new function).
-- ============================================

-- Step 1: Drop policies that depend on the old get_user_role() (no params)
DROP POLICY IF EXISTS "conselheiro_create_comunicados" ON public.comunicados;
DROP POLICY IF EXISTS "conselho_aprovar_prestacao" ON public.prestacao_contas;

-- Step 2: Drop the old parameterless function
DROP FUNCTION IF EXISTS public.get_user_role();

-- Step 3: Ensure the newer version exists (idempotent)
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

-- Step 4: Recreate the dropped policies using the new function
CREATE POLICY "conselheiro_create_comunicados" ON public.comunicados
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() IN ('sindico', 'subsindico', 'admin_condo', 'conselheiro')
  );

CREATE POLICY "conselho_aprovar_prestacao" ON public.prestacao_contas
  FOR UPDATE TO authenticated
  USING (
    public.get_user_role() = 'conselheiro'
  )
  WITH CHECK (
    public.get_user_role() = 'conselheiro'
  );
