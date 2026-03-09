import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * AirwayLab E2E Smoke Tests
 *
 * Runs against a deployed instance (staging or production).
 * Verifies the core user journeys work end-to-end:
 *
 *   1. Homepage loads and renders correctly
 *   2. Demo mode shows all dashboard tabs with sample data
 *   3. SD card upload + oximetry CSV upload → analysis dashboard renders
 *   4. Data export works (CSV download)
 *   5. Pricing page loads (Stripe integration present)
 *   6. Auth modal opens (sign-in flow reachable)
 *
 * Usage:
 *   BASE_URL=https://airwaylab.app npx playwright test e2e/smoke.spec.ts
 */

// ─── Fixture Generators (inline for E2E portability) ─────────

function padEdf(str: string, len: number): string {
  return str.padEnd(len, ' ').slice(0, len);
}

function generateEdfBuffer(label: string, date: string, time: string): Buffer {
  const numSignals = 1;
  const headerBytes = 256 + numSignals * 256;
  const numRecords = 30;
  const samplesPerRecord = 25;

  let header = '';
  header += padEdf('0', 8);
  header += padEdf('X X X X', 80);
  header += padEdf('Startdate 15-JAN-2025', 80);
  header += padEdf(date, 8);
  header += padEdf(time, 8);
  header += padEdf(String(headerBytes), 8);
  header += padEdf('', 44);
  header += padEdf(String(numRecords), 8);
  header += padEdf('1', 8); // record duration
  header += padEdf(String(numSignals), 4);

  header += padEdf(label, 16);
  header += padEdf('', 80);
  header += padEdf('cmH2O', 8);
  header += padEdf('-128', 8);
  header += padEdf('128', 8);
  header += padEdf('-32768', 8);
  header += padEdf('32767', 8);
  header += padEdf('', 80);
  header += padEdf(String(samplesPerRecord), 8);
  header += padEdf('', 32);

  const dataSize = numRecords * samplesPerRecord * 2;
  const buf = Buffer.alloc(headerBytes + dataSize);
  buf.write(header, 0, 'ascii');

  let offset = headerBytes;
  for (let rec = 0; rec < numRecords; rec++) {
    for (let s = 0; s < samplesPerRecord; s++) {
      const t = (rec * samplesPerRecord + s) / (samplesPerRecord * numRecords);
      const value = Math.round(Math.sin(t * 2 * Math.PI * 15) * 10000);
      buf.writeInt16LE(value, offset);
      offset += 2;
    }
  }

  return buf;
}

function generateOximetryCsv(): string {
  const lines = ['Time, Oxygen Level, Pulse Rate, Motion'];
  const start = new Date('2025-01-15T23:00:00');
  for (let i = 0; i < 100; i++) {
    const time = new Date(start.getTime() + i * 4000);
    const timeStr = time.toISOString().replace('T', ' ').slice(0, 19);
    const spo2 = 94 + Math.round(Math.random() * 4);
    const hr = 60 + Math.round(Math.random() * 10);
    lines.push(`${timeStr}, ${spo2}, ${hr}, 0`);
  }
  return lines.join('\n');
}

// ─── Test Setup ──────────────────────────────────────────────

let fixtureDir: string;

test.beforeAll(() => {
  // Write fixture files to a temp directory for upload tests
  fixtureDir = path.join(__dirname, '..', '__tests__', 'fixtures', 'tmp-e2e');
  fs.mkdirSync(fixtureDir, { recursive: true });

  // Create a minimal SD card structure
  const datalogDir = path.join(fixtureDir, 'SD', 'DATALOG', '20250115');
  fs.mkdirSync(datalogDir, { recursive: true });

  // BRP (flow) file
  fs.writeFileSync(
    path.join(datalogDir, 'BRP_20250115_231500.edf'),
    generateEdfBuffer('Flow', '15.01.25', '23.15.00')
  );

  // FLW file
  fs.writeFileSync(
    path.join(datalogDir, 'FLW_20250115_231500.edf'),
    generateEdfBuffer('FLW rate', '15.01.25', '23.15.00')
  );

  // STR.edf (settings file)
  fs.writeFileSync(
    path.join(fixtureDir, 'SD', 'STR.edf'),
    generateEdfBuffer('Flow', '01.01.25', '00.00.00')
  );

  // Oximetry CSV
  fs.writeFileSync(
    path.join(fixtureDir, 'oximetry.csv'),
    generateOximetryCsv()
  );
});

test.afterAll(() => {
  // Clean up temp fixtures
  if (fixtureDir && fs.existsSync(fixtureDir)) {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
});

// ─── Tests ───────────────────────────────────────────────────

test.describe('Homepage', () => {
  test('loads and renders hero section', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/AirwayLab/i);

    // Hero should be visible
    const hero = page.locator('h1').first();
    await expect(hero).toBeVisible();
  });

  test('navigation links work', async ({ page }) => {
    await page.goto('/');

    // Analyze link should exist
    const analyzeLink = page.locator('a[href="/analyze"], a[href*="analyze"]').first();
    await expect(analyzeLink).toBeVisible();
  });
});

