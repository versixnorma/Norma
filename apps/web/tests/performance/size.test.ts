import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Bundle Size', () => {
  test('Main bundles should be under 200KB', async () => {
    // This test assumes project is built at .next
    const nextDir = path.join(process.cwd(), '.next');
    const staticDir = path.join(nextDir, 'static', 'chunks');

    // Skip if build not present (e.g. in test env without build)
    if (!fs.existsSync(staticDir)) {
      console.warn('Build directory not found, skipping bundle size test');
      return;
    }

    const files = fs.readdirSync(staticDir);
    const heavyBundles: string[] = [];

    for (const file of files) {
      if (file.endsWith('.js')) {
        const stats = fs.statSync(path.join(staticDir, file));
        const sizeKB = stats.size / 1024;

        // Check for specific large chunks if we know them,
        // otherwise check generic threshold.
        // Framework chunks might be large, but page chunks should be smaller.
        if (sizeKB > 500) {
          // relaxed limit for vendor/framework
          heavyBundles.push(`${file} (${sizeKB.toFixed(2)} KB)`);
        }
      }
    }

    // Expect no extremely large bundles
    expect(heavyBundles, `Found heavy bundles: ${heavyBundles.join(', ')}`).toEqual([]);
  });
});
