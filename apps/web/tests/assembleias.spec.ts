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

  // Since we don't have credentials in the env vars yet for E2E,
  // I will write a test that verifies the AuthGuard protection works.
  test('should redirect to login if unauthenticated', async ({ page }) => {
    await page.goto('/assembleias');
    await expect(page).toHaveURL(/.*login/);
  });
});
