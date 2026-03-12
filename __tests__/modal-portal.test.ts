/**
 * Static analysis test: ensures all modal/dialog overlays use createPortal.
 *
 * Fixed-positioned overlays rendered inside a parent with `overflow-x-hidden`
 * (our root <main> element) break viewport positioning on mobile browsers.
 * The fix is to render them via createPortal(…, document.body).
 *
 * This test scans all component source files for the pattern:
 *   - Contains `fixed inset-0` (a fullscreen overlay)
 *   - Must also contain `createPortal`
 *
 * Exceptions:
 *   - header.tsx: The mobile menu backdrop uses `fixed inset-0` for click-outside
 *     detection, but it renders outside <main> (in Header, which is a sibling)
 *     and is not a modal overlay.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/** Recursively find all .tsx files in a directory */
function findTsxFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTsxFiles(fullPath));
    } else if (entry.name.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

// Files that are explicitly exempt from this rule (with reason)
const EXEMPT_FILES = new Set([
  // Header mobile menu backdrop is outside <main> and not a modal overlay
  'components/layout/header.tsx',
]);

describe('Modal portal enforcement', () => {
  const root = path.resolve(__dirname, '..');
  const componentDirs = ['components', 'app'].map((d) => path.join(root, d));
  const allTsxFiles = componentDirs.flatMap((dir) =>
    fs.existsSync(dir) ? findTsxFiles(dir) : []
  );

  // Find files that have fixed inset-0 (fullscreen overlay pattern)
  const filesWithFixedOverlay = allTsxFiles.filter((filePath) => {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.includes('fixed inset-0');
  });

  it('should find at least one file with fixed overlays (sanity check)', () => {
    expect(filesWithFixedOverlay.length).toBeGreaterThan(0);
  });

  for (const filePath of filesWithFixedOverlay) {
    const relative = path.relative(root, filePath);

    if (EXEMPT_FILES.has(relative)) continue;

    it(`${relative} — must use createPortal for fixed overlay`, () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(
        content.includes('createPortal'),
        `${relative} has a "fixed inset-0" overlay but does not use createPortal.\n` +
          'Fixed-position modals must render via createPortal(…, document.body) ' +
          'to escape the overflow-x-hidden container on <main>.\n' +
          'If this file is a valid exception, add it to EXEMPT_FILES in this test.'
      ).toBe(true);
    });
  }
});
