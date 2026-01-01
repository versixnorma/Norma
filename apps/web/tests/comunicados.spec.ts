import { expect, test } from '@playwright/test';
import { loginAsUser } from './helpers/auth-helpers';

test.describe('Módulo Comunicados', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'morador');
  });

  test('lista comunicados e filtros', async ({ page }) => {
    await page.goto('/comunicados');

    await expect(page.getByRole('heading', { name: /Comunicados/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Todas/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Financeiro/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Segurança/i })).toBeVisible();

    await expect(page.getByRole('main')).toContainText(/Comunicado|Nenhum comunicado/i);
  });

  test('abre detalhes de um comunicado quando disponível', async ({ page }) => {
    await page.goto('/comunicados');

    const firstHeading = page.getByRole('heading', { level: 3 }).first();
    const headingText = await firstHeading.textContent({ timeout: 5000 }).catch(() => null);

    if (!headingText || /Nenhum comunicado/i.test(headingText)) {
      await expect(page.getByRole('main')).toContainText(/Nenhum comunicado/i);
      return;
    }

    await firstHeading.click();
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 5000 });
  });
});
