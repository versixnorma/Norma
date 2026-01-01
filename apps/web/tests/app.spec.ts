import { expect } from '@playwright/test';
import test from './fixtures/test-user';
import { loginAsUser } from './helpers/auth-helpers';

// Teste 6: Visualização de comunicado

test('usuário visualiza comunicado', async ({ page, testUser }) => {
  await page.goto('/login');
  await page.fill('input[placeholder="Digite seu e-mail"]', testUser.email);
  await page.fill('input[placeholder="Digite sua senha"]', testUser.password);
  await page.click('button:has-text("Entrar")');
  await page.waitForURL('**/home*', { timeout: 30000 });
  await page.goto('/comunicados', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: /Comunicados/i })).toBeVisible();
});

// Teste 7: Visualização de taxas

test('usuário visualiza taxas', async ({ page, testUser }) => {
  await page.goto('/login');
  await page.fill('input[placeholder="Digite seu e-mail"]', testUser.email);
  await page.fill('input[placeholder="Digite sua senha"]', testUser.password);
  await page.click('button:has-text("Entrar")');
  await page.waitForURL('**/home*', { timeout: 30000 });
  await page.goto('/financeiro');
  await expect(page.getByRole('heading', { name: /Transparência Financeira/i })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: /Minhas Taxas/i })).toBeVisible();
});

// Teste 8: Visualização de prestação de contas

test('usuário visualiza prestação de contas', async ({ page, testUser }) => {
  await page.goto('/login');
  await page.fill('input[placeholder="Digite seu e-mail"]', testUser.email);
  await page.fill('input[placeholder="Digite sua senha"]', testUser.password);
  await page.click('button:has-text("Entrar")');
  await page.waitForURL('**/home*', { timeout: 30000 });
  await page.goto('/financeiro');
  await expect(page.getByRole('heading', { name: /Transparência Financeira/i })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: /Prestação de Contas/i }).click();
  await expect(page.getByText(/Prestação de Contas/i)).toBeVisible();
});

// Teste 9: Visualização de ocorrências

test('usuário visualiza ocorrências', async ({ page, testUser }) => {
  await page.goto('/login');
  await page.fill('input[placeholder="Digite seu e-mail"]', testUser.email);
  await page.fill('input[placeholder="Digite sua senha"]', testUser.password);
  await page.click('button:has-text("Entrar")');
  await page.waitForURL('**/home*', { timeout: 30000 });
  await page.goto('/ocorrencias', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: /Ocorrências/i })).toBeVisible();
});

// Teste 10: Visualização de integrações

test('usuário visualiza integrações', async ({ page }) => {
  await loginAsUser(page, 'sindico');
  await page.goto('/sindico/integracoes');
  await page.waitForURL('**/sindico/integracoes*', { timeout: 10000 });
  await expect(page.getByRole('heading', { name: /Integrações/i })).toBeVisible();
});
