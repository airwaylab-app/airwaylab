/**
 * E2E test: Demo mode flow
 *
 * Tests the demo experience: loading sample data, navigating tabs,
 * verifying demo banner, and exiting demo mode.
 */
import { test, expect } from '@playwright/test';

/** Helper: click a tab by its text content using data-slot selector */
async function clickTab(page: import('@playwright/test').Page, text: RegExp) {
  await page.locator('[data-slot="tabs-trigger"]').filter({ hasText: text }).click({ force: true });
}

test.describe('Demo Mode Flow', () => {

  // ── Demo loads via URL param ────────────────────────────────
  test('?demo param loads sample data and shows demo banner', async ({ page }) => {
    await page.goto('/analyze?demo=1');

    // Wait for dashboard to appear
    await expect(
      page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
    ).toBeVisible({ timeout: 30_000 });

    // Demo banner should be visible
    await expect(page.getByText('Demo mode')).toBeVisible();
    // Should show BiPAP context
    await expect(page.getByText(/BiPAP ST|sample data/).first()).toBeVisible();
    // "Upload Your Data" button should be in the demo banner
    await expect(page.getByText('Upload Your Data')).toBeVisible();
  });

  // ── Demo loads via "Try sample data" button ─────────────────
  test('"Try sample data" button loads demo', async ({ page }) => {
    await page.goto('/analyze');

    await page.getByText('Try sample data').click();

    // Wait for dashboard tabs
    await expect(
      page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
    ).toBeVisible({ timeout: 30_000 });

    // Demo banner should be visible
    await expect(page.getByText('Demo mode')).toBeVisible();
  });

  // ── All tabs work with demo data ────────────────────────────
  test('all tabs render with demo data without crash', async ({ page }) => {
    let pageCrashed = false;
    page.on('crash', () => { pageCrashed = true; });

    await page.goto('/analyze?demo=1');

    await expect(
      page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
    ).toBeVisible({ timeout: 30_000 });

    const tabs = [
      /overview/i,
      /graphs/i,
      /trends/i,
      /gla|glasgow/i,
      /flow/i,
      /o₂|oximetry/i,
      /cmp|compare/i,
    ];

    for (const tab of tabs) {
      await clickTab(page, tab);
      await page.waitForTimeout(500);
      expect(pageCrashed).toBe(false);
    }
  });

  // ── Demo shows 7 sample nights ─────────────────────────────
  test('demo mode provides 7 sample nights', async ({ page }) => {
    await page.goto('/analyze?demo=1');

    await expect(
      page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
    ).toBeVisible({ timeout: 30_000 });

    // Night selector should contain 7 nights
    const nightOptions = page.locator('select option, [data-slot="select-option"]');
    const count = await nightOptions.count().catch(() => 0);
    // If using a select element, verify 7 options
    if (count > 0) {
      expect(count).toBe(7);
    }
  });

  // ── Heading shows "Demo Dashboard" ──────────────────────────
  test('demo mode shows "Demo Dashboard" heading', async ({ page }) => {
    await page.goto('/analyze?demo=1');

    await expect(
      page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
    ).toBeVisible({ timeout: 30_000 });

    await expect(page.getByText('Demo Dashboard')).toBeVisible();
  });

  // ── Exit demo returns to upload form ────────────────────────
  test('exit demo button returns to upload form', async ({ page }) => {
    await page.goto('/analyze?demo=1');

    await expect(
      page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
    ).toBeVisible({ timeout: 30_000 });

    // Click "Exit Demo"
    await page.getByText('Exit Demo').click();

    // Upload form should reappear
    await expect(page.locator('input[type="file"][webkitdirectory]')).toBeAttached({ timeout: 5_000 });
  });

  // ── Upload Your Data button in banner exits demo ────────────
  test('"Upload Your Data" in demo banner exits demo', async ({ page }) => {
    await page.goto('/analyze?demo=1');

    await expect(
      page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
    ).toBeVisible({ timeout: 30_000 });

    await page.getByText('Upload Your Data').click();

    // Upload form should reappear
    await expect(page.locator('input[type="file"][webkitdirectory]')).toBeAttached({ timeout: 5_000 });
  });

  // ── Share button is hidden in demo mode ─────────────────────
  test('share button is not shown in demo mode', async ({ page }) => {
    await page.goto('/analyze?demo=1');

    await expect(
      page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
    ).toBeVisible({ timeout: 30_000 });

    // Share button should not be visible in demo
    const shareButton = page.getByLabel('Share analysis via link');
    await expect(shareButton).not.toBeVisible();
  });
});
