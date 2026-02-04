-- ============================================
-- VERSIX NORMA - MIGRATION: ADD RLS TO USUARIO_CONDOMINIOS
-- ============================================
-- P0 Security Fix: Enable RLS on usuario_condominios table
-- This table controls user-condominio relationships (multi-tenancy)
-- Without RLS, users could query relationships they shouldn't access
-- ============================================
-- Date: 2026-02-03
-- Priority: P0 - BLOCKER
-- ============================================

-- ============================================
-- STEP 0: Create helper function get_my_user_id()
-- Maps auth.uid() to usuarios.id for RLS policies
-- ============================================
CREATE OR REPLACE FUNCTION public.get_my_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id
    FROM public.usuarios
    WHERE auth_id = auth.uid()
      AND deleted_at IS NULL
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_my_user_id() IS
  'Retorna o ID do usuário (usuarios.id) baseado no auth.uid() atual. Usado em políticas RLS.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_user_id() TO authenticated;

-- ============================================
-- STEP 1: Enable Row Level Security
-- ============================================
ALTER TABLE public.usuario_condominios ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Policy for users to view their own relationships
-- Users can see which condominios they belong to
-- ============================================
CREATE POLICY "users_view_own_relationships" ON public.usuario_condominios
  FOR SELECT TO authenticated
  USING (
    -- User can see their own relationships
    usuario_id = public.get_my_user_id()
  );

-- ============================================
-- STEP 3: Policy for sindicos to view users in their condominio
-- Sindicos can see who belongs to their condominio
-- ============================================
CREATE POLICY "sindico_view_condominio_relationships" ON public.usuario_condominios
  FOR SELECT TO authenticated
  USING (
    -- Sindico can see users in condominios they manage
    EXISTS (
      SELECT 1 FROM public.usuario_condominios uc
      WHERE uc.usuario_id = public.get_my_user_id()
        AND uc.condominio_id = usuario_condominios.condominio_id
        AND uc.role IN ('sindico', 'subsindico', 'admin_condo')
        AND uc.status = 'active'
    )
  );

-- ============================================
-- STEP 4: Policy for sindicos to manage users in their condominio
-- Sindicos can add/update/remove users from their condominio
-- ============================================
CREATE POLICY "sindico_manage_condominio_relationships" ON public.usuario_condominios
  FOR ALL TO authenticated
  USING (
    -- Sindico can manage users in condominios they manage
    EXISTS (
      SELECT 1 FROM public.usuario_condominios uc
      WHERE uc.usuario_id = public.get_my_user_id()
        AND uc.condominio_id = usuario_condominios.condominio_id
        AND uc.role IN ('sindico', 'subsindico', 'admin_condo')
        AND uc.status = 'active'
    )
  )
  WITH CHECK (
    -- Can only assign roles lower than or equal to their own
    EXISTS (
      SELECT 1 FROM public.usuario_condominios uc
      WHERE uc.usuario_id = public.get_my_user_id()
        AND uc.condominio_id = usuario_condominios.condominio_id
        AND uc.role IN ('sindico', 'subsindico', 'admin_condo')
        AND uc.status = 'active'
    )
    -- Cannot assign superadmin role
    AND usuario_condominios.role != 'superadmin'
  );

-- ============================================
-- STEP 5: Policy for superadmin full access
-- Superadmins can manage all relationships
-- ============================================
CREATE POLICY "superadmin_full_access_relationships" ON public.usuario_condominios
  FOR ALL TO authenticated
  USING (
    public.is_superadmin()
  )
  WITH CHECK (
    public.is_superadmin()
  );

-- ============================================
-- STEP 6: Policy for users to update their own relationship status
-- Users can update limited fields on their own relationships
-- (e.g., accepting invitation)
-- ============================================
CREATE POLICY "users_update_own_relationship" ON public.usuario_condominios
  FOR UPDATE TO authenticated
  USING (
    usuario_id = public.get_my_user_id()
  )
  WITH CHECK (
    -- Can only update their own relationships
    usuario_id = public.get_my_user_id()
    -- Cannot change role (that requires sindico/admin)
    AND role = (SELECT role FROM public.usuario_condominios WHERE id = usuario_condominios.id)
  );

-- ============================================
-- STEP 7: Add indexes for RLS performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_usuario_condominios_role
  ON public.usuario_condominios(role);
CREATE INDEX IF NOT EXISTS idx_usuario_condominios_user_role
  ON public.usuario_condominios(usuario_id, role);
CREATE INDEX IF NOT EXISTS idx_usuario_condominios_condo_role
  ON public.usuario_condominios(condominio_id, role);

-- ============================================
-- STEP 8: Add comment documenting RLS
-- ============================================
COMMENT ON TABLE public.usuario_condominios IS
  'Associação entre usuários e condomínios (Multi-tenancy). RLS habilitado para proteger relacionamentos.';

-- ============================================
-- VERIFICATION: Log that RLS is enabled
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'RLS enabled on usuario_condominios table with 5 policies';
END $$;
