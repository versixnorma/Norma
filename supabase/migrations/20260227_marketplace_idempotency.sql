-- supabase/migrations/20260227_marketplace_idempotency.sql
-- Marketplace: idempotency keys + RPC atômica para purchase
-- Resolve: double-click race condition + read-then-write no usage_count

-- 1. Tabela de idempotency keys (dedup 24h)
CREATE TABLE IF NOT EXISTS marketplace_idempotency_keys (
  key         TEXT PRIMARY KEY,
  usuario_id  UUID NOT NULL REFERENCES usuarios(id),
  result      JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-cleanup de chaves > 24h via índice para pg_cron
CREATE INDEX IF NOT EXISTS idx_idempotency_created
  ON marketplace_idempotency_keys(created_at);

-- Função de cleanup (chamar via pg_cron ou Edge Function scheduled)
CREATE OR REPLACE FUNCTION cleanup_idempotency_keys()
RETURNS void AS $$
  DELETE FROM marketplace_idempotency_keys
  WHERE created_at < now() - interval '24 hours';
$$ LANGUAGE sql VOLATILE;

-- 2. RPC atômica para purchase (resolve race condition)
CREATE OR REPLACE FUNCTION marketplace_purchase(
  p_discount_id   UUID,
  p_usuario_id    UUID,
  p_condominio_id UUID,
  p_idempotency_key TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_discount      RECORD;
  v_partner       RECORD;
  v_existing      RECORD;
  v_tx_id         UUID;
  v_original      NUMERIC;
  v_final         NUMERIC;
  v_discount_amt  NUMERIC;
  v_commission    NUMERIC;
BEGIN
  -- 1. Verificar idempotency (retornar resultado anterior se existir)
  SELECT result INTO v_existing
  FROM marketplace_idempotency_keys
  WHERE key = p_idempotency_key;

  IF FOUND THEN
    RETURN v_existing.result || jsonb_build_object('idempotent', true);
  END IF;

  -- 2. Lock row para evitar race condition (SELECT FOR UPDATE)
  SELECT * INTO v_discount
  FROM marketplace_discounts
  WHERE id = p_discount_id
  FOR UPDATE; -- Row-level lock até fim da transação

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Desconto não encontrado');
  END IF;

  IF v_discount.status != 'active' THEN
    RETURN jsonb_build_object('error', 'Desconto indisponível');
  END IF;

  IF v_discount.valid_until IS NOT NULL AND v_discount.valid_until < now() THEN
    RETURN jsonb_build_object('error', 'Desconto expirado');
  END IF;

  -- 3. Verificar e incrementar usage_count ATOMICAMENTE
  IF v_discount.usage_limit IS NOT NULL
     AND v_discount.usage_count >= v_discount.usage_limit THEN
    RETURN jsonb_build_object('error', 'Limite de uso atingido');
  END IF;

  UPDATE marketplace_discounts
  SET usage_count = usage_count + 1  -- Atômico, não read-then-write
  WHERE id = p_discount_id;

  -- 4. Calcular valores
  SELECT commission_rate INTO v_partner
  FROM marketplace_partners
  WHERE id = v_discount.partner_id;

  v_original := COALESCE(v_discount.original_price, 0);
  v_final    := COALESCE(v_discount.discounted_price, 0);

  IF v_final = 0 THEN
    IF v_discount.discount_type = 'percentage' AND v_original > 0 THEN
      v_discount_amt := v_original * (v_discount.discount_value / 100.0);
      v_final        := GREATEST(v_original - v_discount_amt, 0);
    ELSIF v_discount.discount_type = 'fixed' AND v_original > 0 THEN
      v_discount_amt := v_discount.discount_value;
      v_final        := GREATEST(v_original - v_discount_amt, 0);
    ELSE
      v_final        := v_original;
      v_discount_amt := 0;
    END IF;
  ELSE
    v_discount_amt := GREATEST(v_original - v_final, 0);
  END IF;

  v_commission := CASE
    WHEN COALESCE(v_partner.commission_rate, 0) > 0
    THEN (v_final * v_partner.commission_rate / 100.0)
    ELSE NULL
  END;

  -- 5. Inserir transação
  INSERT INTO marketplace_transactions (
    discount_id, usuario_id, condominio_id, partner_id,
    transaction_amount, discount_amount, final_amount,
    commission_amount, status, payment_method
  ) VALUES (
    p_discount_id, p_usuario_id, p_condominio_id, v_discount.partner_id,
    COALESCE(v_original, v_final), v_discount_amt, v_final,
    v_commission, 'pending', 'marketplace'
  ) RETURNING id INTO v_tx_id;

  -- 6. Registrar idempotency key
  INSERT INTO marketplace_idempotency_keys (key, usuario_id, result)
  VALUES (
    p_idempotency_key,
    p_usuario_id,
    jsonb_build_object('data', jsonb_build_object('id', v_tx_id))
  );

  RETURN jsonb_build_object('data', jsonb_build_object('id', v_tx_id));
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION marketplace_purchase(UUID, UUID, UUID, TEXT) TO authenticated;
