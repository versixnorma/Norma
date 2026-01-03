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
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/index.ts', // barrels usually not logic
        'src/components/ui/**', // shadcn component usually don't need heavy unit testing if unmodified
      ],
    },
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
  },
});
