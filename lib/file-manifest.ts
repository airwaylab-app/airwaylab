// ============================================================
// AirwayLab — File Manifest
// Fingerprints uploaded files so re-uploads can skip unchanged
// nights and only analyze new/modified data.
// ============================================================

import { getFilePath } from './file-path-utils';

const MANIFEST_KEY = 'airwaylab_file_manifest';

export interface FileFingerprint {
  path: string;
  size: number;
  lastModified: number;
}

export interface NightManifest {
  nightDate: string; // YYYY-MM-DD
  files: FileFingerprint[];
}

interface StoredManifest {
  manifests: NightManifest[];
  savedAt: number;
}

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (matches persistence TTL)

// Date folder regex — same pattern used by night-grouper.ts
const DATE_FOLDER_RE = /(\d{8})\//;

/**
 * Create a fingerprint from a File object.
 */
export function fingerprintFile(file: File): FileFingerprint {
  const path = getFilePath(file);
  return { path, size: file.size, lastModified: file.lastModified };
}

/**
 * Extract YYYY-MM-DD night date from a file path.
 * Looks for DATALOG/YYYYMMDD/ folder structure.
 * Returns null if no date folder found.
 */
export function extractNightDate(path: string): string | null {
  const m = DATE_FOLDER_RE.exec(path);
  if (!m) return null;
  const raw = m[1]; // YYYYMMDD
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

/**
 * Group File[] by night date extracted from their paths.
 * Files without a recognisable date are grouped under '__unknown__'.
 */
export function groupFilesByNight(files: File[]): Map<string, File[]> {
  const groups = new Map<string, File[]>();
  for (const file of files) {
    const path = getFilePath(file);
    const date = extractNightDate(path) ?? '__unknown__';
    const arr = groups.get(date) ?? [];
    arr.push(file);
    groups.set(date, arr);
  }
  return groups;
}

/**
 * Compare incoming files against a stored manifest.
 * Returns which nights are unchanged (can be skipped) and which files
 * need processing.
 *
 * Also includes non-date files (STR.edf, Identification, etc.) in changedFiles
 * whenever any night has changed, since the worker needs them for settings.
 */
export function diffAgainstManifest(
  files: File[],
  manifest: NightManifest[]
): {
  unchanged: string[];
  changedFiles: File[];
  changedNights: Set<string>;
} {
  const manifestMap = new Map<string, FileFingerprint[]>();
  for (const nm of manifest) {
    manifestMap.set(nm.nightDate, nm.files);
  }

  const grouped = groupFilesByNight(files);
  const unchanged: string[] = [];
  const changedNights = new Set<string>();
  const changedFiles: File[] = [];

  for (const [nightDate, nightFiles] of Array.from(grouped)) {
    if (nightDate === '__unknown__') {
      // Non-date files (STR.edf etc.) — always include, but don't trigger change
      continue;
    }

    const stored = manifestMap.get(nightDate);
    if (stored && nightMatchesManifest(nightFiles, stored)) {
      unchanged.push(nightDate);
    } else {
      changedNights.add(nightDate);
      changedFiles.push(...nightFiles);
    }
  }

  // If any night changed, include the non-date files too (worker needs them)
  if (changedNights.size > 0) {
    const unknownFiles = grouped.get('__unknown__');
    if (unknownFiles) changedFiles.push(...unknownFiles);
  }

  return { unchanged, changedFiles, changedNights };
}

/**
 * Check if a night's files match the stored fingerprints exactly.
 */
function nightMatchesManifest(
  files: File[],
  stored: FileFingerprint[]
): boolean {
  if (files.length !== stored.length) return false;

  // Build a set of stored fingerprint keys for fast lookup
  const storedKeys = new Set(
    stored.map((f) => `${f.path}|${f.size}|${f.lastModified}`)
  );

  return files.every((file) => {
    const fp = fingerprintFile(file);
    return storedKeys.has(`${fp.path}|${fp.size}|${fp.lastModified}`);
  });
}

/**
 * Build a manifest from all uploaded files.
 */
export function buildManifest(files: File[]): NightManifest[] {
  const grouped = groupFilesByNight(files);
  const manifests: NightManifest[] = [];

  for (const [nightDate, nightFiles] of Array.from(grouped)) {
    if (nightDate === '__unknown__') continue;
    manifests.push({
      nightDate,
      files: nightFiles.map(fingerprintFile),
    });
  }

  return manifests;
}

/**
 * Save manifest to localStorage.
 */
export function saveManifest(manifests: NightManifest[]): void {
  try {
    const data: StoredManifest = { manifests, savedAt: Date.now() };
    localStorage.setItem(MANIFEST_KEY, JSON.stringify(data));
  } catch {
    // Quota or security error — non-critical
  }
}

/**
 * Load manifest from localStorage. Returns null if missing or expired.
 */
export function loadManifest(): NightManifest[] | null {
  try {
    const raw = localStorage.getItem(MANIFEST_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || typeof data.savedAt !== 'number' || !Array.isArray(data.manifests)) {
      localStorage.removeItem(MANIFEST_KEY);
      return null;
    }
    if (Date.now() - data.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(MANIFEST_KEY);
      return null;
    }
    return data.manifests;
  } catch {
    return null;
  }
}

/**
 * Clear stored manifest.
 */
export function clearManifest(): void {
  try {
    localStorage.removeItem(MANIFEST_KEY);
  } catch {
    // Silently ignore
  }
}
