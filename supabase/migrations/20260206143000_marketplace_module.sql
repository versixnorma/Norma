-- ============================================
-- VERSIX NORMA - MIGRATION: MARKETPLACE MODULE
-- ============================================
-- Cria estrutura base do marketplace (parceiros, descontos, transações)
-- ============================================

-- Tables
CREATE TABLE IF NOT EXISTS public.marketplace_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  contact_email TEXT,
  phone TEXT,
  address TEXT,
  commission_rate NUMERIC(5,2),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.marketplace_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.marketplace_partners(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL, -- percentage, fixed, service
  discount_value NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2),
  discounted_price NUMERIC(10,2),
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  terms TEXT,
  image_url TEXT,
  featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.marketplace_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_id UUID REFERENCES public.marketplace_discounts(id),
  usuario_id UUID REFERENCES public.usuarios(id),
  condominio_id UUID REFERENCES public.condominios(id),
  partner_id UUID REFERENCES public.marketplace_partners(id),
  transaction_amount NUMERIC(10,2) NOT NULL,
  discount_amount NUMERIC(10,2),
  final_amount NUMERIC(10,2) NOT NULL,
  commission_amount NUMERIC(10,2),
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_discounts_partner ON public.marketplace_discounts(partner_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_discounts_status ON public.marketplace_discounts(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_discounts_featured ON public.marketplace_discounts(featured);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_date ON public.marketplace_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_condominio ON public.marketplace_transactions(condominio_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_partner ON public.marketplace_transactions(partner_id);

-- Triggers (updated_at)
DROP TRIGGER IF EXISTS trg_marketplace_partners_updated_at ON public.marketplace_partners;
CREATE TRIGGER trg_marketplace_partners_updated_at
BEFORE UPDATE ON public.marketplace_partners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_marketplace_discounts_updated_at ON public.marketplace_discounts;
CREATE TRIGGER trg_marketplace_discounts_updated_at
BEFORE UPDATE ON public.marketplace_discounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.marketplace_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_transactions ENABLE ROW LEVEL SECURITY;

-- Policies: marketplace_partners
CREATE POLICY "superadmin_manage_marketplace_partners" ON public.marketplace_partners
  FOR ALL
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

CREATE POLICY "admin_condo_read_marketplace_partners" ON public.marketplace_partners
  FOR SELECT
  TO authenticated
  USING (public.get_user_role() = 'admin_condo' OR public.is_superadmin());

-- Policies: marketplace_discounts
CREATE POLICY "superadmin_manage_marketplace_discounts" ON public.marketplace_discounts
  FOR ALL
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

CREATE POLICY "admin_condo_read_marketplace_discounts" ON public.marketplace_discounts
  FOR SELECT
  TO authenticated
  USING (public.get_user_role() = 'admin_condo' OR public.is_superadmin());

-- Policies: marketplace_transactions
CREATE POLICY "superadmin_manage_marketplace_transactions" ON public.marketplace_transactions
  FOR ALL
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

CREATE POLICY "admin_condo_read_marketplace_transactions" ON public.marketplace_transactions
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role() = 'admin_condo'
    AND condominio_id = public.get_user_condominio_id()
  );
