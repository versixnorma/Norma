// SPRINT 10: Uptime Check (Cron: a cada 5 minutos)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================
// TYPE DEFINITIONS
// ============================================
interface FetchError {
  name?: string;
  message?: string;
}

function isFetchError(error: unknown): error is FetchError {
  return typeof error === 'object' && error !== null;
}

const ENDPOINTS = [
  { nome: 'Health', url: '/functions/v1/health', critico: true },
  { nome: 'API Gateway', url: '/rest/v1/', critico: true },
  { nome: 'Auth', url: '/auth/v1/health', critico: true },
];

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const baseUrl = Deno.env.get('SUPABASE_URL');
  const resultados = [];

  for (const ep of ENDPOINTS) {
    const start = Date.now();
    let status = 'ok', statusCode = 200, erro = '';

    try {
      const res = await fetch(`${baseUrl}${ep.url}`, {
        headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
        signal: AbortSignal.timeout(30000),
      });
      statusCode = res.status;
      status = res.ok ? 'ok' : 'error';
    } catch (e: unknown) {
      if (isFetchError(e)) {
        status = e.name === 'TimeoutError' ? 'timeout' : 'error';
        erro = e.message || 'Unknown error occurred';
      } else {
        status = 'error';
        erro = 'Unknown error occurred';
      }
    }

    const latencia = Date.now() - start;
    resultados.push({ endpoint: ep.nome, status, latencia, statusCode, erro });

    await supabase.from('uptime_checks').insert({
      endpoint_nome: ep.nome, endpoint_url: ep.url, endpoint_critico: ep.critico,
      status, status_code: statusCode, latencia_ms: latencia, erro_mensagem: erro || null,
    });

    if (status !== 'ok' && ep.critico) {
      await supabase.rpc('criar_alerta', {
        p_tipo: 'endpoint_indisponivel', p_severidade: 'critical',
        p_titulo: `Endpoint ${ep.nome} indisponível`, p_descricao: erro,
      });
    }
  }

  return Response.json({ resultados });
});
