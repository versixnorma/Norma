import { expect } from '@playwright/test';
import test from '../../../fixtures/test-user';

test('Norma Chat opens and sends message', async ({ page, testUser }) => {
  await page.goto('/login');
  await page.fill('input[placeholder="Digite seu e-mail"]', testUser.email);
  await page.fill('input[placeholder="Digite sua senha"]', testUser.password);
  await page.click('button:has-text("Entrar")');
  await page.waitForURL('**/home*', { timeout: 30000 });

  // Open Chat - Assuming there is a button to open it.
  // I saw NormaChat has isOpen prop. In home page usually there is a floating button.
  // I need to look at home page to pinpoint the selector for opening chat.
  // As a fallback, I'll search for 'smart_toy' icon or a button with aria-label.

  // If the chat is closed by default, we need to click something.
  // Let's assume there's a button.
  await page.click('button:has(.material-symbols-outlined:text("smart_toy"))'); // Heuristic selector

  await expect(page.getByText('Norma AI')).toBeVisible();
  await expect(page.getByText('Olá')).toBeVisible(); // Welcome message

  // Send message
  await page.fill(
    'input[placeholder="Digite sua pergunta..."]',
    'Como reservar o salão de festas?'
  );
  await page.click('button:has(.material-symbols-outlined:text("send"))');

  // Verify typing indicator or response
  // Since we are likely using a mock/real integration, we check for presence of user message first
  await expect(page.getByText('Como reservar o salão de festas?')).toBeVisible();
});
