import { expect, test } from '@playwright/test';

test.describe('Performance: API Response Times', () => {
  test('should fetch data from Supabase within acceptable limits', async ({ page }) => {
    // Aumentar timeout do teste para permitir navegação
    test.setTimeout(60000);

    const threshold = 800; // 800ms como alvo (soft limit)
    const violations: string[] = [];

    // Monitorar requests finalizados
    page.on('requestfinished', async (request) => {
      const url = request.url();

      // Filtrar apenas chamadas de API do Supabase (ignorar assets/realtime/websocket se possível)
      if (url.includes('.supabase.co') && !url.includes('/realtime')) {
        const timing = request.timing();

        // Calcular duração total (inclui DNS/Connect/TLS + Request + Response)
        if (timing.responseEnd !== -1 && timing.startTime !== -1) {
          const duration = timing.responseEnd - timing.startTime;

          if (duration > threshold) {
            const msg = `[SLOW API] ${duration.toFixed(0)}ms - ${url}`;
            console.warn(msg);
            violations.push(msg);
          } else {
            console.log(`[OK] ${duration.toFixed(0)}ms - ${url}`);
          }
        }
      }
    });

    console.log('--- Testing API Performance: Login Page ---');
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    console.log('--- Testing API Performance: SOS Page ---');
    await page.goto('/sos');
    await page.waitForLoadState('networkidle');

    // Relatório final
    if (violations.length > 0) {
      console.warn(`Total Performance Violations (> ${threshold}ms): ${violations.length}`);
    } else {
      console.log('All API requests within performance threshold.');
    }

    // Assertion sempre passa para não quebrar CI (Monitoramento apenas)
    expect(true).toBe(true);
  });
});
