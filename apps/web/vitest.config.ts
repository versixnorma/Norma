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
        // Utilitários puros — alta cobertura (alvo: >80%)
        'src/lib/sanitize.ts',
        'src/lib/utils.ts',
        'src/lib/api-helpers.ts',
        'src/lib/schemas/**/*.{ts,tsx}',

        // Hooks críticos com testes existentes — cobertura parcial (alvo: >30%)
        'src/hooks/useAuth.ts',
        'src/hooks/useFinanceiro.ts',
        'src/hooks/useLancamentos.ts',
        'src/hooks/useDashboardFinanceiro.ts',
        'src/hooks/useAssembleias.ts',
      ],

      // Thresholds calibrados para a suíte atual (Sprint 5).
      // Valores medidos: stmts=27%, branches=14%, funcs=21%, lines=31%.
      // Margem de 3pp abaixo dos valores medidos para estabilidade de CI.
      // Roadmap de aumento gradual (adicionar testes nos sprints seguintes):
      //   Sprint 5 (atual): 25/12/18/28
      //   Sprint 6: 30/18/25/35 — ao adicionar testes de useOcorrencias, useNormaAI
      //   Sprint 7: 40/25/35/45 — ao adicionar testes de useFinancial, useChamados
      thresholds: {
        statements: 25,
        branches: 12,
        functions: 18,
        lines: 28,
      },
    },
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
    // Setup files for test utilities
    setupFiles: ['./tests/setup.ts'],
  },
});
