// ============================================================
// AirwayLab — Night Grouper
// Groups EDF sessions by sleep night using DATALOG folder dates
// Ported from VibeCoder75321/Multi-Night-Glasgow-Index-Analyzer
// ============================================================

import type { EDFFile } from '../types';

interface FileGroup {
  nightDate: string; // YYYY-MM-DD
  sessions: EDFFile[];
}

/**
 * Extract folder date from webkitRelativePath.
 * Looks for DATALOG/YYYYMMDD/ pattern.
 */
function extractFolderDate(filePath: string): string | null {
  const match = filePath.match(/DATALOG\/(\d{8})\//);
  if (match) {
    const d = match[1];
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  }
  return null;
}

/**
 * Extract date from BRP filename (YYYYMMDD_HHMMSS_BRP.edf).
 */
function extractFilenameDate(filePath: string): string | null {
  const match = filePath.match(/(\d{8})_(\d{6})_BRP/i);
  if (match) {
    const d = match[1];
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  }
  return null;
}

/**
 * Determine the sleep night date for a session.
 *
 * Priority:
 * 1. DATALOG folder date (most reliable — ResMed groups by night)
 * 2. Heuristic from recording start time:
 *    - 6 PM to midnight → current date
 *    - Midnight to noon → previous date
 *    - Noon to 6 PM → current date
 */
function determineSleepNight(edf: EDFFile): string {
  // Try folder date first
  const folderDate = extractFolderDate(edf.filePath);
  if (folderDate) return folderDate;

  // Fallback: filename date + time heuristic
  const filenameDate = extractFilenameDate(edf.filePath);
  const hour = edf.recordingDate.getHours();

  if (filenameDate) {
    if (hour < 12) {
      // Before noon → belongs to previous night
      const prev = new Date(edf.recordingDate);
      prev.setDate(prev.getDate() - 1);
      return localDateStr(prev);
    }
    return filenameDate;
  }

  // Final fallback: use recording date with time heuristic
  if (hour >= 18) {
    return localDateStr(edf.recordingDate);
  } else if (hour < 12) {
    const prev = new Date(edf.recordingDate);
    prev.setDate(prev.getDate() - 1);
    return localDateStr(prev);
  }
  return localDateStr(edf.recordingDate);
}

/** Format a Date as YYYY-MM-DD in local time (not UTC) */
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Group parsed EDF files into nights.
 * Each night may contain multiple sessions (e.g., mask removal mid-night).
 * Sessions within a night are sorted by recording start time.
 */
export function groupByNight(edfs: EDFFile[]): FileGroup[] {
  const groups: Map<string, EDFFile[]> = new Map();

  for (const edf of edfs) {
    const night = determineSleepNight(edf);
    if (!groups.has(night)) groups.set(night, []);
    groups.get(night)!.push(edf);
  }

  // Sort sessions within each night by recording time
  const result: FileGroup[] = [];
  groups.forEach((sessions, nightDate) => {
    sessions.sort((a, b) => a.recordingDate.getTime() - b.recordingDate.getTime());
    result.push({ nightDate, sessions });
  });

  // Sort nights by date (most recent first)
  result.sort((a, b) => b.nightDate.localeCompare(a.nightDate));

  return result;
}

/**
 * Filter uploaded files to only valid BRP.edf files (> 50KB).
 * Previous 2MB threshold was too aggressive — short sessions (common with
 * UARS patients who wake frequently) can produce legitimately small BRP files.
 */
export function filterBRPFiles(
  files: { name: string; path: string; size: number }[]
): { name: string; path: string; size: number }[] {
  return files.filter(
    (f) => {
      const name = f.name.toLowerCase();
      return (name.endsWith('brp.edf') || name.endsWith('_brp.edf')) &&
        f.size > 50 * 1024;
    }
  );
}

/**
 * Find STR.edf file from file list (case-insensitive).
 */
export function findSTRFile(
  files: { name: string; path: string }[]
): { name: string; path: string } | null {
  return files.find((f) => f.name.toLowerCase() === 'str.edf') ?? null;
}

/**
 * Find Identification file from file list (case-insensitive).
 */
export function findIdentificationFile(
  files: { name: string; path: string }[]
): { name: string; path: string } | null {
  return (
    files.find((f) => {
      const name = f.name.toLowerCase();
      return name === 'identification.tgt' || name === 'identification.json';
    }) ?? null
  );
}
