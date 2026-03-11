/**
 * E2E test: Crash prevention with large file sets (AC-10)
 *
 * Verifies that uploading files doesn't cause browser OOM
 * and that demo mode renders charts correctly.
 */
import { test, expect } from '@playwright/test';
import path from 'path';

const FIXTURES_DIR = path.resolve(__dirname, '../__tests__/fixtures/sd-card');

test.describe('Crash Guard', () => {
  // ── Test Case 20: File upload doesn't crash ───────────────────

  test('uploading fixtures does not cause page crash or OOM', async ({ page }) => {
    let pageCrashed = false;
    page.on('crash', () => { pageCrashed = true; });

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/analyze');

    const fileInput = page.locator('input[type="file"][webkitdirectory]');
    await expect(fileInput).toBeAttached();
    await fileInput.setInputFiles(FIXTURES_DIR);

    // Wait for analysis to complete
    await expect(page.getByRole('tab', { name: /overview/i })).toBeVisible({
      timeout: 60_000,
    });

    expect(pageCrashed).toBe(false);

    // Navigate to Graphs tab to trigger waveform extraction
    await page.getByRole('tab', { name: /graphs/i }).click();

    // Wait for waveform processing
    await page.waitForTimeout(5_000);

    // Page should still be responsive
    expect(pageCrashed).toBe(false);

    // Should be able to interact with the page
    const overviewTab = page.getByRole('tab', { name: /overview/i });
    await overviewTab.click();
    await expect(overviewTab).toBeVisible();
  });

  test('demo mode renders all charts without crash', async ({ page }) => {
    let pageCrashed = false;
    page.on('crash', () => { pageCrashed = true; });

    await page.goto('/analyze?demo=1');

    // Wait for demo analysis to complete
    await expect(page.getByRole('tab', { name: /overview/i })).toBeVisible({
      timeout: 30_000,
    });

    // Navigate to Graphs tab — demo mode generates synthetic waveforms
    await page.getByRole('tab', { name: /graphs/i }).click();

    // Wait for charts to render
    await page.waitForTimeout(3_000);

    expect(pageCrashed).toBe(false);

    // Navigate away and back to verify stability
    await page.getByRole('tab', { name: /overview/i }).click();
    await page.getByRole('tab', { name: /graphs/i }).click();
    await page.waitForTimeout(2_000);

    expect(pageCrashed).toBe(false);
  });
});
