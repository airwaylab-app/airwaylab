import { defineConfig, devices } from '@playwright/test';

/**
 * AirwayLab E2E Smoke Tests
 *
 * Run against a deployed URL or local dev server:
 *
 *   # Against production/staging
 *   BASE_URL=https://airwaylab.app npx playwright test
 *
 *   # Against local dev server
 *   npx playwright test
 *
 *   # With specific browser
 *   npx playwright test --project=chromium
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Start local dev server if no BASE_URL provided
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
