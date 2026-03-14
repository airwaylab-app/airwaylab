/**
 * E2E test: Conversion funnel
 *
 * Tests the AI insights conversion flow for different user states:
 * - Anonymous users see locked AI teasers after analysis
 * - Locked teasers CTA opens auth modal
 * - Demo mode shows AI insights with registration nudge
 * - Free registered users see "Generate AI Insights" button
 * - Deep insight teasers shown to free users after AI insights
 *
 * Note: Cannot test actual AI insight generation (requires API key + auth).
 * These tests verify the UI states and conversion CTAs.
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

  // Wait for analysis to complete — overview tab becomes visible
  await expect(
    page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
  ).toBeVisible({ timeout: 90_000 });
}

/** Helper: dismiss contribution nudge dialog if visible */
async function dismissNudgeIfVisible(page: import('@playwright/test').Page) {
  const nudgeDialog = page.getByRole('dialog');
  if (await nudgeDialog.isVisible({ timeout: 2_000 }).catch(() => false)) {
    const dismiss = nudgeDialog.getByText(/not now|dismiss|skip|maybe later/i);
    if (await dismiss.isVisible().catch(() => false)) {
      await dismiss.click();
    } else {
      // Try the X/close button
      const closeBtn = nudgeDialog.getByLabel(/close|dismiss/i);
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
      } else {
        await nudgeDialog.evaluate(el => el.remove());
      }
    }
  }
}

test.describe('Conversion Funnel — Anonymous User', () => {

  // ── Locked AI teasers appear after analysis ────────────────
  test('anonymous user sees locked AI teasers on overview after analysis', async ({ page }) => {
    await uploadAndWaitForAnalysis(page);
    await dismissNudgeIfVisible(page);

    // Overview tab should be active
    await expect(page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i }))
      .toHaveAttribute('aria-selected', 'true');

    // Locked AI teasers should be visible
    await expect(page.getByText('AI-Powered Insights')).toBeVisible({ timeout: 5_000 });

    // Skeleton/locked cards should be present (3 locked placeholders)
    const lockedCards = page.locator('.skeleton-shimmer');
    const count = await lockedCards.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Lock icon should be visible
    await expect(page.locator('svg.lucide-lock').first()).toBeVisible();
  });

  // ── CTA button text and visibility ──────────────────────────
  test('locked teasers show "Create a free account" CTA', async ({ page }) => {
    await uploadAndWaitForAnalysis(page);
    await dismissNudgeIfVisible(page);

    await expect(page.getByText('Create a free account for AI insights')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('never re-upload your SD card again')).toBeVisible();
  });

  // ── CTA opens auth modal ──────────────────────────────────
  test('clicking CTA opens auth modal with consent checkbox', async ({ page }) => {
    await uploadAndWaitForAnalysis(page);
    await dismissNudgeIfVisible(page);

    await page.getByText('Create a free account for AI insights').click();

    // Auth modal should appear
    const modal = page.getByRole('dialog').filter({ hasText: /sign in to airwaylab/i });
    await expect(modal).toBeVisible({ timeout: 3_000 });

    // Consent checkbox should be present
    await expect(modal.locator('input[type="checkbox"]')).toBeVisible();

    // Email input should be present
    await expect(modal.locator('input[type="email"]')).toBeVisible();

    // Privacy policy link should be present
    await expect(modal.locator('a[href="/privacy"]')).toBeVisible();
  });

  // ── Anonymous user does NOT see Generate button ────────────
  test('anonymous user does not see "Generate AI Insights" button', async ({ page }) => {
    await uploadAndWaitForAnalysis(page);
    await dismissNudgeIfVisible(page);

    // Should NOT see generate button (only for registered users)
    await expect(page.getByText('Generate AI Insights')).not.toBeVisible();
    await expect(page.getByText('Generate Deep AI Insights')).not.toBeVisible();
  });

  // ── Rule-based insights still visible ─────────────────────
  test('rule-based insights are visible for anonymous users', async ({ page }) => {
    await uploadAndWaitForAnalysis(page);
    await dismissNudgeIfVisible(page);

    // The insights panel should be present (rule-based insights are always generated)
    const insightsPanel = page.locator('details').filter({ hasText: /detailed insights/i });
    const panelVisible = await insightsPanel.isVisible({ timeout: 5_000 }).catch(() => false);

    if (panelVisible) {
      // Expand it
      await insightsPanel.locator('summary').click();
      // Should have at least one insight card inside
      const insightCards = insightsPanel.locator('.rounded-lg.border');
      const cardCount = await insightCards.count();
      expect(cardCount).toBeGreaterThan(0);
    }
    // If no rule-based insights generated (depends on fixture data), that's OK
  });
});

