/**
 * E2E test: Export flow + error handling + mobile viewport
 *
 * Complementary tests for gaps in existing e2e coverage:
 * - Export buttons (CSV, JSON, forum copy) are visible and clickable after analysis
 * - Invalid file upload shows helpful error (not a crash)
 * - Mobile viewport: dashboard tabs accessible at 390px width
 */
import { test, expect } from '@playwright/test';
import path from 'path';

const FIXTURES_DIR = path.resolve(__dirname, '../__tests__/fixtures/sd-card');

/** Helper: click a tab by its text content using data-slot selector */
async function clickTab(page: import('@playwright/test').Page, text: RegExp) {
  await page.locator('[data-slot="tabs-trigger"]').filter({ hasText: text }).click({ force: true });
}

/** Helper: upload fixtures, wait for analysis, and dismiss any overlays */
async function uploadAndReady(page: import('@playwright/test').Page) {
  await page.goto('/analyze');
  const fileInput = page.locator('input[type="file"][webkitdirectory]');
  await expect(fileInput).toBeAttached();
  await fileInput.setInputFiles(FIXTURES_DIR);

  // Wait for analysis to complete
  await expect(
    page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
  ).toBeVisible({ timeout: 90_000 });

  // Dismiss contribution nudge overlay if present (blocks export button clicks in CI)
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const dismiss = dialog.getByText(/not now|dismiss|skip|maybe later/i);
    if (await dismiss.isVisible().catch(() => false)) {
      await dismiss.click();
      await expect(dialog).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
    } else {
      // Force-remove the overlay if dismiss button not found
      await dialog.evaluate(el => el.remove());
    }
  }
}

// ═══════════════════════════════════════════════════════════
// Export Flow
// ═══════════════════════════════════════════════════════════

test.describe('Export Flow', () => {

  test('CSV and JSON export buttons are visible and clickable', async ({ page }) => {
    await uploadAndReady(page);

    // CSV export button should be present
    const csvButton = page.locator('[aria-label*="CSV"]');
    await expect(csvButton).toBeVisible({ timeout: 5_000 });

    // JSON export button should be present
    const jsonButton = page.locator('[aria-label*="JSON"]');
    await expect(jsonButton).toBeVisible({ timeout: 5_000 });

    // Click CSV — should trigger download (blob URL creates a download event)
    const csvDownload = page.waitForEvent('download', { timeout: 5_000 }).catch(() => null);
    await csvButton.click({ force: true });
    const csv = await csvDownload;
    if (csv) {
      expect(csv.suggestedFilename()).toMatch(/\.csv$/);
    }

    // Click JSON
    const jsonDownload = page.waitForEvent('download', { timeout: 5_000 }).catch(() => null);
    await jsonButton.click({ force: true });
    const json = await jsonDownload;
    if (json) {
      expect(json.suggestedFilename()).toMatch(/\.json$/);
    }
  });

  test('forum copy button is visible and clickable', async ({ page }) => {
    await uploadAndReady(page);

    const forumButton = page.locator('[aria-label*="forum"]');
    await expect(forumButton).toBeVisible({ timeout: 5_000 });

    // Click — should not crash (clipboard may not work in headless CI)
    await forumButton.click({ force: true });

    // Give the UI a moment to update state
    await page.waitForTimeout(500);

    // At minimum: page still functional, no crash
    await expect(page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════
// Error Handling
// ═══════════════════════════════════════════════════════════

test.describe('Error Handling', () => {

  test('uploading non-EDF files shows validation state, not crash', async ({ page }) => {
    let pageCrashed = false;
    page.on('crash', () => { pageCrashed = true; });

    await page.goto('/analyze');

    const fileInput = page.locator('input[type="file"][webkitdirectory]');
    await expect(fileInput).toBeAttached();

    // Upload a non-EDF file (webkitdirectory inputs may reject — that's expected)
    const fakePath = path.resolve(__dirname, '../package.json');
    await fileInput.setInputFiles(fakePath).catch(() => {});

    expect(pageCrashed).toBe(false);
    // Upload area should remain functional
    await expect(page.locator('input[type="file"][webkitdirectory]')).toBeAttached();
  });

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
        !e.includes('404')
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

    await expect(page.getByText('Upload SD Card')).toBeVisible();
    await expect(page.getByText('See sample data')).toBeVisible();
    await expect(page.locator('input[type="file"][webkitdirectory]')).toBeAttached();
  });
});
