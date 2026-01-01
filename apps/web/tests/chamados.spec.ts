import { expect, test } from '@playwright/test';
import { loginAsUser } from './helpers/auth-helpers';

test.describe('Módulo Chamados', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'morador');
  });

  test('exibe lista de chamados ou estado vazio', async ({ page }) => {
    await page.goto('/chamados');

    await expect(page.getByRole('heading', { name: /Meus Chamados/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Novo$/i })).toBeVisible();

    await expect(page.getByRole('main')).toContainText(/Chamado|Nenhum chamado/i);
  });

  test('abre formulário de novo chamado e permite preencher dados', async ({ page }) => {
    await page.goto('/chamados');

    await page.getByRole('button', { name: /^Novo$/i }).click();
    await expect(page.getByRole('heading', { name: /Novo Chamado/i })).toBeVisible();

    await page.getByLabel(/Título/i).fill('Teste E2E Chamado');
    await page.getByLabel(/Descrição/i).fill('Descrição criada pelo teste automatizado.');

    await expect(page.getByRole('button', { name: /Enviar Chamado/i })).toBeVisible();
    await page.getByRole('button', { name: /close/i }).click();
  });
});
