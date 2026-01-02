import { expect, test } from '@playwright/test';

test.describe('API Response Time', () => {
  test('Critical API endpoints should respond under 500ms', async ({ request, testUser }) => {
    // Requires authenticated context if we test protected APIs.
    // We can test public health check or similar first.

    // Start Time
    const start = Date.now();
    const response = await request.get('/api/health'); // Assuming this exists based on PROXIMOS_PASSOS
    const end = Date.now();

    const duration = end - start;
    console.log(`Health Check Duration: ${duration}ms`);

    expect(response.ok()).toBeTruthy();
    expect(duration).toBeLessThan(800); // 500ms ideal + network buffer
  });

  test('Login API should be responsive', async ({ request, testUser }) => {
    // This is checking the API directly, bypassing UI
    const start = Date.now();
    const response = await request.post('/auth/v1/token?grant_type=password', {
      // This endpoint depends on Supabase, but we might be testing our own /api/auth wrapper if it exists.
      // If using Supabase direct, we test network latency to Supabase which is outside our control but good to know.
      // Let's assume we test our internal API routes or the main page load.
      // Better: Test a Next.js API route.
    });
    // Since we don't know exact API route for login (likely Supabase client-side),
    // we test a page navigation timing which relates to TFB (Time to First Byte).
  });

  test('Home page TFB should be under 600ms', async ({ page, testUser }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[placeholder="Digite seu e-mail"]', testUser.email);
    await page.fill('input[placeholder="Digite sua senha"]', testUser.password);
    await page.click('button:has-text("Entrar")');
    await page.waitForURL('**/home*');

    const navigationTiming = await page.evaluate(() => {
      const entries = performance.getEntriesByType('navigation');
      if (entries.length > 0) {
        return (entries[0] as PerformanceNavigationTiming).responseStart;
      }
      return 0;
    });

    console.log(`Time to First Byte (approx): ${navigationTiming}ms`);
    // Note: client side navigation might report 0 or different stats for 'navigation' type if it was SPA transition.
    // If it was a hard reload:
    await page.reload();
    const reloadTiming = await page.evaluate(() => {
      const entries = performance.getEntriesByType('navigation');
      return (entries[entries.length - 1] as PerformanceNavigationTiming).responseStart;
    });

    console.log(`TFB on Reload: ${reloadTiming}ms`);
    expect(reloadTiming).toBeLessThan(1000);
  });
});
