-- ============================================
-- FIX: Infinite recursion in usuario_condominios RLS policies
-- ============================================
-- Problem: Policies "sindico_view_condominio_relationships" and
-- "sindico_manage_condominio_relationships" query usuario_condominios
-- inside their own USING clause, causing infinite recursion (error 42P17).
--
-- Solution: Use SECURITY DEFINER functions that bypass RLS to check
-- user roles, replacing the self-referencing subqueries.
-- ============================================

-- 1. Create helper function to check if user has admin/sindico role in a condominio
-- SECURITY DEFINER bypasses RLS, breaking the recursion cycle
CREATE OR REPLACE FUNCTION public.user_has_admin_role_in_condominio(p_condominio_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.usuario_condominios uc
    WHERE uc.usuario_id = public.get_my_user_id()
      AND uc.condominio_id = p_condominio_id
      AND uc.role IN ('sindico', 'subsindico', 'admin_condo')
      AND uc.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.user_has_admin_role_in_condominio(UUID) TO authenticated;

-- 2. Drop the problematic policies
DROP POLICY IF EXISTS "sindico_view_condominio_relationships" ON public.usuario_condominios;
DROP POLICY IF EXISTS "sindico_manage_condominio_relationships" ON public.usuario_condominios;
DROP POLICY IF EXISTS "users_update_own_relationship" ON public.usuario_condominios;

-- 3. Recreate policies using the SECURITY DEFINER function (no recursion)

-- Sindicos can view all relationships in their condominio
CREATE POLICY "sindico_view_condominio_relationships" ON public.usuario_condominios
  FOR SELECT TO authenticated
  USING (
    public.user_has_admin_role_in_condominio(condominio_id)
  );

-- Sindicos can manage relationships in their condominio (except superadmin)
CREATE POLICY "sindico_manage_condominio_relationships" ON public.usuario_condominios
  FOR ALL TO authenticated
  USING (
    public.user_has_admin_role_in_condominio(condominio_id)
  )
  WITH CHECK (
    public.user_has_admin_role_in_condominio(condominio_id)
    AND role != 'superadmin'
  );

-- Users can update their own relationship (but not change role)
CREATE POLICY "users_update_own_relationship" ON public.usuario_condominios
  FOR UPDATE TO authenticated
  USING (
    usuario_id = public.get_my_user_id()
  )
  WITH CHECK (
    usuario_id = public.get_my_user_id()
  );
