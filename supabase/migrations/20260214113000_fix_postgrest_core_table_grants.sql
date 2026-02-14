-- =====================================================
-- Fix PostgREST 404 on core public tables
-- =====================================================
-- Context:
-- In PostgREST, missing table/schema privileges for the JWT role can surface
-- as HTTP 404 (resource not found), even when tables exist.
-- This migration restores read grants for authenticated users while keeping
-- access control enforced by RLS policies.

-- Ensure API roles can access public schema objects.
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- Core read access for authenticated clients.
-- RLS remains the primary data access guard.
GRANT SELECT ON TABLE public.condominios TO authenticated;
GRANT SELECT ON TABLE public.blocos TO authenticated;
GRANT SELECT ON TABLE public.unidades_habitacionais TO authenticated;
GRANT SELECT ON TABLE public.usuarios TO authenticated;
GRANT SELECT ON TABLE public.usuario_condominios TO authenticated;

-- Minimal anonymous access used by health/connectivity checks.
GRANT SELECT ON TABLE public.condominios TO anon;
GRANT SELECT ON TABLE public.unidades_habitacionais TO anon;
