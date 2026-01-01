import { expect, test } from '@playwright/test';
import { loginAsUser } from './helpers/auth-helpers';

test.describe('Módulo Financeiro', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'morador');
  });

  test('exibe transparência financeira com abas', async ({ page }) => {
    await page.goto('/financeiro');

    await expect(page.getByRole('heading', { name: /Transparência Financeira/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Minhas Taxas/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Prestação de Contas/i })).toBeVisible();

    await expect(page.getByRole('main')).toContainText(/Taxas|Nenhuma taxa encontrada|pendentes/i);
  });

  test('alterna para prestação de contas', async ({ page }) => {
    await page.goto('/financeiro');

    await page.getByRole('button', { name: /Prestação de Contas/i }).click();
    await expect(page.getByRole('main')).toContainText(/Prestação de Contas|Saldo do Condomínio|Nenhuma prestação disponível/i);
  });
});
