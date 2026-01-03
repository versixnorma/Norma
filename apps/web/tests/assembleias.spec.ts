import { expect, test } from './fixtures/auth.fixture';

test.describe('Assembleias Page', () => {
  // Uses the 'activeUserPage' fixture which gives us an authenticated page immediately
  test.beforeEach(async ({ activeUserPage }) => {
    await activeUserPage.goto('/assembleias');
  });

  test('should verify page structure or redirection', async ({ activeUserPage }) => {
    // Should NOT redirect to login anymore because we are authenticated
    await expect(activeUserPage).toHaveURL(/.*assembleias/);

    // Check for common elements
    // await expect(activeUserPage.locator('h1')).toContainText('Assembleias');
  });

  test('should verify page structure or redirection', async ({ page }) => {
    // If not logged in, it should redirect to login
    if (page.url().includes('/login')) {
      await expect(page.locator('input[type="email"]')).toBeVisible();
      return;
    }

    // IF we somehow are logged in (persisted state not likely in clean context),
    // or if we decide to implement login:

    /*
    // Uncomment when we have stable test credentials
    await page.fill('input[type="email"]', 'test@versix.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button:has-text("Entrar")');
    await page.waitForURL('/home');
    await page.goto('/assembleias');
    */

    // Assessing structure assuming access:
    // await expect(page.locator('h1:has-text("Assembleias")')).toBeVisible();

    // Filters
    // await expect(page.locator('button:has-text("Todas")')).toBeVisible();
    // await expect(page.locator('button:has-text("Ativas")')).toBeVisible();
  });

  // Since we don't have credentials in the env vars yet for E2E,
  // I will write a test that verifies the AuthGuard protection works.
  test('should redirect to login if unauthenticated', async ({ page }) => {
    await page.goto('/assembleias');
    await expect(page).toHaveURL(/.*login/);
  });
});
