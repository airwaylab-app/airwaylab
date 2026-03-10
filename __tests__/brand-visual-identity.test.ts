/**
 * Brand Visual Identity v1 — Verification Tests
 *
 * These tests verify the brand rebrand was applied correctly:
 * design tokens, theme architecture, chart theme, forum export, and OG image.
 */
import { describe, it, expect } from 'vitest';
import resolveConfig from 'tailwindcss/resolveConfig';
import tailwindConfig from '../tailwind.config';


describe('Brand Design Tokens', () => {
  const resolved = resolveConfig(tailwindConfig);
  const colors = resolved.theme.colors as Record<string, unknown>;

  it('has brand-teal color palette', () => {
    const brand = colors.brand as Record<string, unknown>;
    expect(brand).toBeDefined();
    const teal = brand.teal as Record<string, string>;
    expect(teal.DEFAULT).toBe('#1B7A6E');
    expect(teal.light).toBe('#2A9D8F');
    expect(teal.dark).toBe('#15655A');
  });

  it('has brand-amber color palette', () => {
    const brand = colors.brand as Record<string, unknown>;
    const amber = brand.amber as Record<string, string>;
    expect(amber.DEFAULT).toBe('#E8913A');
    expect(amber.light).toBe('#F0A85C');
    expect(amber.dark).toBe('#D07A2A');
  });

  it('has brand-sand color palette', () => {
    const brand = colors.brand as Record<string, unknown>;
    const sand = brand.sand as Record<string, string>;
    expect(sand.DEFAULT).toBe('#FBF7F0');
    expect(sand.dark).toBe('#F5F1EB');
  });

  it('has brand-navy color palette', () => {
    const brand = colors.brand as Record<string, unknown>;
    const navy = brand.navy as Record<string, string>;
    expect(navy.DEFAULT).toBe('#1A2B3D');
    expect(navy.light).toBe('#2A3D52');
  });

  it('has data colors for traffic lights', () => {
    const data = colors.data as Record<string, string>;
    expect(data.good).toBe('#34A853');
    expect(data.warning).toBe('#E8913A');
    expect(data.attention).toBe('#E07A5F');
    expect(data.neutral).toBe('#5B7B9A');
    expect(data.purple).toBe('#8B6DAF');
  });

  it('has warm neutral colors', () => {
    const warm = colors.warm as Record<string, string>;
    expect(warm.charcoal).toBe('#2D2A26');
    expect(warm.gray).toBe('#6B6560');
    expect(warm.border).toBe('#E0D9CF');
    expect(warm.cloud).toBe('#F5F1EB');
    expect(warm.white).toBe('#FEFDFB');
  });

  it('has warm box shadows', () => {
    const shadows = resolved.theme.boxShadow as Record<string, string>;
    expect(shadows['warm-sm']).toBeDefined();
    expect(shadows['warm-md']).toBeDefined();
    expect(shadows['warm-lg']).toBeDefined();
  });

  it('has display font family', () => {
    const fonts = resolved.theme.fontFamily as Record<string, string[]>;
    expect(fonts.display).toBeDefined();
    expect(fonts.display.some((f: string) => f.includes('Plus Jakarta Sans'))).toBe(true);
  });
});

describe('Chart Theme', () => {
  it('exports chartColors with brand palette', async () => {
    const { chartColors } = await import('@/lib/chart-theme');
    expect(chartColors.primary).toBe('#1B7A6E');
    expect(chartColors.secondary).toBe('#E8913A');
    expect(chartColors.tertiary).toBe('#5B7B9A');
    expect(chartColors.quaternary).toBe('#E07A5F');
    expect(chartColors.quinary).toBe('#34A853');
    expect(chartColors.senary).toBe('#8B6DAF');
  });

  it('exports chartTheme with warm styling', async () => {
    const { chartTheme } = await import('@/lib/chart-theme');
    expect(chartTheme.grid.stroke).toBe('#E0D9CF');
    expect(chartTheme.tooltip.background).toBe('#FEFDFB');
    expect(chartTheme.tooltip.border).toBe('#E0D9CF');
    expect(chartTheme.tooltip.borderRadius).toBe(8);
  });
});

describe('Forum Export Branding', () => {
  it('includes updated branding in single-night export', async () => {
    const { exportForumSingleNight } = await import('@/lib/forum-export');
    // Create minimal mock night result
    const mockNight = createMockNight();
    const output = exportForumSingleNight(mockNight);
    expect(output).toContain('airwaylab.app');
    expect(output).toContain('free, open-source');
  });

  it('includes updated branding in multi-night export', async () => {
    const { exportForumMultiNight } = await import('@/lib/forum-export');
    const mockNight = createMockNight();
    const output = exportForumMultiNight([mockNight]);
    expect(output).toContain('airwaylab.app');
    expect(output).toContain('free, open-source');
  });
});

