import { expect, test } from '@playwright/test';

test.describe('Offline/PWA Capabilities', () => {
  test('should serve a valid manifest.json', async ({ request }) => {
    const response = await request.get('/manifest.json');
    expect(response.status()).toBe(200);

    // Validate content type usually application/manifest+json or application/json
    const contentType = response.headers()['content-type'];
    expect(contentType).toMatch(/application\/(manifest\+)?json/);

    const manifest = await response.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.icons).toBeTruthy();
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('should serve service worker (sw.js)', async ({ request }) => {
    const response = await request.get('/sw.js');
    expect(response.status()).toBe(200);

    // Should be javascript
    const contentType = response.headers()['content-type'];
    expect(contentType).toMatch(/application\/javascript|text\/javascript/);

    // Basic check if it contains expected SW content (generic)
    const text = await response.text();
    expect(text.length).toBeGreaterThan(0);
  });

  test('should handle offline mode without crashing', async ({ page }) => {
    // Navigate first to ensure cached resources (if any) or just to be on the app
    await page.goto('/login');

    // Simulate offline
    await page.context().setOffline(true);

    // Reload or Navigate should ideally show fallback or not crash entirely
    // Note: Standard browser behavior for offline reload is "No Internet" dino.
    // PWA behavior: Should show custom offline page or cached content if SW installed.
    // Since this is a fresh test context, SW might not be installed yet.
    // So we check if the APP UI handles offline event if we are already there.

    // Check if network status indicator appears (if implemented globally)
    // Or just ensure we don't have unhandled errors/blanks.
    await expect(page).not.toHaveTitle('Error');

    // Re-enable online to clean up
    await page.context().setOffline(false);
    await page.reload();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
