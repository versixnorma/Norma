// =====================================================
// SPRINT 10: Health Check Edge Function
// Verifica status de todos os serviços
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, CheckResult>;
  timestamp: string;
  version: string;
}

interface CheckResult {
  status: 'ok' | 'degraded' | 'error';
  latencyMs: number;
  message?: string;
}

// ============================================
// HELPER: Safe error message extraction
// ============================================
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as Record<string, unknown>).message;
    return typeof msg === 'string' ? msg : 'Unknown error occurred';
  }
  return 'Unknown error occurred';
}

const APP_VERSION = Deno.env.get('APP_VERSION') || '1.0.0';

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const checks: Record<string, CheckResult> = {};

  // Database check
  checks.database = await checkDatabase(supabase);

  // Auth check
  checks.auth = await checkAuth(supabase);

  // Storage check
  checks.storage = await checkStorage(supabase);

  // Groq check (se configurado)
  if (Deno.env.get('GROQ_API_KEY')) {
    checks.groq = await checkGroq();
  }

  // Qdrant check (se configurado)
  if (Deno.env.get('QDRANT_URL')) {
    checks.qdrant = await checkQdrant();
  }

  // Determinar status geral
  const allChecks = Object.values(checks);
  const anyError = allChecks.some(c => c.status === 'error');
  const anyDegraded = allChecks.some(c => c.status === 'degraded');
  const allOk = allChecks.every(c => c.status === 'ok');

  const response: HealthStatus = {
    status: anyError ? 'unhealthy' : allOk ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
  };

  const statusCode = response.status === 'unhealthy' ? 503 : 200;

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

async function checkDatabase(supabase: SupabaseClient): Promise<CheckResult> {
  const start = Date.now();
  try {
    const { error } = await supabase.from('condominios').select('id').limit(1);
    return {
      status: error ? 'error' : 'ok',
      latencyMs: Date.now() - start,
      message: error?.message,
    };
  } catch (e: unknown) {
    return { status: 'error', latencyMs: Date.now() - start, message: getErrorMessage(e) };
  }
}

async function checkAuth(supabase: SupabaseClient): Promise<CheckResult> {
  const start = Date.now();
  try {
    const { error } = await supabase.auth.getSession();
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch (e: unknown) {
    return { status: 'error', latencyMs: Date.now() - start, message: getErrorMessage(e) };
  }
}

async function checkStorage(supabase: SupabaseClient): Promise<CheckResult> {
  const start = Date.now();
  try {
    const { error } = await supabase.storage.listBuckets();
    return {
      status: error ? 'degraded' : 'ok',
      latencyMs: Date.now() - start,
    };
  } catch (e: unknown) {
    return { status: 'degraded', latencyMs: Date.now() - start, message: getErrorMessage(e) };
  }
}

async function checkGroq(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}` },
    });
    return {
      status: response.ok ? 'ok' : 'degraded',
      latencyMs: Date.now() - start,
    };
  } catch (e: unknown) {
    return { status: 'degraded', latencyMs: Date.now() - start, message: getErrorMessage(e) };
  }
}

async function checkQdrant(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const response = await fetch(`${Deno.env.get('QDRANT_URL')}/healthz`);
    return {
      status: response.ok ? 'ok' : 'degraded',
      latencyMs: Date.now() - start,
    };
  } catch (e: unknown) {
    return { status: 'degraded', latencyMs: Date.now() - start, message: getErrorMessage(e) };
  }
}