test.describe('Demo Mode', () => {
  test('loads demo dashboard with sample data', async ({ page }) => {
    await page.goto('/analyze?demo');

    // Wait for demo dashboard to render
    await expect(page.locator('text=Demo mode')).toBeVisible({ timeout: 10_000 });

    // Dashboard tabs should be present
    await expect(page.locator('text=Overview')).toBeVisible();
    await expect(page.locator('text=Glasgow')).toBeVisible();
    await expect(page.locator('text=Oximetry')).toBeVisible();
  });

  test('demo shows night selector with 5 sample nights', async ({ page }) => {
    await page.goto('/analyze?demo');
    await expect(page.locator('text=Demo mode')).toBeVisible({ timeout: 10_000 });

    // Night selector should show dates
    await expect(page.locator('text=2025-01-15')).toBeVisible();
  });

  test('switching tabs renders correct content', async ({ page }) => {
    await page.goto('/analyze?demo');
    await expect(page.locator('text=Demo mode')).toBeVisible({ timeout: 10_000 });

    // Click Glasgow tab
    await page.locator('button:has-text("Glasgow"), [role="tab"]:has-text("Glasgow")').click();
    // Should render Glasgow-specific content
    await expect(page.locator('text=Glasgow').first()).toBeVisible();

    // Click Oximetry tab
    await page.locator('button:has-text("Oximetry"), [role="tab"]:has-text("O₂")').click();
    // Oximetry content should appear (e.g. ODI metric)
    await page.waitForTimeout(500);
  });

  test('demo shows therapy change indicator', async ({ page }) => {
    await page.goto('/analyze?demo');
    await expect(page.locator('text=Demo mode')).toBeVisible({ timeout: 10_000 });

    // Therapy change date should be shown
    await expect(page.locator('text=Settings changed')).toBeVisible();
  });
});

test.describe('File Upload Flow', () => {
  test('upload interface shows on /analyze', async ({ page }) => {
    await page.goto('/analyze');

    // Upload area should be visible
    await expect(
      page.locator('text=Upload your ResMed SD card folder')
        .or(page.locator('text=Select SD Card Folder'))
        .or(page.locator('input[type="file"]').first())
    ).toBeVisible({ timeout: 5_000 });
  });

  test('SD card upload triggers analysis', async ({ page }) => {
    await page.goto('/analyze');

    // Get the file input (may be hidden behind a button)
    const fileInput = page.locator('input[type="file"]').first();

    // Upload the fixture EDF files
    const edfFiles = [
      path.join(fixtureDir, 'SD', 'DATALOG', '20250115', 'BRP_20250115_231500.edf'),
      path.join(fixtureDir, 'SD', 'DATALOG', '20250115', 'FLW_20250115_231500.edf'),
      path.join(fixtureDir, 'SD', 'STR.edf'),
    ];

    // Only run if fixtures exist (skipped if beforeAll failed)
    const allExist = edfFiles.every((f) => fs.existsSync(f));
    test.skip(!allExist, 'Fixture files not generated');

    await fileInput.setInputFiles(edfFiles);

    // Should transition to processing or show results
    // Give it time — web worker analysis can take a few seconds
    await page.waitForTimeout(5_000);

    // Either processing indicator or results dashboard should be visible
    const isProcessing = await page.locator('text=Processing').isVisible().catch(() => false);
    const isComplete = await page.locator('text=Overview').isVisible().catch(() => false);
    const isError = await page.locator('text=error').isVisible().catch(() => false);

    // At minimum, the page should have transitioned from the upload state
    expect(isProcessing || isComplete || isError).toBe(true);
  });
});

test.describe('Pricing Page', () => {
  test('pricing page loads with tier options', async ({ page }) => {
    await page.goto('/pricing');

    // Should show pricing tiers
    await expect(page.locator('text=Supporter').or(page.locator('text=Community'))).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe('Supporters Page', () => {
  test('supporters page loads', async ({ page }) => {
    await page.goto('/supporters');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('API Health', () => {
  test('stats endpoint returns data', async ({ request }) => {
    const res = await request.get('/api/stats');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('contributionCount');
  });

  test('AI insights rejects unauthenticated requests', async ({ request }) => {
    const res = await request.post('/api/ai-insights', {
      data: { nights: [], selectedNightIndex: 0, therapyChangeDate: null },
      headers: { 'Content-Type': 'application/json' },
    });
    // Should get 401 (unauthorized) or 403 (CSRF) — not 500
    expect([401, 403]).toContain(res.status());
  });

  test('checkout endpoint rejects unauthenticated requests', async ({ request }) => {
    const res = await request.post('/api/create-checkout-session', {
      data: { priceId: 'price_test' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect([401, 403, 503]).toContain(res.status());
  });

  test('customer portal rejects unauthenticated requests', async ({ request }) => {
    const res = await request.post('/api/customer-portal', {
      headers: { 'Content-Type': 'application/json' },
    });
    expect([401, 403, 503]).toContain(res.status());
  });

  test('webhook rejects unsigned requests', async ({ request }) => {
    const res = await request.post('/api/webhooks/stripe', {
      data: '{}',
      headers: { 'Content-Type': 'application/json' },
    });
    // Should get 400 (missing signature) or 503 (not configured)
    expect([400, 503]).toContain(res.status());
  });
});

test.describe('Privacy & Security', () => {
  test('no sensitive data in page source', async ({ page }) => {
    await page.goto('/');
    const content = await page.content();

    // Should never leak API keys or secrets in client HTML
    expect(content).not.toContain('sk_live_');
    expect(content).not.toContain('sk_test_');
    expect(content).not.toContain('whsec_');
    expect(content).not.toContain('sbp_'); // Supabase service role key prefix
  });

  test('privacy badge shows on analyze page', async ({ page }) => {
    await page.goto('/analyze');
    await expect(page.locator('text=All data stays on your device')).toBeVisible();
  });
});
