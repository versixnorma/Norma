import { Page } from '@playwright/test';

type UserRole = 'sindico' | 'morador' | 'admin';

type Credentials = { email: string; password: string };

const defaultCredentials: Record<UserRole, Credentials> = {
  sindico: {
    email: process.env.E2E_SINDICO_EMAIL || 'sindico@demo.versix.com.br',
    password: process.env.E2E_SINDICO_PASSWORD || 'demo123',
  },
  morador: {
    email: process.env.E2E_MORADOR_EMAIL || 'morador@demo.versix.com.br',
    password: process.env.E2E_MORADOR_PASSWORD || 'demo123',
  },
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@demo.versix.com.br',
    password: process.env.E2E_ADMIN_PASSWORD || 'demo123',
  },
};

export async function loginAsUser(page: Page, role: UserRole = 'morador'): Promise<void> {
  const creds = defaultCredentials[role];

  await page.goto('/login');
  await page.waitForSelector('input[type="email"], input[placeholder="Digite seu e-mail"]', { timeout: 10000 });

  await page.fill('input[type="email"], input[placeholder="Digite seu e-mail"]', creds.email);
  await page.fill('input[type="password"], input[placeholder="Digite sua senha"]', creds.password);
  await page.click('button[type="submit"], button:has-text("Entrar")');

  await page.waitForURL('**/home*', { timeout: 30000 });
}

export type { UserRole };
