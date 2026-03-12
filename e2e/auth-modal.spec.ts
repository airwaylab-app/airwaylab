/**
 * E2E test: Auth modal flow
 *
 * Tests the sign-in modal: opening from different triggers,
 * form validation, consent checkbox, and portal rendering.
 *
 * Note: Cannot test the full magic link flow (requires email delivery).
 * These tests verify the modal UI and validation states.
 */
import { test, expect } from '@playwright/test';

test.describe('Auth Modal', () => {

  // ── Opens from header Sign In button ───────────────────────
  test('Sign In button in header opens auth modal', async ({ page }) => {
    await page.goto('/');

    // Click "Sign in" in the header
    await page.locator('header').getByText('Sign in').click();

    // Auth modal should appear (portaled to document.body)
    const modal = page.getByRole('dialog').filter({ hasText: /sign in to airwaylab/i });
    await expect(modal).toBeVisible({ timeout: 3_000 });

    // Should have email input and magic link button
    await expect(modal.locator('input[type="email"]')).toBeVisible();
    await expect(modal.getByText('Send magic link')).toBeVisible();
  });

  // ── Opens from analyze page ────────────────────────────────
  test('Sign In button on analyze page header opens auth modal', async ({ page }) => {
    await page.goto('/analyze');

    await page.locator('header').getByText('Sign in').click();

    const modal = page.getByRole('dialog').filter({ hasText: /sign in to airwaylab/i });
    await expect(modal).toBeVisible({ timeout: 3_000 });
  });

  // ── Consent checkbox validation ─────────────────────────────
  test('submit button is disabled without consent checkbox', async ({ page }) => {
    await page.goto('/');
    await page.locator('header').getByText('Sign in').click();

    const modal = page.getByRole('dialog').filter({ hasText: /sign in to airwaylab/i });
    await expect(modal).toBeVisible();

    // Type an email
    await modal.locator('input[type="email"]').fill('test@example.com');

    // Submit button should be disabled (consent not checked)
    const submitButton = modal.getByText('Send magic link');
    await expect(submitButton).toBeDisabled();

    // Check the consent checkbox
    await modal.locator('input[type="checkbox"]').check();

    // Submit button should now be enabled
    await expect(submitButton).toBeEnabled();
  });

  // ── Empty email validation ──────────────────────────────────
  test('submit button is disabled without email', async ({ page }) => {
    await page.goto('/');
    await page.locator('header').getByText('Sign in').click();

    const modal = page.getByRole('dialog').filter({ hasText: /sign in to airwaylab/i });
    await expect(modal).toBeVisible();

    // Check consent but leave email empty
    await modal.locator('input[type="checkbox"]').check();

    // Submit should still be disabled (no email)
    const submitButton = modal.getByText('Send magic link');
    await expect(submitButton).toBeDisabled();
  });

  // ── Close via X button ──────────────────────────────────────
  test('X button closes the auth modal', async ({ page }) => {
    await page.goto('/');
    await page.locator('header').getByText('Sign in').click();

    const modal = page.getByRole('dialog').filter({ hasText: /sign in to airwaylab/i });
    await expect(modal).toBeVisible();

    // Click X button
    await modal.getByLabel('Close').click();
    await expect(modal).not.toBeVisible({ timeout: 2_000 });
  });

  // ── Close via backdrop click ────────────────────────────────
  test('clicking backdrop closes the auth modal', async ({ page }) => {
    await page.goto('/');
    await page.locator('header').getByText('Sign in').click();

    const modal = page.getByRole('dialog').filter({ hasText: /sign in to airwaylab/i });
    await expect(modal).toBeVisible();

    // Click the backdrop (the outer overlay div)
    // The modal dialog wraps an outer div with fixed inset-0 — click on it directly
    const backdrop = page.locator('[role="dialog"][aria-label="Sign in"]');
    await backdrop.click({ position: { x: 10, y: 10 } }); // Click corner (outside inner card)
    await expect(modal).not.toBeVisible({ timeout: 2_000 });
  });

  // ── Modal is portaled to document.body ──────────────────────
  test('auth modal renders as direct child of document.body (portal)', async ({ page }) => {
    await page.goto('/');
    await page.locator('header').getByText('Sign in').click();

    // Verify the dialog is a direct child of <body>
    const isDirectChild = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return dialog?.parentElement === document.body;
    });
    expect(isDirectChild).toBe(true);
  });

  // ── Privacy policy link present ─────────────────────────────
  test('auth modal contains privacy policy link', async ({ page }) => {
    await page.goto('/');
    await page.locator('header').getByText('Sign in').click();

    const modal = page.getByRole('dialog').filter({ hasText: /sign in to airwaylab/i });
    await expect(modal).toBeVisible();

    await expect(modal.locator('a[href="/privacy"]')).toBeVisible();
  });

  // ── Consent text explains data processing ───────────────────
  test('consent checkbox explains AI data processing', async ({ page }) => {
    await page.goto('/');
    await page.locator('header').getByText('Sign in').click();

    const modal = page.getByRole('dialog').filter({ hasText: /sign in to airwaylab/i });
    await expect(modal).toBeVisible();

    await expect(modal.getByText(/store my sleep data.*processed by AI/i)).toBeVisible();
  });
});
