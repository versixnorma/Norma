/**
 * Sentry HTTP reporter para Edge Functions (Deno).
 * Usa a API REST do Sentry diretamente (sem SDK) para reportar erros de crons.
 * Falha silenciosamente — nunca interrompe o cron por problema de telemetria.
 */

const SENTRY_DSN = Deno.env.get('SENTRY_DSN');

interface SentryDsn {
  publicKey: string;
  host: string;
  projectId: string;
}

function parseDsn(dsn: string): SentryDsn | null {
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const host = url.host;
    const projectId = url.pathname.replace(/^\//, '');
    if (!publicKey || !host || !projectId) return null;
    return { publicKey, host, projectId };
  } catch {
    return null;
  }
}

/**
 * Reporta uma exceção ao Sentry via HTTP store API.
 * @param error - Erro a ser capturado
 * @param context - Metadados adicionais (nome da função, etc.)
 */
export async function captureException(
  error: unknown,
  context: Record<string, unknown> = {}
): Promise<void> {
  if (!SENTRY_DSN) return;

  const dsn = parseDsn(SENTRY_DSN);
  if (!dsn) return;

  try {
    const err = error instanceof Error ? error : new Error(String(error));
    const eventId = crypto.randomUUID().replace(/-/g, '');
    const timestamp = new Date().toISOString();

    const payload = {
      event_id: eventId,
      timestamp,
      platform: 'javascript',
      level: 'error',
      tags: {
        runtime: 'deno-edge',
        region: Deno.env.get('SUPABASE_REGION') ?? 'unknown',
      },
      extra: context,
      exception: {
        values: [
          {
            type: err.name,
            value: err.message,
          },
        ],
      },
    };

    await fetch(`https://${dsn.host}/api/${dsn.projectId}/store/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': [
          'Sentry sentry_version=7',
          `sentry_key=${dsn.publicKey}`,
          'sentry_client=versix-edge/1.0',
        ].join(', '),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000), // Timeout de 3s para não bloquear o cron
    });
  } catch {
    // Falha silenciosa — não deixar erro de telemetria quebrar o cron
  }
}

/**
 * Captura uma mensagem informativa/warning ao Sentry.
 */
export async function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context: Record<string, unknown> = {}
): Promise<void> {
  if (!SENTRY_DSN) return;

  const dsn = parseDsn(SENTRY_DSN);
  if (!dsn) return;

  try {
    const payload = {
      event_id: crypto.randomUUID().replace(/-/g, ''),
      timestamp: new Date().toISOString(),
      platform: 'javascript',
      level,
      message: { formatted: message },
      tags: { runtime: 'deno-edge' },
      extra: context,
    };

    await fetch(`https://${dsn.host}/api/${dsn.projectId}/store/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': [
          'Sentry sentry_version=7',
          `sentry_key=${dsn.publicKey}`,
          'sentry_client=versix-edge/1.0',
        ].join(', '),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Falha silenciosa
  }
}
