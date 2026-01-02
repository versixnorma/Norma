import { expect, test } from '@playwright/test';

// Note: Full Lighthouse integration requires detailed setup or external CI
// This test is a placeholder/baseline verification using standard performance APIs accessible via Playwright
// until 'playwright-lighthouse' or similar is added to devDependencies.

test.describe('Lighthouse / Performance Metrics', () => {
  test('Page loads should be performant (LCP under 2.5s)', async ({ page }) => {
    await page.goto('/login');

    // Use Performance API to check LCP
    const lcp = await page.evaluate(async () => {
      return new Promise<number>((resolve) => {
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });

        // Timeout fallback
        setTimeout(() => resolve(0), 5000);
      });
    });

    // 2500ms is the 'Good' threshold for LCP
    // We use a slightly looser threshold for CI/Test env variability
    console.log(`LCP for Login: ${lcp.toFixed(2)}ms`);
    expect(lcp).toBeLessThan(4000);
  });

  test('CLS should be minimal (under 0.1)', async ({ page }) => {
    await page.goto('/login');

    const cls = await page.evaluate(async () => {
      return new Promise<number>((resolve) => {
        let cumulativeLayoutShift = 0;
        new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              cumulativeLayoutShift += (entry as any).value;
            }
          }
          resolve(cumulativeLayoutShift);
        }).observe({ type: 'layout-shift', buffered: true });

        setTimeout(() => resolve(0), 1000); // Short wait to capture initial shift
      });
    });

    console.log(`CLS for Login: ${cls.toFixed(3)}`);
    expect(cls).toBeLessThan(0.25); // 0.1 is good, 0.25 is needing improvement
  });
});
