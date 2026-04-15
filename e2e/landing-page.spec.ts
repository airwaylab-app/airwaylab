/**
 * E2E test: Landing page CTAs, navigation, and content verification
 *
 * Verifies that the homepage renders correctly and key CTAs navigate
 * to the right destinations.
 */
import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders hero section with primary CTA', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('See What Your PAP Data');
    // Hero has mobile/desktop variants — verify at least one Upload CTA link exists
    const uploadCTAs = page.locator('a[href="/analyze"]').filter({ hasText: 'Upload Your SD Card' });
    await expect(uploadCTAs.first()).toBeAttached();
  });

  test('hero Upload CTA navigates to /analyze', async ({ page }) => {
    // Hero has responsive mobile/desktop variants — use JS click to bypass display:none
    await page.locator('a[href="/analyze"]').filter({ hasText: 'Upload Your SD Card' }).first().evaluate(el => (el as HTMLElement).click());
    await expect(page).toHaveURL('/analyze');
  });

  test('hero Demo CTA navigates to /analyze?demo', async ({ page }) => {
    // Hero has responsive mobile/desktop variants — use JS click to bypass display:none
    await page.locator('a[href="/analyze?demo"]').first().evaluate(el => (el as HTMLElement).click());
    await expect(page).toHaveURL(/\/analyze\?demo/);
  });

  test('renders four analysis engines section', async ({ page }) => {
    await expect(page.getByText('Glasgow Index').first()).toBeVisible();
    await expect(page.getByText('WAT Analysis').first()).toBeVisible();
    await expect(page.getByText('NED Analysis').first()).toBeVisible();
    await expect(page.getByText('Oximetry').first()).toBeVisible();
  });

  test('renders How It Works steps', async ({ page }) => {
    await expect(page.getByText('How It Works')).toBeVisible();
    await expect(page.getByText('Upload SD Card')).toBeVisible();
    await expect(page.getByText('In-Browser Analysis')).toBeVisible();
    await expect(page.getByText('Explore Results')).toBeVisible();
  });

  test('renders trust bar with privacy messaging', async ({ page }) => {
    await expect(page.getByText(/Private by Default/i).first()).toBeVisible();
    await expect(page.getByText(/Open Source/i).first()).toBeVisible();
    await expect(page.getByText(/Research-Grade/i).first()).toBeVisible();
  });

  test('bottom CTA links to /analyze', async ({ page }) => {
    const bottomCTA = page.locator('section').last().locator('a[href="/analyze"]');
    await expect(bottomCTA).toBeVisible();
  });

  test('header navigation links work', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.locator('nav a[href="/analyze"]').first().click();
    await expect(page).toHaveURL('/analyze', { timeout: 10_000 });
  });

  test('privacy shield message is visible', async ({ page }) => {
    await expect(
      page.getByText('Your data never leaves your browser')
    ).toBeVisible();
  });
});
