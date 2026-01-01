// Fixture para criação de usuário de teste para Playwright
// Roadmap: apps/web/tests/fixtures/test-user.ts

import { test as base } from '@playwright/test';
import { createTestUser, deleteTestUser } from '../utils/testUserUtils';

export type TestUser = {
  id: string;
  email: string;
  password: string;
  nome: string;
  condominio_id: string;
};

export const test = base.extend<{ testUser: TestUser }>({
  testUser: [async ({}, use) => {
    // Cria usuário de teste antes do teste
    const user = await createTestUser();
    await use(user);
    // Remove usuário de teste após o teste
    await deleteTestUser(user.id);
  }, { auto: true }],
});

export default test;
