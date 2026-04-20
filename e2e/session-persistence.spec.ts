/**
 * E2E test: Session persistence and restoration
 *
 * Tests that analysis results persist in localStorage and are
 * correctly restored on page reload.
 */
import { test, expect } from '@playwright/test';
import path from 'path';

const FIXTURES_DIR = path.resolve(__dirname, '../__tests__/fixtures/sd-card');

test.describe('Session Persistence', () => {

  // ── Results persist after page reload ──────────────────────
  test('analysis results are restored after page reload', async ({ page }) => {
    // First: upload and analyze
    await page.goto('/analyze');
    const fileInput = page.locator('input[type="file"][webkitdirectory]');
    await expect(fileInput).toBeAttached();
    await fileInput.setInputFiles(FIXTURES_DIR);

    // Wait for analysis to complete
    await expect(
      page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
    ).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText('Analysis complete')).toBeVisible();

    // Reload the page
    await page.reload();

    // Wait for restored session
    await expect(
      page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
    ).toBeVisible({ timeout: 10_000 });

    // Should show "Previous session restored" banner
    await expect(page.getByText('Previous session restored')).toBeVisible();
  });

  // ── Restored session shows night count ─────────────────────
  test('restored session banner shows night count', async ({ page }) => {
    // First: upload and analyze
    await page.goto('/analyze');
    const fileInput = page.locator('input[type="file"][webkitdirectory]');
    await expect(fileInput).toBeAttached();
    await fileInput.setInputFiles(FIXTURES_DIR);

    await expect(
      page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
    ).toBeVisible({ timeout: 90_000 });

    // Reload
    await page.reload();

    await expect(
      page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
    ).toBeVisible({ timeout: 10_000 });

    // Should show night count in restored banner
    await expect(page.getByText(/Previous session restored.*\d+ nights?/)).toBeVisible();
  });

  // ── "New Analysis" on restored session returns to upload ────
  test('"New Analysis" button resets restored session to upload form', async ({ page }) => {
    // Upload and analyze
    await page.goto('/analyze');
    const fileInput = page.locator('input[type="file"][webkitdirectory]');
    await expect(fileInput).toBeAttached();
    await fileInput.setInputFiles(FIXTURES_DIR);

    await expect(
      page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
    ).toBeVisible({ timeout: 90_000 });

    // Reload to get restored session
    await page.reload();
    await expect(page.getByText('Previous session restored')).toBeVisible({ timeout: 10_000 });

    // Click "New Analysis"
    await page.getByText('New Analysis').click();

    // Upload form should reappear
    await expect(page.locator('input[type="file"][webkitdirectory]')).toBeAttached({ timeout: 5_000 });
    await expect(page.getByText('Try sample data')).toBeVisible();
  });

  // ── Lifetime night counter persists ─────────────────────────
  test('lifetime night counter increments across sessions', async ({ page }) => {
    // Clear any prior state
    await page.goto('/analyze');
    await page.evaluate(() => {
      localStorage.removeItem('airwaylab_analyzed_dates');
      localStorage.removeItem('airwaylab_nights_analyzed');
    });

    // Upload and analyze
    const fileInput = page.locator('input[type="file"][webkitdirectory]');
    await expect(fileInput).toBeAttached();
    await fileInput.setInputFiles(FIXTURES_DIR);

    await expect(
      page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
    ).toBeVisible({ timeout: 90_000 });

    // Check that lifetime counter is set in localStorage
    const lifetimeNights = await page.evaluate(() => {
      return parseInt(localStorage.getItem('airwaylab_nights_analyzed') || '0', 10);
    });
    expect(lifetimeNights).toBeGreaterThan(0);
  });

  // ── Session count tracks new vs returning user ──────────────
  test('session count increments on each page load', async ({ page }) => {
    await page.goto('/analyze');
    await page.evaluate(() => {
      localStorage.removeItem('airwaylab_session_count');
    });

    // First load — wait for page to fully hydrate before reading counter
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const count1 = await page.evaluate(() =>
      parseInt(localStorage.getItem('airwaylab_session_count') || '0', 10)
    );
    expect(count1).toBeGreaterThanOrEqual(1);

    // Second load
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const count2 = await page.evaluate(() =>
      parseInt(localStorage.getItem('airwaylab_session_count') || '0', 10)
    );
    expect(count2).toBeGreaterThan(count1);
  });

  // ── localStorage uses airwaylab_ prefix ─────────────────────
  test('persisted data uses airwaylab_ prefix in localStorage', async ({ page }) => {
    await page.goto('/analyze');
    const fileInput = page.locator('input[type="file"][webkitdirectory]');
    await expect(fileInput).toBeAttached();
    await fileInput.setInputFiles(FIXTURES_DIR);

    await expect(
      page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
    ).toBeVisible({ timeout: 90_000 });

    // Check that results are stored with the correct prefix
    const hasResults = await page.evaluate(() => {
      return localStorage.getItem('airwaylab_results') !== null;
    });
    expect(hasResults).toBe(true);
  });
});
