import { describe, it, expect, vi, afterEach } from 'vitest';

// ── Mock fs.readFileSync with vi.hoisted ────────────────────

const { readFileSyncMock } = vi.hoisted(() => ({
  readFileSyncMock: vi.fn(),
}));

vi.mock('fs', () => ({
  default: { readFileSync: readFileSyncMock },
  readFileSync: readFileSyncMock,
}));

import { parseChangelog } from '@/lib/changelog-parser';

// ── Helpers ─────────────────────────────────────────────────

function setChangelog(content: string): void {
  readFileSyncMock.mockReturnValue(content);
}

// ── parseChangelog: version extraction ───────────────────────

describe('parseChangelog — version extraction', () => {
  afterEach(() => vi.restoreAllMocks());

  it('parses a single version with date', () => {
    setChangelog(`# Changelog

## [1.0.0] - 2026-03-12

### Added

- **New feature** — does something useful.
`);
    const versions = parseChangelog();
    expect(versions).toHaveLength(1);
    expect(versions[0]!.version).toBe('1.0.0');
    expect(versions[0]!.date).toBe('2026-03-12');
  });

  it('parses multiple versions in order', () => {
    setChangelog(`# Changelog

## [1.2.0] - 2026-03-15

### Added

- **Feature A** — first feature.

## [1.1.0] - 2026-03-12

### Added

- **Feature B** — second feature.

## [1.0.0] - 2026-03-08

### Added

- **Feature C** — third feature.
`);
    const versions = parseChangelog();
    expect(versions).toHaveLength(3);
    expect(versions[0]!.version).toBe('1.2.0');
    expect(versions[1]!.version).toBe('1.1.0');
    expect(versions[2]!.version).toBe('1.0.0');
  });

  it('formats the date into human-readable form', () => {
    setChangelog(`# Changelog

## [0.5.0] - 2026-03-08

### Added

- **Something** — a thing.
`);
    const versions = parseChangelog();
    expect(versions[0]!.dateFormatted).toContain('March');
    expect(versions[0]!.dateFormatted).toContain('2026');
    expect(versions[0]!.dateFormatted).toContain('8');
  });

  it('handles semver with patch version', () => {
    setChangelog(`# Changelog

## [2.10.3] - 2025-12-01

### Fixed

- **Bug fix** — something was broken.
`);
    const versions = parseChangelog();
    expect(versions[0]!.version).toBe('2.10.3');
  });
});

// ── parseChangelog: section categorization ───────────────────

describe('parseChangelog — section categorization', () => {
  afterEach(() => vi.restoreAllMocks());

  it('maps "Added" to "New"', () => {
    setChangelog(`# Changelog

## [1.0.0] - 2026-03-12

### Added

- **Feature** — new thing.
`);
    const versions = parseChangelog();
    const labels = versions[0]!.categories.map((c) => c.label);
    expect(labels).toContain('New');
    expect(labels).not.toContain('Added');
  });

  it('maps "Fixed" to "Bug Fixes"', () => {
    setChangelog(`# Changelog

## [1.0.0] - 2026-03-12

### Fixed

- **Bug** — it was broken.
`);
    const versions = parseChangelog();
    expect(versions[0]!.categories[0]!.label).toBe('Bug Fixes');
  });

  it('maps "Changed" to "Improved"', () => {
    setChangelog(`# Changelog

## [1.0.0] - 2026-03-12

### Changed

- **Refactor** — made it better.
`);
    const versions = parseChangelog();
    expect(versions[0]!.categories[0]!.label).toBe('Improved');
  });

  it('maps "Security" to "Security" (unchanged)', () => {
    setChangelog(`# Changelog

## [1.0.0] - 2026-03-12

### Security

- **Auth fix** — patched vulnerability.
`);
    const versions = parseChangelog();
    expect(versions[0]!.categories[0]!.label).toBe('Security');
  });

  it('passes through unknown categories as-is', () => {
    setChangelog(`# Changelog

## [1.0.0] - 2026-03-12

### Performance

- **Optimization** — made it faster.
`);
    const versions = parseChangelog();
    expect(versions[0]!.categories[0]!.label).toBe('Performance');
  });

  it('handles multiple categories in a single version', () => {
    setChangelog(`# Changelog

## [1.0.0] - 2026-03-12

### Added

- **Feature A** — new thing A.

### Fixed

- **Bug B** — fixed thing B.

### Changed

- **Improvement C** — improved thing C.
`);
    const versions = parseChangelog();
    expect(versions[0]!.categories).toHaveLength(3);
    const labels = versions[0]!.categories.map((c) => c.label);
    expect(labels).toContain('New');
    expect(labels).toContain('Bug Fixes');
    expect(labels).toContain('Improved');
  });
});

