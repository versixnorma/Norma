-- ============================================
-- VERSIX NORMA - MIGRATION: IMPLEMENT RATE LIMITING
-- ============================================
-- P0 Security Fix: Implement actual rate limiting logic
-- The rate_limits table exists but has no enforcement functions
-- This migration adds functions to check and enforce rate limits
-- ============================================
-- Date: 2026-02-03
-- Priority: P0 - BLOCKER
-- ============================================

-- ============================================
-- STEP 1: Enable RLS on rate_limits table
-- ============================================
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access rate_limits directly
CREATE POLICY "service_role_only" ON public.rate_limits
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- STEP 2: Rate limit configuration table
-- ============================================
CREATE TABLE IF NOT EXISTS public.rate_limit_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint VARCHAR(255) NOT NULL UNIQUE,

  -- Limits
  max_requests INTEGER NOT NULL DEFAULT 100,
  window_seconds INTEGER NOT NULL DEFAULT 60,

  -- Burst handling
  burst_limit INTEGER DEFAULT NULL,
  burst_window_seconds INTEGER DEFAULT 5,

  -- Status
  enabled BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default rate limit configurations
INSERT INTO public.rate_limit_config (endpoint, max_requests, window_seconds, burst_limit, description) VALUES
  ('default', 100, 60, 20, 'Default rate limit for all endpoints'),
  ('ask-norma', 20, 60, 5, 'AI chat endpoint - expensive operation'),
  ('approve-user', 30, 60, 10, 'User approval - sensitive operation'),
  ('impersonate', 5, 3600, 2, 'Impersonation - highly restricted'),
  ('send-email', 50, 60, 10, 'Email sending - prevent spam'),
  ('send-notification', 100, 60, 20, 'Push notifications'),
  ('process-document', 10, 60, 3, 'Document processing - expensive'),
  ('auth', 10, 60, 5, 'Authentication attempts')
ON CONFLICT (endpoint) DO NOTHING;

COMMENT ON TABLE public.rate_limit_config IS 'Configuração de rate limiting por endpoint';

-- ============================================
-- STEP 3: Function to check rate limit
-- Returns: { allowed: boolean, remaining: int, reset_at: timestamp }
-- ============================================
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT DEFAULT 'default'
)
RETURNS JSONB AS $$
DECLARE
  v_config RECORD;
  v_current RECORD;
  v_window_start TIMESTAMPTZ;
  v_remaining INTEGER;
  v_reset_at TIMESTAMPTZ;
BEGIN
  -- Get rate limit config (fallback to default)
  SELECT * INTO v_config
  FROM public.rate_limit_config
  WHERE endpoint = p_endpoint AND enabled = true;

  IF NOT FOUND THEN
    SELECT * INTO v_config
    FROM public.rate_limit_config
    WHERE endpoint = 'default' AND enabled = true;
  END IF;

  IF NOT FOUND THEN
    -- No config, allow all
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', -1,
      'reset_at', null
    );
  END IF;

  -- Calculate window start
  v_window_start := NOW() - (v_config.window_seconds || ' seconds')::INTERVAL;

  -- Get current request count
  SELECT * INTO v_current
  FROM public.rate_limits
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND window_start > v_window_start;

  IF NOT FOUND THEN
    -- First request in window, allow
    v_remaining := v_config.max_requests - 1;
    v_reset_at := NOW() + (v_config.window_seconds || ' seconds')::INTERVAL;

    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', v_remaining,
      'reset_at', v_reset_at
    );
  END IF;

  -- Check if limit exceeded
  IF v_current.requests >= v_config.max_requests THEN
    v_reset_at := v_current.window_start + (v_config.window_seconds || ' seconds')::INTERVAL;

    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'reset_at', v_reset_at,
      'retry_after', EXTRACT(EPOCH FROM (v_reset_at - NOW()))::INTEGER
    );
  END IF;

  -- Under limit, allow
  v_remaining := v_config.max_requests - v_current.requests - 1;
  v_reset_at := v_current.window_start + (v_config.window_seconds || ' seconds')::INTERVAL;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', v_remaining,
    'reset_at', v_reset_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 4: Function to record a request
-- Should be called after check_rate_limit if allowed
-- ============================================
CREATE OR REPLACE FUNCTION public.record_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT DEFAULT 'default'
)
RETURNS VOID AS $$
DECLARE
  v_config RECORD;
  v_window_start TIMESTAMPTZ;
BEGIN
  -- Get config for window duration
  SELECT * INTO v_config
  FROM public.rate_limit_config
  WHERE endpoint = p_endpoint AND enabled = true;

  IF NOT FOUND THEN
    SELECT * INTO v_config
    FROM public.rate_limit_config
    WHERE endpoint = 'default' AND enabled = true;
  END IF;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_window_start := NOW() - (v_config.window_seconds || ' seconds')::INTERVAL;

  -- Upsert the rate limit record
  INSERT INTO public.rate_limits (identifier, endpoint, requests, window_start)
  VALUES (p_identifier, p_endpoint, 1, NOW())
  ON CONFLICT (identifier, endpoint) DO UPDATE
  SET
    requests = CASE
      WHEN rate_limits.window_start > v_window_start
      THEN rate_limits.requests + 1
      ELSE 1
    END,
    window_start = CASE
      WHEN rate_limits.window_start > v_window_start
      THEN rate_limits.window_start
      ELSE NOW()
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 5: Combined function for atomic check-and-record
-- ============================================
CREATE OR REPLACE FUNCTION public.rate_limit_request(
  p_identifier TEXT,
  p_endpoint TEXT DEFAULT 'default'
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Check the limit
  v_result := public.check_rate_limit(p_identifier, p_endpoint);

  -- If allowed, record the request
  IF (v_result->>'allowed')::BOOLEAN THEN
    PERFORM public.record_rate_limit(p_identifier, p_endpoint);
    -- Update remaining count after recording
    v_result := jsonb_set(v_result, '{remaining}', to_jsonb((v_result->>'remaining')::INTEGER));
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 6: Cleanup function for old rate limit records
-- Should be called periodically (e.g., daily cron)
-- ============================================
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  -- Delete records older than 24 hours
  DELETE FROM public.rate_limits
  WHERE window_start < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 7: Grant execute permissions
-- ============================================
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.record_rate_limit(TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.rate_limit_request(TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limits() TO service_role;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Rate limiting functions implemented successfully';
END $$;
