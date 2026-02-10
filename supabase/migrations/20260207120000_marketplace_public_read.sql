-- ============================================
-- VERSIX NORMA - MIGRATION: MARKETPLACE PUBLIC READ
-- ============================================
-- Libera leitura pública de descontos ativos
-- ============================================

-- Public read for active partners
DROP POLICY IF EXISTS "public_read_active_partners" ON public.marketplace_partners;
CREATE POLICY "public_read_active_partners" ON public.marketplace_partners
  FOR SELECT
  TO anon
  USING (status = 'active' OR status IS NULL);

-- Public read for active discounts within validity window
DROP POLICY IF EXISTS "public_read_active_discounts" ON public.marketplace_discounts;
CREATE POLICY "public_read_active_discounts" ON public.marketplace_discounts
  FOR SELECT
  TO anon
  USING (
    status = 'active'
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_until IS NULL OR valid_until >= now())
  );