// ── parseChangelog: entry parsing ───────────────────────────

describe('parseChangelog — entry parsing', () => {
  afterEach(() => vi.restoreAllMocks());

  it('extracts bold title from entry', () => {
    setChangelog(`# Changelog

## [1.0.0] - 2026-03-12

### Added

- **IFL Symptom Risk composite metric** — new 0-100% composite.
`);
    const versions = parseChangelog();
    const entry = versions[0]!.categories[0]!.entries[0]!;
    expect(entry.title).toBe('IFL Symptom Risk composite metric');
  });

  it('extracts description from text after bold', () => {
    setChangelog(`# Changelog

## [1.0.0] - 2026-03-12

### Added

- **New feature** — does something genuinely useful for users.
`);
    const versions = parseChangelog();
    const entry = versions[0]!.categories[0]!.entries[0]!;
    expect(entry.description).toContain('does something genuinely useful');
  });

  it('strips inline code from descriptions', () => {
    setChangelog(`# Changelog

## [1.0.0] - 2026-03-12

### Added

- **Settings page** — now uses \`localStorage\` for persistence of data.
`);
    const versions = parseChangelog();
    const entry = versions[0]!.categories[0]!.entries[0]!;
    expect(entry.description).not.toContain('`');
    expect(entry.description).not.toContain('localStorage');
  });

  it('strips parenthetical technical references', () => {
    setChangelog(`# Changelog

## [1.0.0] - 2026-03-12

### Fixed

- **Tooltip overflow** — tooltip now flips above the trigger (info-tooltip-viewport-overflow) when needed.
`);
    const versions = parseChangelog();
    const entry = versions[0]!.categories[0]!.entries[0]!;
    expect(entry.description).not.toContain('info-tooltip-viewport-overflow');
    expect(entry.description).not.toContain('(');
  });

  it('sets description to null for short or technical-only descriptions', () => {
    setChangelog(`# Changelog

## [1.0.0] - 2026-03-12

### Added

- **Feature** — via hook.
`);
    const versions = parseChangelog();
    const entry = versions[0]!.categories[0]!.entries[0]!;
    // "via hook" starts with "via" so is filtered out
    expect(entry.description).toBeNull();
  });

  it('sets description to null for descriptions under 10 chars', () => {
    setChangelog(`# Changelog

## [1.0.0] - 2026-03-12

### Added

- **Feature** — a thing.
`);
    const versions = parseChangelog();
    const entry = versions[0]!.categories[0]!.entries[0]!;
    expect(entry.description).toBeNull();
  });

  it('ensures description ends with a period', () => {
    setChangelog(`# Changelog

## [1.0.0] - 2026-03-12

### Added

- **Dashboard loading skeleton** — shows a placeholder while the dashboard loads data.
`);
    const versions = parseChangelog();
    const entry = versions[0]!.categories[0]!.entries[0]!;
    expect(entry.description).not.toBeNull();
    expect(entry.description!.endsWith('.')).toBe(true);
  });

  it('handles entries without bold formatting', () => {
    setChangelog(`# Changelog

## [1.0.0] - 2026-03-12

### Added

- Plain text entry without bold formatting.
`);
    const versions = parseChangelog();
    const entry = versions[0]!.categories[0]!.entries[0]!;
    expect(entry.title).toBe('Plain text entry without bold formatting.');
    expect(entry.description).toBeNull();
  });

  it('handles multiple entries in a category', () => {
    setChangelog(`# Changelog

## [1.0.0] - 2026-03-12

### Added

- **Feature A** — first feature description here.
- **Feature B** — second feature description here.
- **Feature C** — third feature description here.
`);
    const versions = parseChangelog();
    expect(versions[0]!.categories[0]!.entries).toHaveLength(3);
    expect(versions[0]!.categories[0]!.entries[0]!.title).toBe('Feature A');
    expect(versions[0]!.categories[0]!.entries[2]!.title).toBe('Feature C');
  });

  it('skips sub-bullets (implementation details)', () => {
    setChangelog(`# Changelog

## [1.0.0] - 2026-03-12

### Added

- **Feature A** — does something really useful for end users.
  - Implementation detail one
  - Implementation detail two
- **Feature B** — another useful feature for the people.
`);
    const versions = parseChangelog();
    expect(versions[0]!.categories[0]!.entries).toHaveLength(2);
    expect(versions[0]!.categories[0]!.entries[0]!.title).toBe('Feature A');
    expect(versions[0]!.categories[0]!.entries[1]!.title).toBe('Feature B');
  });

  it('takes only first sentence of multi-sentence descriptions', () => {
    setChangelog(`# Changelog

## [1.0.0] - 2026-03-12

### Added

- **Feature** — This is the first sentence describing the feature. This is the second sentence with more details.
`);
    const versions = parseChangelog();
    const entry = versions[0]!.categories[0]!.entries[0]!;
    expect(entry.description).not.toContain('second sentence');
    expect(entry.description).toContain('first sentence');
  });
});