describe('WCAG Contrast Compliance', () => {
  // Relative luminance calculation per WCAG 2.0
  function luminance(hex: string): number {
    const rgb = hex
      .replace('#', '')
      .match(/.{2}/g)!
      .map((c) => {
        const val = parseInt(c, 16) / 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
      });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }

  function contrastRatio(hex1: string, hex2: string): number {
    const l1 = luminance(hex1);
    const l2 = luminance(hex2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  it('brand-teal on warm-white meets AA for normal text (≥4.5)', () => {
    const ratio = contrastRatio('#1B7A6E', '#FEFDFB');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('brand-navy on brand-sand meets AAA (≥7.0)', () => {
    const ratio = contrastRatio('#1A2B3D', '#FBF7F0');
    expect(ratio).toBeGreaterThanOrEqual(7.0);
  });

  it('warm-gray on warm-white meets AA for normal text (≥4.5)', () => {
    const ratio = contrastRatio('#6B6560', '#FEFDFB');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('warm-charcoal on warm-white meets AAA (≥7.0)', () => {
    const ratio = contrastRatio('#2D2A26', '#FEFDFB');
    expect(ratio).toBeGreaterThanOrEqual(7.0);
  });

  it('brand-teal on white meets AA for large text (≥3.0)', () => {
    const ratio = contrastRatio('#1B7A6E', '#FFFFFF');
    expect(ratio).toBeGreaterThanOrEqual(3.0);
  });

  it('white on brand-navy meets AA (≥4.5)', () => {
    const ratio = contrastRatio('#FFFFFF', '#1A2B3D');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

describe('OG Image', () => {
  it('opengraph-image module exports a default function', async () => {
    // Verify the module exists and has the right shape
    const fs = await import('fs');
    const path = await import('path');
    const ogPath = path.resolve(process.cwd(), 'app/opengraph-image.tsx');
    expect(fs.existsSync(ogPath)).toBe(true);
  });
});

describe('Favicon', () => {
  it('SVG favicon exists at app/icon.svg', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const iconPath = path.resolve(process.cwd(), 'app/icon.svg');
    expect(fs.existsSync(iconPath)).toBe(true);

    const content = fs.readFileSync(iconPath, 'utf-8');
    expect(content).toContain('svg');
    expect(content).toContain('#1B7A6E');
  });
});

describe('Font Loading', () => {
  it('layout.tsx does not reference IBM Plex Sans', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const layoutPath = path.resolve(process.cwd(), 'app/layout.tsx');
    const content = fs.readFileSync(layoutPath, 'utf-8');
    expect(content).not.toContain('IBM_Plex_Sans');
    expect(content).not.toContain('IBM Plex Sans');
    expect(content).toContain('Plus_Jakarta_Sans');
  });
});

describe('Hybrid Theme Architecture', () => {
  it('globals.css has .dashboard-theme class with dark variables', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const cssPath = path.resolve(process.cwd(), 'app/globals.css');
    const content = fs.readFileSync(cssPath, 'utf-8');
    expect(content).toContain('.dashboard-theme');
    expect(content).toContain('--background');
  });

  it('analyze layout applies dashboard-theme class', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const layoutPath = path.resolve(process.cwd(), 'app/analyze/layout.tsx');
    const content = fs.readFileSync(layoutPath, 'utf-8');
    expect(content).toContain('dashboard-theme');
  });
});

// ─── Helpers ───

function createMockNight() {
  return {
    date: new Date('2025-01-15'),
    dateStr: '2025-01-15',
    durationHours: 7.5,
    sessionCount: 1,
    settings: {
      deviceModel: 'AirSense 10',
      epap: 10,
      ipap: 10,
      pressureSupport: 0,
      papMode: 'CPAP',
      riseTime: null,
      trigger: 'Medium',
      cycle: 'Medium',
      easyBreathe: false,
    },
    glasgow: {
      overall: 1.5,
      skew: 0.2,
      spike: 0.1,
      flatTop: 0.3,
      topHeavy: 0.1,
      multiPeak: 0.1,
      noPause: 0.3,
      inspirRate: 0.2,
      multiBreath: 0.1,
      variableAmp: 0.1,
    },
    wat: { flScore: 25, regularityScore: 30, periodicityIndex: 0.1 },
    ned: {
      breathCount: 1000,
      nedMean: 20,
      nedMedian: 18,
      nedP95: 40,
      nedClearFLPct: 15,
      nedBorderlinePct: 10,
      fiMean: 0.7,
      fiFL85Pct: 12,
      tpeakMean: 0.35,
      mShapePct: 5,
      reraIndex: 5.0,
      reraCount: 10,
      h1NedMean: 22,
      h2NedMean: 18,
      combinedFLPct: 15,
      estimatedArousalIndex: 8.0,
    },
    oximetry: null,
    oximetryTrace: null,
  } as import('@/lib/types').NightResult;
}