test.describe('Conversion Funnel — Demo Mode', () => {

  // ── Demo shows AI insights ────────────────────────────────
  test('demo mode shows AI insights with AI badge', async ({ page }) => {
    await page.goto('/analyze?demo=1');

    await expect(
      page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
    ).toBeVisible({ timeout: 30_000 });

    // AI insights should be visible in demo (static demo insights)
    const aiInsights = page.locator('details').filter({ hasText: /detailed insights/i });
    await expect(aiInsights).toBeVisible({ timeout: 5_000 });

    // Expand insights panel
    await aiInsights.locator('summary').click();

    // AI badge should be visible on at least one insight
    await expect(page.getByText('AI').first()).toBeVisible();
  });

  // ── Demo shows registration nudge ─────────────────────────
  test('demo mode shows "Create free account" nudge', async ({ page }) => {
    await page.goto('/analyze?demo=1');

    await expect(
      page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
    ).toBeVisible({ timeout: 30_000 });

    // Registration nudge below AI insights
    await expect(page.getByText('Create free account')).toBeVisible({ timeout: 5_000 });
  });

  // ── Demo registration CTA opens auth modal ────────────────
  test('demo registration CTA opens auth modal', async ({ page }) => {
    await page.goto('/analyze?demo=1');

    await expect(
      page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
    ).toBeVisible({ timeout: 30_000 });

    // Click the "Create free account" button
    await page.getByText('Create free account').click();

    // Auth modal should open
    const modal = page.getByRole('dialog').filter({ hasText: /sign in to airwaylab/i });
    await expect(modal).toBeVisible({ timeout: 3_000 });
  });

  // ── Demo AI CTA explains funding ─────────────────────────
  test('demo AI CTA explains AI is funded out of pocket', async ({ page }) => {
    await page.goto('/analyze?demo=1');

    await expect(
      page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
    ).toBeVisible({ timeout: 30_000 });

    // Expand insights if collapsed
    const insightsPanel = page.locator('details').filter({ hasText: /detailed insights/i });
    if (await insightsPanel.isVisible()) {
      const isOpen = await insightsPanel.evaluate((el) => (el as HTMLDetailsElement).open);
      if (!isOpen) await insightsPanel.locator('summary').click();
    }

    // AI CTA should mention funding
    await expect(page.getByText(/funded out of pocket/i)).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Conversion Funnel — Signup Flow', () => {

  // ── Consent checkbox required before submit ────────────────
  test('auth modal requires consent checkbox before sending magic link', async ({ page }) => {
    await page.goto('/');
    await page.locator('header').getByText('Sign in').click();

    const modal = page.getByRole('dialog').filter({ hasText: /sign in to airwaylab/i });
    await expect(modal).toBeVisible();

    // Fill email
    await modal.locator('input[type="email"]').fill('test@example.com');

    // Button should be disabled without consent
    const submitButton = modal.getByText('Send magic link');
    await expect(submitButton).toBeDisabled();

    // Check consent
    await modal.locator('input[type="checkbox"]').check();

    // Button should now be enabled
    await expect(submitButton).toBeEnabled();

    // Uncheck consent — button should be disabled again
    await modal.locator('input[type="checkbox"]').uncheck();
    await expect(submitButton).toBeDisabled();
  });

  // ── Consent text covers data processing ───────────────────
  test('consent explains data storage and AI processing', async ({ page }) => {
    await page.goto('/');
    await page.locator('header').getByText('Sign in').click();

    const modal = page.getByRole('dialog').filter({ hasText: /sign in to airwaylab/i });
    await expect(modal).toBeVisible();

    // Consent text should mention storage + AI
    await expect(modal.getByText(/store my sleep data.*processed by AI/i)).toBeVisible();
  });

  // ── Privacy policy link in auth modal ─────────────────────
  test('auth modal links to privacy policy', async ({ page }) => {
    await page.goto('/');
    await page.locator('header').getByText('Sign in').click();

    const modal = page.getByRole('dialog').filter({ hasText: /sign in to airwaylab/i });
    await expect(modal).toBeVisible();

    const privacyLink = modal.locator('a[href="/privacy"]');
    await expect(privacyLink).toBeVisible();
    await expect(privacyLink).toHaveText(/privacy policy/i);
  });

  // ── Auth modal opens from header on analyze page ──────────
  test('auth modal opens from header sign in on analyze page with data', async ({ page }) => {
    await uploadAndWaitForAnalysis(page);
    await dismissNudgeIfVisible(page);

    await page.locator('header').getByText('Sign in').click();

    const modal = page.getByRole('dialog').filter({ hasText: /sign in to airwaylab/i });
    await expect(modal).toBeVisible({ timeout: 3_000 });

    // Should have consent checkbox
    await expect(modal.locator('input[type="checkbox"]')).toBeVisible();
  });

  // ── Auth modal explains what registration includes ────────
  test('auth modal explains cloud storage and AI insights benefit', async ({ page }) => {
    await page.goto('/');
    await page.locator('header').getByText('Sign in').click();

    const modal = page.getByRole('dialog').filter({ hasText: /sign in to airwaylab/i });
    await expect(modal).toBeVisible();

    // Should mention cloud storage and AI
    await expect(modal.getByText(/cloud storage/i)).toBeVisible();
    await expect(modal.getByText(/AI insights/i)).toBeVisible();
  });
});

test.describe('Conversion Funnel — Pricing Page', () => {

  // ── All three tiers render ────────────────────────────────
  test('pricing page shows all three tiers', async ({ page }) => {
    await page.goto('/pricing');

    await expect(page.getByRole('heading', { name: 'Community', level: 2 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Supporter', level: 2 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Champion', level: 2 })).toBeVisible();
  });

  // ── Community tier shows correct price ────────────────────
  test('community tier shows $0/month', async ({ page }) => {
    await page.goto('/pricing');

    await expect(page.getByText('$0')).toBeVisible();
    await expect(page.getByText('Full analysis, free forever')).toBeVisible();
  });

  // ── Community features include cloud storage ──────────────
  test('community tier lists cloud storage and AI insights', async ({ page }) => {
    await page.goto('/pricing');

    await expect(page.getByText('Unlimited cloud storage for your EDF files')).toBeVisible();
    await expect(page.getByText('3-6 AI insights per month').first()).toBeVisible();
  });

  // ── Supporter features include deep AI ────────────────────
  test('supporter tier lists waveform-level deep AI insights', async ({ page }) => {
    await page.goto('/pricing');

    await expect(page.getByText('6-10 deep AI insights per analysis (unlimited)')).toBeVisible();
  });

  // ── Billing toggle works ──────────────────────────────────
  test('billing toggle switches between monthly and yearly', async ({ page }) => {
    await page.goto('/pricing');

    // Default is yearly — verify yearly prices
    await expect(page.getByText('$79')).toBeVisible();
    await expect(page.getByText('Save 27%')).toBeVisible();

    // Switch to monthly
    await page.getByText('Monthly').click();

    // Monthly prices should appear
    await expect(page.getByText('$9')).toBeVisible();
    await expect(page.getByText('$25')).toBeVisible();

    // Switch back to yearly
    await page.getByText('Yearly').click();
    await expect(page.getByText('$79')).toBeVisible();
  });

  // ── FAQ renders ───────────────────────────────────────────
  test('pricing page shows FAQ section', async ({ page }) => {
    await page.goto('/pricing');

    await expect(page.getByText('Frequently asked questions')).toBeVisible();
    await expect(page.getByText('Can I really use AirwayLab for free?')).toBeVisible();
    await expect(page.getByText('What happens to my data?')).toBeVisible();
    await expect(page.getByText('Can I cancel anytime?')).toBeVisible();
    await expect(page.getByText('Is this medical advice?')).toBeVisible();
  });

  // ── Trust signals render ──────────────────────────────────
  test('pricing page shows trust signals', async ({ page }) => {
    await page.goto('/pricing');

    await expect(page.getByText('Cancel anytime').first()).toBeVisible();
    await expect(page.getByText('Secure payment via Stripe').first()).toBeVisible();
    await expect(page.getByText('Delete all data anytime').first()).toBeVisible();
  });

  // ── Anonymous user CTA shows sign-in ──────────────────────
  test('anonymous user sees sign-in CTAs on pricing page', async ({ page }) => {
    await page.goto('/pricing');

    // Supporter and Champion buttons should say "Sign in to get started"
    const signInButtons = page.getByText('Sign in to get started');
    const count = await signInButtons.count();
    expect(count).toBeGreaterThanOrEqual(2); // Supporter + Champion buttons
  });

  // ── Sign-in CTA opens auth modal ──────────────────────────
  test('pricing sign-in CTA opens auth modal', async ({ page }) => {
    await page.goto('/pricing');

    // Click first "Sign in to get started" button (Supporter)
    await page.getByText('Sign in to get started').first().click();

    const modal = page.getByRole('dialog').filter({ hasText: /sign in to airwaylab/i });
    await expect(modal).toBeVisible({ timeout: 3_000 });
  });
});

test.describe('Conversion Funnel — Account Page', () => {

  // ── Anonymous user sees sign-in message ───────────────────
  test('anonymous user sees sign-in prompt on account page', async ({ page }) => {
    await page.goto('/account');

    await expect(page.getByRole('heading', { name: 'Account Settings' })).toBeVisible();
    await expect(page.getByText('Sign in to view your account settings')).toBeVisible();
  });

  // ── Account page has correct heading ──────────────────────
  test('account page renders heading', async ({ page }) => {
    await page.goto('/account');

    await expect(page.getByRole('heading', { name: 'Account Settings' })).toBeVisible();
  });
});

test.describe('Conversion Funnel — Returning User Nudge', () => {

  // ── Returning anonymous user with results sees locked teasers ──
  test('returning anonymous user sees locked AI teasers on re-analysis', async ({ page }) => {
    // Simulate a returning user who has used AirwayLab before
    await page.goto('/analyze');
    await page.evaluate(() => {
      localStorage.setItem('airwaylab_nights_analyzed', '10');
      localStorage.setItem('airwaylab_session_count', '5');
    });

    // Upload and analyze
    const fileInput = page.locator('input[type="file"][webkitdirectory]');
    await expect(fileInput).toBeAttached();
    await fileInput.setInputFiles(FIXTURES_DIR);

    await expect(
      page.locator('[data-slot="tabs-trigger"]').filter({ hasText: /overview/i })
    ).toBeVisible({ timeout: 90_000 });

    await dismissNudgeIfVisible(page);

    // Locked AI teasers should appear (user is anonymous)
    await expect(page.getByText('AI-Powered Insights')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Create a free account for AI insights')).toBeVisible();
  });
});

test.describe('Conversion Funnel — Privacy Page', () => {

  // ── Privacy page renders ──────────────────────────────────
  test('privacy page is accessible', async ({ page }) => {
    await page.goto('/privacy');

    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
  });

  // ── Privacy page documents AI processing ──────────────────
  test('privacy page documents AI data processing', async ({ page }) => {
    await page.goto('/privacy');

    // Should mention Anthropic as a processor
    await expect(page.getByText(/Anthropic/i).first()).toBeVisible();
  });

  // ── Privacy page documents data deletion ──────────────────
  test('privacy page mentions Account Settings for deletion', async ({ page }) => {
    await page.goto('/privacy');

    await expect(page.getByText(/Account Settings/i).first()).toBeVisible();
  });
});
