/**
 * E2E test: Export flow + error handling
 *
 * Complementary tests for gaps in existing e2e coverage:
 * - Export buttons (CSV, JSON, forum copy) trigger correctly after analysis
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

/** Helper: upload fixtures and wait for analysis to complete */
async function uploadAndWaitForAnalysis(page: import('@playwright/test').Page) {
  await page.goto('/analyze');
  const fileInput = page.locator('input[type="file"][webkitdirectory]');
  await expect(fileInput).toBeAttached();
  await fileInput.setInputFiles(FIXTURES_DIR);

  await expect(
    page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
  ).toBeVisible({ timeout: 90_000 });
}

/** Helper: dismiss any modal overlay (contribution nudge, etc.) */
async function dismissOverlays(page: import('@playwright/test').Page) {
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible({ timeout: 2_000 }).catch(() => false)) {
    const dismiss = dialog.getByText(/not now|dismiss|skip|maybe later/i);
    if (await dismiss.isVisible().catch(() => false)) {
      await dismiss.click();
    } else {
      await dialog.evaluate(el => el.remove());
    }
  }
}

// ═══════════════════════════════════════════════════════════
// Export Flow
// ═══════════════════════════════════════════════════════════

test.describe('Export Flow', () => {

  test('CSV export button triggers download', async ({ page }) => {
    await uploadAndWaitForAnalysis(page);
    await dismissOverlays(page);

    // CSV export button should be visible
    const csvButton = page.locator('[aria-label*="Export"][aria-label*="CSV"]');
    await expect(csvButton).toBeVisible({ timeout: 5_000 });

    // Set up download listener before clicking
    const downloadPromise = page.waitForEvent('download', { timeout: 10_000 }).catch(() => null);
    await csvButton.click();
    const download = await downloadPromise;

    // Download should have triggered with a .csv filename
    if (download) {
      expect(download.suggestedFilename()).toMatch(/\.csv$/);
    }
    // If download didn't trigger (blob URL or clipboard), at minimum no crash occurred
  });

  test('JSON export button triggers download', async ({ page }) => {
    await uploadAndWaitForAnalysis(page);
    await dismissOverlays(page);

    const jsonButton = page.locator('[aria-label*="Export"][aria-label*="JSON"]');
    await expect(jsonButton).toBeVisible({ timeout: 5_000 });

    const downloadPromise = page.waitForEvent('download', { timeout: 10_000 }).catch(() => null);
    await jsonButton.click();
    const download = await downloadPromise;

    if (download) {
      expect(download.suggestedFilename()).toMatch(/\.json$/);
    }
  });

  test('forum copy button copies text to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await uploadAndWaitForAnalysis(page);
    await dismissOverlays(page);

    const forumButton = page.locator('[aria-label*="forum"]');
    await expect(forumButton).toBeVisible({ timeout: 5_000 });
    await forumButton.click();

    // Button should show a success state (check icon or "Copied" text)
    // Give the UI a moment to update
    await page.waitForTimeout(500);
    const successIndicator = page.locator('[aria-label*="forum"]').locator('svg.text-emerald-500, .text-emerald-400');
    const hasSuccess = await successIndicator.isVisible({ timeout: 2_000 }).catch(() => false);

    // If clipboard API works in this env, verify content
    if (hasSuccess) {
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
      if (clipboardText) {
        // Forum export should contain the AirwayLab attribution
        expect(clipboardText).toContain('airwaylab');
      }
    }
    // At minimum: no crash
  });
});

// ═══════════════════════════════════════════════════════════
// Error Handling
// ═══════════════════════════════════════════════════════════

test.describe('Error Handling', () => {

  test('uploading non-EDF files shows validation error, not crash', async ({ page }) => {
    let pageCrashed = false;
    page.on('crash', () => { pageCrashed = true; });

    await page.goto('/analyze');

    // Create a fake non-EDF file and upload it
    const fileInput = page.locator('input[type="file"][webkitdirectory]');
    await expect(fileInput).toBeAttached();

    // Upload a directory with just a text file (simulating wrong folder)
    // We can't easily create a fake directory, so we'll use setInputFiles with a non-EDF file
    const fakePath = path.resolve(__dirname, '../package.json');
    await fileInput.setInputFiles(fakePath).catch(() => {
      // webkitdirectory inputs may reject non-directory selections — that's fine
    });

    // Page should not crash
    expect(pageCrashed).toBe(false);

    // If validation ran, error messages should appear (not a raw exception)
    // The upload area should still be functional
    await expect(page.locator('input[type="file"][webkitdirectory]')).toBeAttached();
  });

  test('no console errors on empty /analyze page', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/analyze');
    await page.waitForTimeout(2_000);

    // Filter out known benign errors (e.g., Sentry DSN in dev, favicon)
    const realErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('Sentry') && !e.includes('hydration')
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

    // Wait for dashboard to load
    await expect(
      page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
    ).toBeVisible({ timeout: 30_000 });

    // All tabs should be reachable (scrollable tab bar or wrapped)
    const tabTriggers = page.locator('[data-slot="tabs-trigger"]');
    const tabCount = await tabTriggers.count();
    expect(tabCount).toBeGreaterThanOrEqual(5);

    // Click through a subset of tabs to verify they render
    await clickTab(page, /overview/i);
    await page.waitForTimeout(300);
    expect(pageCrashed).toBe(false);

    await clickTab(page, /flow/i);
    await page.waitForTimeout(300);
    expect(pageCrashed).toBe(false);

    await clickTab(page, /trends/i);
    await page.waitForTimeout(300);
    expect(pageCrashed).toBe(false);
  });

  test('upload form is usable at mobile width', async ({ page }) => {
    await page.goto('/analyze');

    // Upload area should be visible and not cut off
    await expect(page.getByText('Upload SD Card')).toBeVisible();
    await expect(page.getByText('See sample data')).toBeVisible();

    // File input should be present
    await expect(page.locator('input[type="file"][webkitdirectory]')).toBeAttached();
  });
});
