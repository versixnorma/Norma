import { expect, test } from '@playwright/test';

test('Lista de assembleias carrega corretamente', async ({ page }) => {
  await page.goto('/assembleias');
  await expect(page.locator('h1')).toHaveText('Assembleias');

  // We expect either "Nenhuma assembleia encontrada" or a list
  const emptyState = page.getByText('Nenhuma assembleia encontrada');
  const listState = page.locator('main > div.space-y-4');

  await expect(emptyState.or(listState)).toBeVisible();
});

test('Filtros de assembleia funcionam', async ({ page }) => {
  await page.goto('/assembleias');

  await page.click('button:has-text("Ativas")');
  await expect(page.getByText('Ativas', { exact: true })).toHaveClass(/bg-primary/);

  await page.click('button:has-text("Encerradas")');
  await expect(page.getByText('Encerradas', { exact: true })).toHaveClass(/bg-primary/);
});
