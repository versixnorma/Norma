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
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/index.ts', // barrels usually not logic
        'src/components/ui/**', // shadcn components usually don't need heavy unit testing if unmodified
        'src/types/**', // type definitions
        'src/**/*.stories.{ts,tsx}', // storybook files
      ],
      // P1 Fix: Add coverage thresholds for production readiness
      thresholds: {
        // Start with achievable thresholds and increase over time
        lines: 50,
        functions: 50,
        branches: 40,
        statements: 50,
        // Per-file thresholds to catch untested new files
        perFile: true,
        // Allow some files to have lower coverage initially
        // Remove these as coverage improves
        '100': false, // Don't require 100% anywhere yet
      },
    },
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
    // Setup files for test utilities
    setupFiles: ['./tests/setup.ts'],
  },
});
