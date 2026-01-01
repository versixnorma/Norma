import { expect } from '@playwright/test';
import test from './fixtures/test-user';

// Teste 1: Login com usuário de teste

test('usuário de teste consegue fazer login', async ({ page, testUser }) => {
  await page.goto('/login');
  await page.fill('input[placeholder="Digite seu e-mail"]', testUser.email);
  await page.fill('input[placeholder="Digite sua senha"]', testUser.password);
  await page.click('button:has-text("Entrar")');
  await page.waitForURL('**/home*', { timeout: 30000 });
});

// Teste 2: Logout

test('usuário consegue fazer logout', async ({ page, testUser }) => {
  // Login
  await page.goto('/login');
  await page.fill('input[placeholder="Digite seu e-mail"]', testUser.email);
  await page.fill('input[placeholder="Digite sua senha"]', testUser.password);
  await page.click('button:has-text("Entrar")');
  await page.waitForURL('**/home*', { timeout: 30000 });
  await expect(page.locator('[aria-label="Sair"]')).toBeVisible({ timeout: 20000 });
  // Logout
  await page.click('button[aria-label="Sair"]');
  await expect(page.locator('input[placeholder="Digite seu e-mail"]')).toBeVisible();
});

// Teste 3: Navegação para página de chamados

test('usuário navega para chamados', async ({ page, testUser }) => {
  await page.goto('/login');
  await page.fill('input[placeholder="Digite seu e-mail"]', testUser.email);
  await page.fill('input[placeholder="Digite sua senha"]', testUser.password);
  await page.click('button:has-text("Entrar")');
  await page.waitForURL('**/home*', { timeout: 30000 });
  await expect(page.locator('a[href="/chamados"]')).toBeVisible({ timeout: 20000 });
  await page.click('a[href="/chamados"]');
  await expect(page.locator('h1')).toHaveText(/Chamados/i);
});

// Teste 4: Acessibilidade - botão Entrar tem aria-label

test('botão Entrar possui aria-label', async ({ page }) => {
  await page.goto('/login');
  const btn = page.locator('button:has-text("Entrar")');
  await expect(btn).toHaveAttribute('aria-label', /entrar/i);
});

// Teste 5: Falha de login exibe mensagem de erro

test('mensagem de erro ao login inválido', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[placeholder="Digite seu e-mail"]', 'fake@user.com');
  await page.fill('input[placeholder="Digite sua senha"]', 'senhaerrada');
  await page.click('button:has-text("Entrar")');
  await expect(page.locator('.error-message')).toBeVisible();
});
