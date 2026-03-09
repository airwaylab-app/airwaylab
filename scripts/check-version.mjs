/**
 * Build-time check: package.json version must have a matching CHANGELOG.md entry.
 * Prevents deploying a version bump without documenting what changed.
 *
 * Usage: node scripts/check-version.mjs
 * Exits 1 on mismatch, 0 on match.
 */
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const changelog = readFileSync('CHANGELOG.md', 'utf8');

const match = changelog.match(/^## \[(\d+\.\d+\.\d+)\]/m);
const changelogVersion = match?.[1];

if (!changelogVersion) {
  console.error('❌ Could not find any version entry in CHANGELOG.md');
  process.exit(1);
}

if (pkg.version !== changelogVersion) {
  console.error(
    `❌ Version mismatch: package.json is ${pkg.version} but CHANGELOG.md latest is ${changelogVersion}\n` +
    `   → Update CHANGELOG.md with a ## [${pkg.version}] entry before deploying.`
  );
  process.exit(1);
}

console.log(`✓ Version ${pkg.version} matches CHANGELOG.md`);
