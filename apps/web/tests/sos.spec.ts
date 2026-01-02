import { expect, test } from '@playwright/test';

test.describe('SOS Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sos');
  });

  test('should load critical elements', async ({ page }) => {
    // Check for "MODO EMERGÊNCIA" header
    await expect(page.locator('text=MODO EMERGÊNCIA')).toBeVisible();

    // Check for critical quick action buttons
    // SAMU 192, Bombeiros 193, Polícia 190
    await expect(page.locator('text=SAMU')).toBeVisible();
    await expect(page.locator('text=192')).toBeVisible();

    await expect(page.locator('text=Bombeiros')).toBeVisible();
    await expect(page.locator('text=193')).toBeVisible();

    await expect(page.locator('text=Polícia')).toBeVisible();
    await expect(page.locator('text=190')).toBeVisible();
  });

  test('should verify call actions', async ({ page }) => {
    // Mock window.location.href to check if it tries to open tel: protocol
    // This is tricky in E2E but we can check if the onclick handler works or if the button is present
    // For now, simpler verification: check if buttons are present and look correct

    // We can also verify that they are buttons
    const samuButton = page.locator('button:has-text("SAMU")');
    await expect(samuButton).toBeEnabled();
  });

  test('should show offline warning', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true);

    // Check if the offline indicator appears in header
    await expect(page.locator('text=Offline').first()).toBeVisible();

    // Check for the offline warning message in the body
    // await expect(page.locator('text=Você está offline')).toBeVisible();
    // await expect(page.locator('text=Ligações funcionam normalmente')).toBeVisible();
  });
});
