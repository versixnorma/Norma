import { expect, test } from '@playwright/test';
import { loginAsUser } from './helpers/auth-helpers';

test.describe('Módulo Assembleias', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'morador');
  });

  test('lista assembleias com filtros', async ({ page }) => {
    await page.goto('/assembleias');

    await expect(page.getByRole('heading', { name: /Assembleias/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Todas/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Ativas/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Encerradas/i })).toBeVisible();

    await expect(page.getByRole('main')).toContainText(/Assembleia|Nenhuma assembleia encontrada|AO VIVO/i);
  });

  test('filtra assembleias ativas sem quebrar a página', async ({ page }) => {
    await page.goto('/assembleias');

    await page.getByRole('button', { name: /Ativas/i }).click();
    await expect(page.getByRole('main')).toContainText(/Assembleia|Nenhuma assembleia encontrada|AO VIVO/i);
  });
});
