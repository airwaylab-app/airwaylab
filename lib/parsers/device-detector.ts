// ============================================================
// AirwayLab — Device Type Detection
// Identifies PAP device from SD card file structure
// ============================================================

import type { DeviceType } from '../types';

interface FileInfo {
  name: string;
  path: string;
  size: number;
}

export interface DeviceDetectionResult {
  deviceType: DeviceType;
  /** Human-readable label shown in UI */
  deviceLabel: string;
  /** For BMC: the serial-number prefix shared by data files */
  bmcSerial?: string;
}

/**
 * Detect which PAP device produced the uploaded files.
 * Uses file naming patterns and folder structure — no binary parsing needed.
 */
export function detectDeviceType(files: FileInfo[]): DeviceDetectionResult {
  const names = files.map((f) => f.name.toLowerCase());
  const paths = files.map((f) => {
    const rel = (f as unknown as { webkitRelativePath?: string }).webkitRelativePath;
    return (rel || f.path || f.name).toUpperCase();
  });

  // ResMed: DATALOG/ folder + BRP.edf files
  const hasDatalog = paths.some((p) => p.includes('DATALOG'));
  const hasBRP = names.some(
    (n) => n.endsWith('brp.edf') || n.endsWith('_brp.edf')
  );
  if (hasDatalog || hasBRP) {
    return { deviceType: 'resmed', deviceLabel: 'ResMed' };
  }

  // BMC (Luna / RESmart): SERIAL.000 + SERIAL.idx + SERIAL.USR pattern
  const bmcSerial = detectBMCSerial(files);
  if (bmcSerial) {
    return { deviceType: 'bmc', deviceLabel: 'BMC / Luna', bmcSerial };
  }

  return { deviceType: 'unknown', deviceLabel: 'Unknown device' };
}

/**
 * Detect BMC serial prefix from files.
 * BMC SD cards have files named SERIALNUM.000, SERIALNUM.idx, SERIALNUM.USR etc.
 * where SERIALNUM is the last 8 chars of the device serial.
 */
function detectBMCSerial(files: FileInfo[]): string | null {
  // Find .idx files (most reliable BMC marker)
  const idxFiles = files.filter((f) => f.name.toLowerCase().endsWith('.idx'));
  for (const idx of idxFiles) {
    const base = idx.name.slice(0, -4); // strip .idx
    if (!/^\d+$/.test(base)) continue; // BMC serials are numeric

    // Verify companion files exist
    const hasDataFile = files.some(
      (f) => f.name.toLowerCase() === `${base}.000`
    );
    const hasUsrFile = files.some(
      (f) => f.name.toLowerCase() === `${base}.usr`
    );
    if (hasDataFile || hasUsrFile) {
      return base;
    }
  }

  // Fallback: look for .USR files with numeric prefix
  const usrFiles = files.filter((f) => f.name.toLowerCase().endsWith('.usr'));
  for (const usr of usrFiles) {
    const base = usr.name.slice(0, -4);
    if (!/^\d+$/.test(base)) continue;
    const hasDataFile = files.some(
      (f) => f.name.toLowerCase() === `${base}.000`
    );
    if (hasDataFile) {
      return base;
    }
  }

  return null;
}

/**
 * Get file structure metadata for unknown devices (used by unsupported device dialog).
 */
export function getFileStructureMetadata(files: FileInfo[]): {
  totalFiles: number;
  extensions: Record<string, number>;
  folderStructure: string[];
  totalSizeBytes: number;
} {
  const extensions: Record<string, number> = {};
  const folders = new Set<string>();
  let totalSize = 0;

  for (const f of files) {
    const ext = f.name.includes('.') ? f.name.split('.').pop()!.toLowerCase() : '(none)';
    extensions[ext] = (extensions[ext] ?? 0) + 1;
    totalSize += f.size;

    const rel = (f as unknown as { webkitRelativePath?: string }).webkitRelativePath;
    if (rel) {
      const parts = rel.split('/');
      if (parts.length > 1) {
        folders.add(parts.slice(0, -1).join('/'));
      }
    }
  }

  return {
    totalFiles: files.length,
    extensions,
    folderStructure: Array.from(folders).sort().slice(0, 50),
    totalSizeBytes: totalSize,
  };
}
