/**
 * Tests for codebase-audit-hardening spec.
 * Covers: disclaimer localStorage safety, PDF empty-array guard,
 * store-analysis-data error sanitisation, and stable event keys.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ── PR1: Disclaimer localStorage safety ────────────────────────

describe('Disclaimer localStorage safety', () => {
  it('renders visible when localStorage throws on read', async () => {
    // Mock localStorage to throw (Safari private browsing)
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: () => { throw new DOMException('SecurityError'); },
        setItem: () => { throw new DOMException('SecurityError'); },
        removeItem: () => { throw new DOMException('SecurityError'); },
        clear: () => { throw new DOMException('SecurityError'); },
        length: 0,
        key: () => null,
      },
      writable: true,
      configurable: true,
    });

    vi.resetModules();
    const { render, screen } = await import('@testing-library/react');
    const { Disclaimer } = await import('@/components/common/disclaimer');

    const { unmount } = render(<Disclaimer />);

    // Should show disclaimer (visible state), not crash
    expect(screen.getByText(/not medical advice/i)).toBeDefined();

    unmount();

    // Restore
    Object.defineProperty(globalThis, 'localStorage', {
      value: original,
      writable: true,
      configurable: true,
    });
  });

  it('dismiss updates visual state even when setItem throws', async () => {
    const getItemMock = vi.fn().mockReturnValue(null);
    const setItemMock = vi.fn().mockImplementation(() => {
      throw new DOMException('SecurityError');
    });

    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: getItemMock,
        setItem: setItemMock,
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: () => null,
      },
      writable: true,
      configurable: true,
    });

    vi.resetModules();
    const { render, screen, fireEvent } = await import('@testing-library/react');
    const { Disclaimer } = await import('@/components/common/disclaimer');

    const { unmount } = render(<Disclaimer />);

    // Disclaimer should be visible
    const dismissBtn = screen.getByLabelText(/dismiss disclaimer/i);
    expect(dismissBtn).toBeDefined();

    // Click dismiss — should not throw
    fireEvent.click(dismissBtn);

    // Disclaimer should be gone (visual state updated)
    expect(screen.queryByText(/not medical advice/i)).toBeNull();

    unmount();

    Object.defineProperty(globalThis, 'localStorage', {
      value: original,
      writable: true,
      configurable: true,
    });
  });
});

// ── PR1: PDF report empty-array guard ──────────────────────────

describe('PDF report empty-array guard', () => {
  it('openPDFReport([]) returns silently without opening a window', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    const { openPDFReport } = await import('@/lib/pdf-report');

    // Should not throw
    expect(() => openPDFReport([])).not.toThrow();

    // Should not attempt to open a window
    expect(openSpy).not.toHaveBeenCalled();
  });
});

// ── PR1: store-analysis-data error sanitisation ────────────────

describe('store-analysis-data Zod error sanitisation', () => {
  it('returns 400 without details field for invalid body', async () => {
    vi.resetModules();

    // Mock supabase server
    vi.doMock('@/lib/supabase/server', () => ({
      getSupabaseServer: () => ({
        auth: {
          getUser: async () => ({
            data: { user: { id: 'user-1' } },
            error: null,
          }),
        },
      }),
      getSupabaseServiceRole: () => ({}),
    }));
    vi.doMock('@/lib/csrf', () => ({
      validateOrigin: () => true,
    }));
    vi.doMock('@sentry/nextjs', () => ({
      captureException: vi.fn(),
      captureMessage: vi.fn(),
      logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
    }));

    const { POST } = await import('@/app/api/store-analysis-data/route');
    const { NextRequest } = await import('next/server');

    // Send invalid body (missing required fields)
    const req = new NextRequest('http://localhost/api/store-analysis-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost' },
      body: JSON.stringify({ nights: [{ bad: 'data' }] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe('Invalid request body');
    expect(body).not.toHaveProperty('details');
  });
});

// ── PR2: FlowWaveform stable event keys ────────────────────────

describe('FlowWaveform stable event keys', () => {
  it('uses event type + timestamps as key, not array index', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.resolve(process.cwd(), 'components/charts/flow-waveform.tsx'),
      'utf-8'
    );

    // Should NOT contain index-based key pattern
    expect(content).not.toMatch(/key=\{`\$\{event\.type\}-\$\{i\}`\}/);
    // Should contain timestamp-based key pattern
    expect(content).toMatch(/key=\{`\$\{event\.type\}-\$\{event\.startSec\}-\$\{event\.endSec\}`\}/);
  });
});

// ── PR3: Sentry onRouterTransitionStart export ─────────────────

describe('Sentry navigation tracking', () => {
  it('instrumentation-client.ts exports onRouterTransitionStart', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.resolve(process.cwd(), 'instrumentation-client.ts'),
      'utf-8'
    );

    expect(content).toContain('onRouterTransitionStart');
    expect(content).toContain('Sentry.captureRouterTransitionStart');
  });
});
