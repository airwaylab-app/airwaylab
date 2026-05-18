/**
 * Tests for cloud-sync-aware storage warning suppression (AIR-1731).
 * Verifies that the "re-upload" banner is hidden for cloud-sync users.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'app/analyze/page.tsx'), 'utf-8');

describe('storage warning banner: cloud-sync suppression (AIR-1731)', () => {
  it('guards the amber "Storage limit reached" banner with !hasCloudSyncConsent()', () => {
    // The storage limit banner condition must include !hasCloudSyncConsent()
    expect(src).toContain('!hasCloudSyncConsent()');
    // And that guard must appear on the same banner block as persistenceWarning
    const warningBlockIdx = src.indexOf('Storage limit reached');
    const guardIdx = src.indexOf('!hasCloudSyncConsent()');
    expect(warningBlockIdx).toBeGreaterThan(-1);
    expect(guardIdx).toBeGreaterThan(-1);
    // The guard should appear before the warning text (within 500 chars)
    expect(warningBlockIdx - guardIdx).toBeLessThan(500);
  });

  it('shows a calm informational banner for cloud-sync users instead of the warning', () => {
    expect(src).toContain('hasCloudSyncConsent()');
    expect(src).toContain('safely backed up in the cloud');
  });

  it('does NOT show "re-upload" framing in the cloud-sync banner', () => {
    // Extract the cloud-sync info banner section — between the hasCloudSyncConsent()
    // positive check and the next closing JSX block — and verify it has no re-upload copy.
    const markerIdx = src.indexOf('safely backed up in the cloud');
    expect(markerIdx).toBeGreaterThan(-1);
    // Grab 500 chars around the marker (well within one JSX block)
    const excerpt = src.slice(Math.max(0, markerIdx - 200), markerIdx + 300);
    expect(excerpt).not.toContain('re-upload');
    expect(excerpt).not.toContain('re-uploaded');
  });
});
