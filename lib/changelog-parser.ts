import fs from 'fs';
import path from 'path';

interface ChangelogEntry {
  title: string;
  description: string | null;
}

interface ChangelogVersion {
  version: string;
  date: string;
  dateFormatted: string;
  categories: {
    label: string;
    entries: ChangelogEntry[];
  }[];
}

/**
 * User-friendly category labels. Technical "Keep a Changelog" categories
 * are mapped to plain-language headings non-technical users can understand.
 */
const CATEGORY_MAP: Record<string, string> = {
  Added: 'New',
  Changed: 'Improved',
  Fixed: 'Bug Fixes',
  'Improved (Accessibility)': 'Accessibility',
  Security: 'Security',
  Deprecated: 'Deprecated',
  Removed: 'Removed',
};

/**
 * Strips markdown formatting and technical jargon to produce a short,
 * user-readable summary from a CHANGELOG.md bullet point.
 *
 * Strategy:
 *  - Extract the **bold title** as the entry title
 *  - Take the first clause after the em-dash (—) as a plain-English description
 *  - Drop code references, file paths, and implementation details
 */
function parseEntry(raw: string): ChangelogEntry {
  // Remove leading "- " and trim
  const line = raw.replace(/^-\s*/, '').trim();

  // Extract bold title: **Some Title**
  const boldMatch = line.match(/\*\*(.+?)\*\*/);
  const title = boldMatch ? boldMatch[1]! : line;

  // Get description: text after the bold part, cleaned up
  let description: string | null = null;
  if (boldMatch) {
    const afterBold = line.slice(line.indexOf('**', 2) + 2).trim();
    // Remove leading em-dash or colon
    const cleaned = afterBold.replace(/^[—–:\s]+/, '').trim();
    if (cleaned) {
      // Take only the first sentence and strip code/technical markers
      const firstSentence = cleaned
        .split(/\.\s/)[0]!
        .replace(/`[^`]+`/g, '') // Remove inline code
        .replace(/\([^)]*\)/g, '') // Remove parenthetical technical refs
        .replace(/\s{2,}/g, ' ') // Collapse whitespace
        .trim();

      // Only keep the description if it's genuinely informative (not just technical)
      if (firstSentence.length > 10 && !/^(via|in|from|using)\s/i.test(firstSentence)) {
        description = firstSentence.endsWith('.') ? firstSentence : `${firstSentence}.`;
      }
    }
  }

  return { title, description };
}

/**
 * Reads and parses CHANGELOG.md into structured, user-friendly data.
 * Called at build time by the server component — the result is baked into
 * the static page, so the changelog updates automatically on every deployment.
 */
export function parseChangelog(): ChangelogVersion[] {
  const filePath = path.join(process.cwd(), 'CHANGELOG.md');
  const raw = fs.readFileSync(filePath, 'utf-8');

  const versions: ChangelogVersion[] = [];
  let currentVersion: ChangelogVersion | null = null;
  let currentCategory: string | null = null;
  let currentEntryLines: string[] = [];

  const flushEntry = () => {
    if (currentEntryLines.length > 0 && currentVersion && currentCategory) {
      const fullLine = currentEntryLines.join(' ');
      const entry = parseEntry(fullLine);
      const cat = currentVersion.categories.find((c) => c.label === currentCategory);
      if (cat) {
        cat.entries.push(entry);
      }
      currentEntryLines = [];
    }
  };

  for (const line of raw.split('\n')) {
    // Version header: ## [0.5.0] - 2026-03-08
    const versionMatch = line.match(/^## \[(\d+\.\d+\.\d+)\]\s*-\s*(\d{4}-\d{2}-\d{2})/);
    if (versionMatch) {
      flushEntry();
      const [, version, date] = versionMatch as RegExpMatchArray;
      const dateFormatted = new Date(`${date!}T00:00:00`).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      currentVersion = { version: version!, date: date!, dateFormatted, categories: [] };
      currentCategory = null;
      versions.push(currentVersion);
      continue;
    }

    // Category header: ### Added, ### Changed, ### Fixed, etc.
    const categoryMatch = line.match(/^### (.+)/);
    if (categoryMatch && currentVersion) {
      flushEntry();
      const rawCategory = categoryMatch[1]!.trim();
      const label = CATEGORY_MAP[rawCategory] ?? rawCategory;
      currentCategory = label;
      currentVersion.categories.push({ label, entries: [] });
      continue;
    }

    // Entry line: starts with "- "
    if (line.match(/^- /) && currentVersion && currentCategory) {
      flushEntry();
      currentEntryLines = [line];
      continue;
    }

    // Continuation line (indented, part of a multi-line entry) — skip sub-bullets
    if (line.match(/^\s{2,}-\s/)) {
      // Sub-bullets are implementation details — skip them
      continue;
    }

    // Other continuation text
    if (line.trim() && currentEntryLines.length > 0) {
      currentEntryLines.push(line.trim());
    }
  }

  flushEntry();

  return versions;
}
