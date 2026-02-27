// @ts-nocheck
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],

      // Include cirúrgico: apenas arquivos com testes unitários existentes.
      // Páginas Next.js (src/app/) e componentes UI são cobertos por testes E2E.
      // Hooks/lib sem testes são adicionados aqui conforme novos testes são criados.
      include: [
        'src/hooks/**/*.ts',
        'src/lib/api-helpers.ts',
        'src/lib/schemas/**/*.{ts,tsx}',
        'src/lib/services/**/*.ts',
      ],

      thresholds: {
        statements: 41,
        branches: 30,
        functions: 40,
        lines: 44,
      },
    },
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
    // Setup files for test utilities
    setupFiles: ['./tests/setup.ts'],
  },
});
