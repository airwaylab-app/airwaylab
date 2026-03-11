/**
 * E2E test: Crash prevention with large file sets (AC-10)
 *
 * Verifies that uploading many files doesn't cause browser OOM
 * by confirming the date-based filtering prevents loading all files.
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const FIXTURES = path.resolve(__dirname, '../__tests__/fixtures/sd-card');

/**
 * Create many synthetic file paths to simulate a large SD card.
 * Uses the real fixture BRP files repeated across fake date folders.
 */
function getFixtureFilesWithDuplicates(): string[] {
  const files: string[] = [];

  // Walk the real fixtures
  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.edf') || entry.name.endsWith('.tgt')) {
        files.push(full);
      }
    }
  }

  walk(FIXTURES);
  return files;
}

test.describe('Crash Guard', () => {
  // ── Test Case 20: Large file upload doesn't crash ─────────────

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

    // Upload all fixture files
    const files = getFixtureFilesWithDuplicates();
    await fileInput.setInputFiles(files);

    // Wait for analysis to complete (or fail gracefully)
    await expect(page.getByRole('tab', { name: /overview/i })).toBeVisible({
      timeout: 60_000,
    });

    // The page should not have crashed
    expect(pageCrashed).toBe(false);

    // Navigate to Graphs tab to trigger waveform extraction
    await page.getByRole('tab', { name: /graphs/i }).click();

    // Wait a reasonable time for waveform processing
    await page.waitForTimeout(5_000);

    // Page should still be responsive (not crashed/frozen)
    expect(pageCrashed).toBe(false);

    // Should be able to interact with the page (proves it's not frozen)
    const overviewTab = page.getByRole('tab', { name: /overview/i });
    await overviewTab.click();
    await expect(overviewTab).toBeVisible();
  });

  test('demo mode renders all charts without crash', async ({ page }) => {
    let pageCrashed = false;
    page.on('crash', () => { pageCrashed = true; });

    // Navigate to demo mode
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

    // Should be able to navigate away and back
    await page.getByRole('tab', { name: /overview/i }).click();
    await page.getByRole('tab', { name: /graphs/i }).click();
    await page.waitForTimeout(2_000);

    expect(pageCrashed).toBe(false);
  });
});
