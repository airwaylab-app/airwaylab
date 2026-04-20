/**
 * E2E test: Error handling + mobile viewport
 *
 * Complementary tests for gaps in existing e2e coverage:
 * - No unexpected console errors on empty page
 * - Mobile viewport: dashboard tabs accessible at 390px width
 * - Mobile viewport: upload form usable
 */
import { test, expect } from '@playwright/test';

/** Helper: click a tab by its text content using data-slot selector */
async function clickTab(page: import('@playwright/test').Page, text: RegExp) {
  await page.locator('[data-slot="tabs-trigger"]').filter({ hasText: text }).click({ force: true });
}

// ═══════════════════════════════════════════════════════════
// Error Handling
// ═══════════════════════════════════════════════════════════

test.describe('Error Handling', () => {

  test('no unexpected console errors on empty /analyze page', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/analyze');
    await page.waitForTimeout(2_000);

    // Filter out known benign errors (Sentry in dev, favicon, Vercel scripts in CI)
    const realErrors = consoleErrors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('Sentry') &&
        !e.includes('hydration') &&
        !e.includes('_vercel') &&
        !e.includes('speed-insights') &&
        !e.includes('MIME type') &&
        !e.includes('404') &&
        !e.includes('429')
    );
    expect(realErrors).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════
// Mobile Viewport
// ═══════════════════════════════════════════════════════════

test.describe('Mobile Viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('dashboard tabs are accessible at mobile width', async ({ page }) => {
    let pageCrashed = false;
    page.on('crash', () => { pageCrashed = true; });

    await page.goto('/analyze?demo=1');

    await expect(
      page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
    ).toBeVisible({ timeout: 30_000 });

    // All tabs should be present
    const tabCount = await page.locator('[data-slot="tabs-trigger"]').count();
    expect(tabCount).toBeGreaterThanOrEqual(5);

    // Click through tabs to verify they render without crash
    for (const tab of [/overview/i, /flow/i, /trends/i]) {
      await clickTab(page, tab);
      await page.waitForTimeout(300);
      expect(pageCrashed).toBe(false);
    }
  });

  test('upload form is usable at mobile width', async ({ page }) => {
    await page.goto('/analyze');

    await expect(page.getByText('Choose your SD card folder')).toBeVisible();
    await expect(page.getByText('Try sample data')).toBeVisible();
    await expect(page.locator('input[type="file"][webkitdirectory]')).toBeAttached();
  });
});
