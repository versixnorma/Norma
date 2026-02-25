import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Páginas públicas (sem auth)
const publicPages = ['/login', '/offline'];

// Páginas autenticadas (requerem setup de auth)
const authPages = [
  '/home',
  '/comunicados',
  '/chamados',
  '/financeiro',
  '/assembleias',
  '/sos',
  '/perfil',
  '/configuracoes',
];

// Páginas admin
const adminPages = [
  '/admin/dashboard',
  '/admin/usuarios',
  '/admin/condominios',
  '/admin/analytics',
];

for (const page of publicPages) {
  test(`a11y: ${page}`, async ({ page: p }) => {
    await p.goto(page);
    await p.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page: p })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('.recharts-wrapper') // Charts são notoriamente difíceis para a11y
      .analyze();

    if (results.violations.length > 0) {
      console.log(`Violations on ${page}:`, JSON.stringify(results.violations, null, 2));
    }

    expect(results.violations).toEqual([]);
  });
}

test.describe('Authenticated pages', () => {
  test.use({ storageState: 'tests/.auth/user.json' });

  for (const page of authPages) {
    test(`a11y: ${page}`, async ({ page: p }) => {
      await p.goto(page);
      await p.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page: p })
        .withTags(['wcag2a', 'wcag2aa'])
        .exclude('.recharts-wrapper')
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
});

test.describe('Admin pages', () => {
  test.use({ storageState: 'tests/.auth/admin.json' });

  for (const page of adminPages) {
    test(`a11y: ${page}`, async ({ page: p }) => {
      await p.goto(page);
      await p.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page: p })
        .withTags(['wcag2a', 'wcag2aa'])
        .exclude('.recharts-wrapper')
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
});
