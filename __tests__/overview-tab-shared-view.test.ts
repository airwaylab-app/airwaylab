/**
 * Regression guard: SymptomRating and NightContextEditor must be hidden in
 * shared view (isSharedView=true) in OverviewTab.
 *
 * Both components write to localStorage on the viewer's device, which has no
 * relation to the owner's data. Hiding them prevents confusing silent writes.
 * (fix/air-1820-owner-write-ui-share-view)
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(
  path.join(ROOT, 'components/dashboard/overview-tab.tsx'),
  'utf-8'
);

const sharedSrc = fs.readFileSync(
  path.join(ROOT, 'components/share/shared-view-client.tsx'),
  'utf-8'
);

describe('OverviewTab — isSharedView prop (AIR-1820)', () => {
  it('Props interface includes isSharedView?: boolean', () => {
    expect(src).toContain('isSharedView?: boolean');
  });

  it('function signature destructures isSharedView with default false', () => {
    expect(src).toContain('isSharedView = false');
  });

  it('SymptomRating is guarded by !isSharedView', () => {
    const symptomIndex = src.indexOf('<SymptomRating');
    expect(symptomIndex).toBeGreaterThan(-1);
    // The guard must appear before the component in source order
    const guardIndex = src.lastIndexOf('!isSharedView', symptomIndex);
    expect(guardIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeLessThan(symptomIndex);
  });

  it('NightContextEditor is guarded by !isSharedView', () => {
    const editorIndex = src.indexOf('<NightContextEditor');
    expect(editorIndex).toBeGreaterThan(-1);
    const guardIndex = src.lastIndexOf('!isSharedView', editorIndex);
    expect(guardIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeLessThan(editorIndex);
  });
});

describe('SharedViewClient — passes isSharedView to OverviewTab (AIR-1820)', () => {
  it('shared-view-client passes isSharedView={true} to OverviewTab', () => {
    // Locate the OverviewTab usage in shared-view-client and check for the prop
    const overviewTabIndex = sharedSrc.indexOf('<OverviewTab');
    expect(overviewTabIndex).toBeGreaterThan(-1);
    const snippet = sharedSrc.slice(overviewTabIndex, overviewTabIndex + 300);
    expect(snippet).toContain('isSharedView={true}');
  });
});
