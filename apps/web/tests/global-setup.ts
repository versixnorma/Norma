import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { createTestUser } from './utils/testUserUtils';

async function globalSetup(config: FullConfig) {
  console.log('Setup Global: Criando usuário de teste...');
  const user = await createTestUser();
  console.log(`Setup Global: Usuário criado (${user.email})`);

  // Salva dados do usuário para teardown
  fs.writeFileSync(path.join(__dirname, 'global-user.json'), JSON.stringify(user));

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const baseURL = config.projects[0].use.baseURL || process.env.BASE_URL || 'http://localhost:3000';

  console.log(`Setup Global: Logando em ${baseURL}...`);
  await page.goto(baseURL + '/login');
  await page.fill('input[placeholder="Digite seu e-mail"]', user.email);
  await page.fill('input[placeholder="Digite sua senha"]', user.password);
  await page.click('button:has-text("Entrar")');

  // Aguarda redirecionamento ou cookie de sessão
  await page.waitForURL('**/home*', { timeout: 15000 });

  // Salva estado da sessão (cookies, localStorage)
  await page.context().storageState({ path: 'storageState.json' });
  console.log('Setup Global: Estado de autenticação salvo em storageState.json');

  await browser.close();
}

export default globalSetup;
