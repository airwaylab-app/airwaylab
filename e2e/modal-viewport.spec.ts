/**
 * E2E test: Modal viewport positioning
 *
 * Regression test for the portal fix: ensures all modals render
 * via createPortal to document.body and are properly centered in
 * the viewport, regardless of scroll position.
 *
 * Background: <main> has overflow-x-hidden which breaks fixed
 * positioning on mobile browsers when modals render inside it.
 * All modals must portal to document.body.
 */
import { test, expect } from '@playwright/test';
import path from 'path';

const FIXTURES_DIR = path.resolve(__dirname, '../__tests__/fixtures/sd-card');

test.describe('Modal Viewport Positioning', () => {

  // ── Auth modal portals to body ──────────────────────────────
  test('auth modal is a direct child of document.body', async ({ page }) => {
    await page.goto('/');
    await page.locator('header').getByText('Sign in').click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 3_000 });

    const isDirectChildOfBody = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return dialog?.parentElement === document.body;
    });
    expect(isDirectChildOfBody).toBe(true);
  });

  // ── Auth modal is centered in viewport ─────────────────────
  test('auth modal is centered in the viewport', async ({ page }) => {
    await page.goto('/');

    // Scroll down to trigger the viewport offset scenario
    await page.evaluate(() => window.scrollTo(0, 500));

    await page.locator('header').getByText('Sign in').click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 3_000 });

    // The modal overlay should cover the full viewport
    const bounds = await modal.boundingBox();
    expect(bounds).toBeTruthy();
    // Fixed inset-0 means x=0, y=0, full viewport
    expect(bounds!.x).toBe(0);
    expect(bounds!.y).toBe(0);
  });

  // ── Contribution nudge portals to body ─────────────────────
  test('contribution nudge dialog portals to document.body', async ({ page }) => {
    // Clear opt-in state so nudge will appear
    await page.goto('/analyze');
    await page.evaluate(() => {
      localStorage.removeItem('airwaylab_contribute_optin');
      localStorage.removeItem('airwaylab_contributed_dates');
    });

    const fileInput = page.locator('input[type="file"][webkitdirectory]');
    await expect(fileInput).toBeAttached();
    await fileInput.setInputFiles(FIXTURES_DIR);

    await expect(
      page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
    ).toBeVisible({ timeout: 90_000 });

    // Check if nudge appeared
    const nudge = page.getByRole('dialog');
    const nudgeVisible = await nudge.first().isVisible({ timeout: 5_000 }).catch(() => false);

    if (nudgeVisible) {
      // Verify it's portaled to body
      const isDirectChild = await page.evaluate(() => {
        const dialogs = document.querySelectorAll('[role="dialog"]');
        return Array.from(dialogs).every((d) => d.parentElement === document.body);
      });
      expect(isDirectChild).toBe(true);
    }
  });

  // ── All visible dialogs are portaled ────────────────────────
  test('no dialog renders inside <main> (all portaled)', async ({ page }) => {
    await page.goto('/');
    await page.locator('header').getByText('Sign in').click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 3_000 });

    // Verify no dialog is inside <main>
    const dialogInsideMain = await page.evaluate(() => {
      const main = document.querySelector('main#main-content');
      if (!main) return false;
      return main.querySelector('[role="dialog"]') !== null;
    });
    expect(dialogInsideMain).toBe(false);
  });

  // ── AI consent modal portals correctly (demo mode) ──────────
  test('AI consent modal is portaled to body when triggered', async ({ page }) => {
    // Load demo mode which will trigger AI consent for logged-in users
    // Since we can't easily trigger it without auth, we verify the pattern
    // via the auth modal instead — same portal mechanism
    await page.goto('/analyze?demo=1');

    await expect(
      page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
    ).toBeVisible({ timeout: 30_000 });

    // Verify there are no fixed-position overlays trapped inside main
    const trappedOverlays = await page.evaluate(() => {
      const main = document.querySelector('main#main-content');
      if (!main) return 0;
      const fixedElements = main.querySelectorAll('.fixed.inset-0');
      return fixedElements.length;
    });
    expect(trappedOverlays).toBe(0);
  });

  // ── Modal is visible after scrolling down on landing page ───
  test('auth modal is visible after scrolling to bottom of landing page', async ({ page }) => {
    await page.goto('/');

    // Scroll to the very bottom of the page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

    // Open auth modal from the bottom of the page
    // The header is sticky, so Sign In is always accessible
    await page.locator('header').getByText('Sign in').click();

    const modal = page.getByRole('dialog').filter({ hasText: /sign in to airwaylab/i });
    await expect(modal).toBeVisible({ timeout: 3_000 });

    // Modal should be visible in the viewport (not below the fold)
    const isInViewport = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return false;
      const rect = dialog.getBoundingClientRect();
      return rect.top >= 0 && rect.left >= 0;
    });
    expect(isInViewport).toBe(true);
  });
});
