import { expect, test } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test('should load onboarding page with correct elements', async ({ page }) => {
    await page.goto('/onboarding');

    // Check for initial step content
    await expect(page.locator('text=Conheça a Norma')).toBeVisible();
    await expect(page.locator('text=Sua assistente de IA')).toBeVisible();

    // Check for navigation buttons
    await expect(page.locator('button:has-text("Próximo")')).toBeVisible();
    await expect(page.locator('button:has-text("Pular Introdução")')).toBeVisible();
  });

  test('should navigate through onboarding steps', async ({ page }) => {
    await page.goto('/onboarding');

    // Step 1 -> 2
    await page.click('button:has-text("Próximo")');
    await page.waitForTimeout(500); // Wait for animation
    await expect(page.locator('text=Transparência Total')).toBeVisible();

    // Step 2 -> 3
    await page.click('button:has-text("Próximo")');
    await page.waitForTimeout(500); // Wait for animation
    await expect(page.locator('text=Comunidade Conectada')).toBeVisible();

    // Step 3 -> Finish (Welcome)
    // The button text changes to "Começar" on the last step
    const startButton = page.locator('button:has-text("Começar")');
    await expect(startButton).toBeVisible();
    await startButton.click();

    // Should navigate to /welcome
    await expect(page).toHaveURL(/\/welcome/);
  });

  test('should skip onboarding', async ({ page }) => {
    await page.goto('/onboarding');

    await page.click('button:has-text("Pular Introdução")');

    // Should navigate to /home
    await expect(page).toHaveURL(/\/home/);
  });
});
