import { expect, test } from '@playwright/test';

test('login page loads correctly', async ({ page }) => {
  // Go to login page
  await page.goto('/login');

  // Wait for the page to load completely
  await page.waitForSelector('input[placeholder="Digite seu e-mail"]');

  // Verify login page elements are present
  await expect(page.locator('text=NORMA')).toBeVisible();
  await expect(page.locator('text=Governança Assistida')).toBeVisible();
  await expect(page.locator('input[placeholder="Digite seu e-mail"]')).toBeVisible();
  await expect(page.locator('input[placeholder="Digite sua senha"]')).toBeVisible();
  await expect(page.locator('button:has-text("Entrar")')).toBeVisible();
  await expect(page.locator('text=Não tem conta?')).toBeVisible();
});

test('home page loads correctly', async ({ page }) => {
  // Go to home page directly (for testing purposes)
  await page.goto('/home');

  // Wait for the page to load
  await page.waitForTimeout(2000);

  // Check for NORMA branding (should be visible regardless of auth state)
  await expect(page.locator('text=NORMA')).toBeVisible();
});
