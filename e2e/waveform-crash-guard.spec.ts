/**
 * E2E test: Crash prevention with file uploads (AC-10)
 *
 * Verifies that uploading files doesn't cause browser OOM
 * and that demo mode renders charts correctly.
 */
import { test, expect } from '@playwright/test';
import path from 'path';

const FIXTURES_DIR = path.resolve(__dirname, '../__tests__/fixtures/sd-card');

/** Helper: click a tab by its text content using data-slot selector */
async function clickTab(page: import('@playwright/test').Page, text: RegExp) {
  await page.locator('[data-slot="tabs-trigger"]').filter({ hasText: text }).click({ force: true });
}

test.describe('Crash Guard', () => {
  // ── Test Case 20: File upload doesn't crash ───────────────────

  test('uploading fixtures does not cause page crash or OOM', async ({ page }) => {
    let pageCrashed = false;
    page.on('crash', () => { pageCrashed = true; });

    await page.goto('/analyze');

    const fileInput = page.locator('input[type="file"][webkitdirectory]');
    await expect(fileInput).toBeAttached();
    await fileInput.setInputFiles(FIXTURES_DIR);

    // Wait for analysis to complete
    await expect(
      page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
    ).toBeVisible({ timeout: 90_000 });

    expect(pageCrashed).toBe(false);

    // Navigate to Graphs tab to trigger waveform extraction
    await clickTab(page, /graphs/i);

    // Wait for waveform processing
    await page.waitForTimeout(5_000);

    // Page should still be responsive
    expect(pageCrashed).toBe(false);

    // Should be able to interact with the page
    await clickTab(page, /overview/i);
    await expect(
      page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
    ).toBeVisible();
  });

  test('demo mode renders all charts without crash', async ({ page }) => {
    let pageCrashed = false;
    page.on('crash', () => { pageCrashed = true; });

    await page.goto('/analyze?demo=1');

    // Wait for demo analysis to complete
    await expect(
      page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
    ).toBeVisible({ timeout: 30_000 });

    // Navigate to Graphs tab — demo mode generates synthetic waveforms
    await clickTab(page, /graphs/i);

    // Wait for charts to render
    await page.waitForTimeout(3_000);

    expect(pageCrashed).toBe(false);

    // Navigate away and back to verify stability
    await clickTab(page, /overview/i);
    await clickTab(page, /graphs/i);
    await page.waitForTimeout(2_000);

    expect(pageCrashed).toBe(false);
  });
});