// ── parseChangelog: edge cases ──────────────────────────────

describe('parseChangelog — edge cases', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns empty array for changelog with only header', () => {
    setChangelog(`# Changelog

All notable changes to AirwayLab will be documented in this file.
`);
    const versions = parseChangelog();
    expect(versions).toHaveLength(0);
  });

  it('ignores [Unreleased] section (no version match)', () => {
    setChangelog(`# Changelog

## [Unreleased]

### Added

- **WIP feature** — not shipped yet.

## [1.0.0] - 2026-03-12

### Added

- **Shipped feature** — actually released this.
`);
    const versions = parseChangelog();
    // [Unreleased] does not match the version regex (no date)
    expect(versions).toHaveLength(1);
    expect(versions[0]!.version).toBe('1.0.0');
  });

  it('handles version with no categories', () => {
    setChangelog(`# Changelog

## [1.0.0] - 2026-03-12
`);
    const versions = parseChangelog();
    expect(versions).toHaveLength(1);
    expect(versions[0]!.categories).toHaveLength(0);
  });

  it('handles category with no entries', () => {
    setChangelog(`# Changelog

## [1.0.0] - 2026-03-12

### Added
`);
    const versions = parseChangelog();
    expect(versions).toHaveLength(1);
    expect(versions[0]!.categories).toHaveLength(1);
    expect(versions[0]!.categories[0]!.entries).toHaveLength(0);
  });

  it('handles continuation lines (multi-line entries)', () => {
    setChangelog(`# Changelog

## [1.0.0] - 2026-03-12

### Added

- **Long feature** — this description spans
multiple lines and should be joined together properly.
`);
    const versions = parseChangelog();
    const entry = versions[0]!.categories[0]!.entries[0]!;
    expect(entry.title).toBe('Long feature');
    // Continuation lines are joined with space
    expect(entry.description).toContain('spans');
  });

  it('handles the Improved (Accessibility) category mapping', () => {
    setChangelog(`# Changelog

## [1.0.0] - 2026-03-12

### Improved (Accessibility)

- **Screen reader support** — added aria labels throughout the application.
`);
    const versions = parseChangelog();
    expect(versions[0]!.categories[0]!.label).toBe('Accessibility');
  });

  it('handles "Deprecated" and "Removed" categories', () => {
    setChangelog(`# Changelog

## [1.0.0] - 2026-03-12

### Deprecated

- **Old API** — will be removed in the next major version release.

### Removed

- **Legacy feature** — no longer supported by the new architecture.
`);
    const versions = parseChangelog();
    const labels = versions[0]!.categories.map((c) => c.label);
    expect(labels).toContain('Deprecated');
    expect(labels).toContain('Removed');
  });

  it('flushes the last entry at end of file', () => {
    // Entry at the very end with no trailing newline
    setChangelog(`# Changelog

## [1.0.0] - 2026-03-12

### Added

- **Final entry** — this is the last entry in the file`);
    const versions = parseChangelog();
    expect(versions[0]!.categories[0]!.entries).toHaveLength(1);
    expect(versions[0]!.categories[0]!.entries[0]!.title).toBe('Final entry');
  });
});
