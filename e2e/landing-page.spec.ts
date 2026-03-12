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
    await expect(page.locator('h1')).toContainText('PAP Therapy');
    // Desktop: "Upload Your SD Card" as primary
    await expect(
      page.locator('a[href="/analyze"] >> text=Upload Your SD Card').first()
    ).toBeVisible();
  });

  test('hero Upload CTA navigates to /analyze', async ({ page }) => {
    // Desktop primary CTA
    await page.locator('a[href="/analyze"]').filter({ hasText: 'Upload Your SD Card' }).first().click();
    await expect(page).toHaveURL('/analyze');
  });

  test('hero Demo CTA navigates to /analyze?demo', async ({ page }) => {
    await page.locator('a[href="/analyze?demo"]').first().click();
    await expect(page).toHaveURL(/\/analyze\?demo/);
  });

  test('renders four analysis engines section', async ({ page }) => {
    await expect(page.getByText('Glasgow Index')).toBeVisible();
    await expect(page.getByText('WAT Analysis')).toBeVisible();
    await expect(page.getByText('NED Analysis')).toBeVisible();
    await expect(page.getByText('Oximetry').first()).toBeVisible();
  });

  test('renders How It Works steps', async ({ page }) => {
    await expect(page.getByText('How It Works')).toBeVisible();
    await expect(page.getByText('Upload SD Card')).toBeVisible();
    await expect(page.getByText('In-Browser Analysis')).toBeVisible();
    await expect(page.getByText('Explore Results')).toBeVisible();
  });

  test('renders trust bar with privacy messaging', async ({ page }) => {
    await expect(page.getByText('100% Client-Side')).toBeVisible();
    await expect(page.getByText('Open Source')).toBeVisible();
    await expect(page.getByText('Research-Grade')).toBeVisible();
  });

  test('bottom CTA links to /analyze', async ({ page }) => {
    const bottomCTA = page.locator('section').last().locator('a[href="/analyze"]');
    await expect(bottomCTA).toBeVisible();
  });

  test('header navigation links work', async ({ page }) => {
    await page.locator('nav a[href="/analyze"]').click();
    await expect(page).toHaveURL('/analyze');
  });

  test('privacy shield message is visible', async ({ page }) => {
    await expect(
      page.getByText('Your data never leaves your browser')
    ).toBeVisible();
  });
});
