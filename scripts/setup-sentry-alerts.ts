// scripts/setup-sentry-alerts.ts
// Configurar alertas automáticos no Sentry via API.
// Executar uma vez: npx ts-node scripts/setup-sentry-alerts.ts

const SENTRY_ORG = 'versix-solutions';
const SENTRY_PROJECT = 'versix-norma';
const SENTRY_TOKEN = process.env.SENTRY_AUTH_TOKEN;
const SLACK_WEBHOOK_ACTION_ID = process.env.SENTRY_SLACK_ACTION_ID;

if (!SENTRY_TOKEN) {
  console.error('❌ SENTRY_AUTH_TOKEN não definido.');
  process.exit(1);
}

async function createAlert(name: string, query: string, threshold: number) {
  const res = await fetch(
    `https://sentry.io/api/0/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/alert-rules/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENTRY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        dataset: 'events',
        query,
        aggregate: 'count()',
        timeWindow: 60, // 1 hora
        triggers: [
          {
            label: 'critical',
            alertThreshold: threshold,
            actions: SLACK_WEBHOOK_ACTION_ID
              ? [
                  {
                    type: 'slack',
                    targetType: 'specific',
                    targetIdentifier: '#norma-alerts',
                    inputChannelId: SLACK_WEBHOOK_ACTION_ID,
                  },
                ]
              : [],
          },
        ],
      }),
    }
  );
  const data = await res.json();
  console.log(`${res.ok ? '✅' : '❌'} Alert "${name}": HTTP ${res.status}`);
  if (!res.ok) console.error('   Detalhe:', JSON.stringify(data));
  return data;
}

async function main() {
  // Alerta 1: >5 erros em process-document por hora
  await createAlert(
    'process-document failures',
    'tags[function_name]:process-document level:error',
    5
  );

  // Alerta 2: >10 erros em ask-norma por hora
  await createAlert('ask-norma failures', 'tags[function_name]:ask-norma level:error', 10);

  // Alerta 3: >3 fallbacks de IA por hora (Circuit Breaker ativado)
  await createAlert(
    'AI fallback rate',
    'message:*fallback* tags[function_name]:ask-norma',
    3
  );

  // Alerta 4: >20 erros 429 (rate limiting) por hora
  await createAlert('Rate limit spikes', 'tags[status_code]:429', 20);

  console.log('\n🎯 All alerts configured.');
}

main().catch((err) => {
  console.error('Erro ao configurar alertas:', err);
  process.exit(1);
});
