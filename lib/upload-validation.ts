// ============================================================
// AirwayLab — Pre-upload File Validation
// Quick checks before sending files to the analysis worker.
// ============================================================

import { getFilePath } from './file-path-utils';

export interface ValidationResult {
  valid: boolean;
  edfCount: number;
  warnings: string[];
  errors: string[];
}

/**
 * Validate selected SD card files before analysis.
 * Checks for presence of EDF files, expected folder structure,
 * and common mistakes (wrong folder, unsupported data).
 */
export function validateSDFiles(files: File[]): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (files.length === 0) {
    return { valid: false, edfCount: 0, warnings, errors: ['No files selected.'] };
  }

  // Count EDF files
  const edfFiles = files.filter(
    (f) => f.name.toLowerCase().endsWith('.edf')
  );

  // Check for DATALOG folder structure
  const paths = files.map((f) => getFilePath(f));

  const hasDatalog = paths.some((p) =>
    p.toUpperCase().includes('DATALOG')
  );

  const hasSTR = edfFiles.some(
    (f) => f.name.toUpperCase().startsWith('STR')
  );

  // Look for flow data files (BRP, FLW patterns)
  const hasFlowData = edfFiles.some(
    (f) => /^(BRP|FLW)/i.test(f.name)
  );

  // Check for common mistakes
  if (edfFiles.length === 0) {
    errors.push(
      'No EDF files found. Make sure you selected the root folder or DATALOG folder from your PAP machine\'s SD card.'
    );
    return { valid: false, edfCount: 0, warnings, errors };
  }

  if (!hasDatalog && edfFiles.length < 5) {
    warnings.push(
      'Folder structure doesn\'t match a recognised PAP SD card layout. Expected a DATALOG folder with dated subfolders.'
    );
  }

  if (!hasSTR) {
    warnings.push(
      'No STR.edf settings file found. Machine settings won\'t be available.'
    );
  }

  if (!hasFlowData) {
    warnings.push(
      'No flow data files (BRP/FLW) found. Breath-by-breath analysis requires flow signal data.'
    );
  }

  // Check for SA2 oximetry data (integrated/paired pulse oximeter)
  const hasSA2 = edfFiles.some((f) => /sa2\.edf$/i.test(f.name));
  if (hasSA2) {
    warnings.push(
      'Pulse oximetry data detected on your SD card (SpO2 + heart rate will be included in your analysis).'
    );
  }

  // Check for Identification file (device info — lives in parent folder)
  const hasIdentification = files.some(
    (f) => f.name.toUpperCase().startsWith('IDENTIFICATION')
  );
  if (!hasIdentification) {
    warnings.push(
      'No Identification file found. Select the SD card root folder (one level above DATALOG) so we can identify your device model.'
    );
  }

  return {
    valid: errors.length === 0,
    edfCount: edfFiles.length,
    warnings,
    errors,
  };
}

/**
 * Detect whether a CSV header line matches a supported oximetry format.
 * Returns the format name or 'unknown'.
 */
export type OximetryFormat = 'viatom' | 'unknown';

export function detectOximetryFormat(headerLine: string): OximetryFormat {
  const lower = headerLine.toLowerCase();
  // Viatom / Checkme O2 Max: "Time, Oxygen Level, Pulse Rate, Motion, ..."
  if (lower.includes('oxygen level') && lower.includes('pulse rate')) {
    return 'viatom';
  }
  return 'unknown';
}

/**
 * Read the first 5 lines of each CSV file and check format support.
 * Returns a list of unsupported files with their header samples.
 */
export async function checkOximetryFormats(
  files: File[]
): Promise<{ fileName: string; headerSample: string }[]> {
  const unsupported: { fileName: string; headerSample: string }[] = [];
  for (const file of files) {
    if (!file.name.toLowerCase().endsWith('.csv')) continue;
    try {
      const slice = file.slice(0, 2048); // first ~2KB is enough for headers
      const text = await slice.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      const header = lines[0] || '';
      if (detectOximetryFormat(header) === 'unknown') {
        unsupported.push({
          fileName: file.name,
          headerSample: lines.slice(0, 5).join('\n'),
        });
      }
    } catch {
      // If we can't read the file, skip format check
    }
  }
  return unsupported;
}

/**
 * Validate oximetry CSV files.
 */
export function validateOximetryFiles(files: File[]): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const csvFiles = files.filter(
    (f) => f.name.toLowerCase().endsWith('.csv')
  );

  if (csvFiles.length === 0) {
    errors.push('No CSV files found. Oximetry data should be in .csv format.');
    return { valid: false, edfCount: 0, warnings, errors };
  }

  // Check for extremely large files (>50MB probably not oximetry)
  const largFiles = csvFiles.filter((f) => f.size > 50 * 1024 * 1024);
  if (largFiles.length > 0) {
    warnings.push(
      `${largFiles.length} file${largFiles.length !== 1 ? 's' : ''} over 50MB — these may not be oximetry exports.`
    );
  }

  return {
    valid: errors.length === 0,
    edfCount: csvFiles.length,
    warnings,
    errors,
  };
}
