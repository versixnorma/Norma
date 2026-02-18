import { captureException } from './sentry.ts';

export async function notifyError(functionName: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const timestamp = new Date().toISOString();

  try {
    await captureException(error, {
      function: functionName,
      timestamp,
    });
  } catch {
    // best effort
  }

  const slackWebhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');
  if (!slackWebhookUrl) return;

  try {
    await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `:rotating_light: Cron job falhou: ${functionName}\n${message}\nTimestamp: ${timestamp}`,
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // best effort
  }
}
